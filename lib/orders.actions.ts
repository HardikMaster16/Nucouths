'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Order Creation & Payment (Prisma + Razorpay, server-only)
//
// The real, server-side "Place Order" backend behind checkout
// (components/checkout/CheckoutClient.tsx), plus the Razorpay payment layer
// on top of it (initializeRazorpayOrderAction / verifyRazorpayPaymentAction,
// near the bottom of this file). placeOrderAction only ever creates the
// Order/OrderItem rows, reserves stock, and consumes the coupon; payment is
// always left Pending (see Order.paymentStatus's schema docstring) — no
// code path in placeOrderAction itself ever touches payment state. Every
// export in the "Order Creation" section below:
//
//   1. Calls requireCustomerSession() first, unconditionally — the ONLY
//      source of customer identity. A client-supplied userId is never
//      accepted.
//   2. Re-reads EVERYTHING that determines money or stock from Prisma
//      inside the transaction below — cart contents, variant/product
//      pricing and stock, the selected address, and the coupon. The client
//      supplies only references (an addressId, a coupon code string, a
//      payment method, contact details) and an idempotency key — never a
//      price, subtotal, discount, or stock count.
//   3. Performs the stock decrement and the coupon usage increment as
//      atomic conditional updates (`UPDATE ... WHERE stock >= quantity` /
//      `WHERE usageCount < usageLimit`), never a read-check-write — see
//      decrementStockOrThrow / consumeCouponOrThrow below. Under Postgres's
//      default READ COMMITTED isolation, two concurrent UPDATEs against the
//      same row serialize on the row lock, so the second one's WHERE clause
//      is re-evaluated against the first one's already-applied result —
//      this is safe without needing SERIALIZABLE isolation.
//   4. Runs everything above inside one Prisma interactive transaction, so
//      a failure at any step (bad address, unavailable item, insufficient
//      stock, invalid/exhausted coupon, an orderNumber collision) rolls
//      back the whole thing — no partial OrderItems, no partial stock
//      deduction, no partial cart clearing, no partial coupon usage.
//
// Idempotency: `idempotencyKey` is a random token the client generates once
// per checkout attempt (CheckoutClient's own state, held for the page's
// lifetime — not regenerated on every click) and unconditionally attaches
// to Order.idempotencyKey (a unique column, prisma/migrations/
// 20260922112604_add_order_payment_status_coupon_discount_idempotency). A
// double-click or a retried request carries the same key: the cheap
// findUnique below short-circuits the common case, and the unique
// constraint itself (caught as P2002) is the authoritative guard against a
// genuine race between two concurrent submissions with the same key —
// either way, the caller gets back the one order that was actually created,
// never a second row.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireCustomerSession } from './auth/customer-auth.actions'
import { cartItemWithRelations, dbCartItemToCartItem } from './cart.db'
import { calculateCartTotals, calculateCouponDiscount } from './cart-pricing'
import { computeCouponStatus } from './admin/coupon-form'
import { dbCouponToCoupon } from './admin/coupons.db'
import { isRequired, isValidEmail, isValidIndianPhone } from './checkout-validation'
import { generateOrderNumber } from './order-storage'
import { getMyOrder, listMyOrders } from './orders.db'
import { createRazorpayOrder, getRazorpayKeyId, verifyRazorpaySignature } from './razorpay'
import { getCurrentProductsForOrderItems } from './products.db'
import { findVariant } from './product-detail-data'
import type { CustomerOrderDetail, CustomerOrderSummary } from './orders.db'
import type { CartItem, OrderStatus, PaymentMethod, ShippingAddress } from './types'
import type { CartTotals } from './cart-pricing'
import type { PaymentMethod as PrismaPaymentMethod } from '@prisma/client'
import type { AddToCartInput } from './cart-context'

type Tx = Prisma.TransactionClient

const VALID_PAYMENT_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'cod']

export interface PlaceOrderInput {
  /** A saved Address belonging to the caller — re-read by {id, userId}
   *  inside the transaction, never trusted as-is. */
  addressId: string
  contactEmail: string
  contactPhone: string
  paymentMethod: PaymentMethod
  /** null/undefined = no coupon. Revalidated from Prisma regardless of
   *  whether/what the client thinks is applied. */
  couponCode?: string | null
  /** Client-generated once per checkout attempt — see module docstring. */
  idempotencyKey: string
}

export interface PlacedOrderSummary {
  orderNumber: string
  placedAt: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  currency: string
  totals: CartTotals
  items: CartItem[]
  contactEmail: string
  contactPhone: string
  shippingAddress: ShippingAddress
}

export interface PlaceOrderResult {
  success: boolean
  error?: string
  order?: PlacedOrderSummary
}

/** A rejection with a message that's already safe to show the customer —
 *  thrown from inside the transaction to abort it, then unwrapped in the
 *  catch block below. Anything else (a genuine bug, a Prisma error we don't
 *  recognize) is logged and replaced with a generic message instead of
 *  leaking internals. */
class OrderError extends Error {}

function assertValidInput(input: PlaceOrderInput): void {
  if (!isRequired(input.addressId)) throw new OrderError('Select a delivery address.')
  if (!isRequired(input.contactEmail) || !isValidEmail(input.contactEmail)) {
    throw new OrderError('Enter a valid email address.')
  }
  if (!isRequired(input.contactPhone) || !isValidIndianPhone(input.contactPhone)) {
    throw new OrderError('Enter a valid phone number.')
  }
  if (!VALID_PAYMENT_METHODS.includes(input.paymentMethod)) throw new OrderError('Select a valid payment method.')
  if (!isRequired(input.idempotencyKey) || input.idempotencyKey.length < 10 || input.idempotencyKey.length > 200) {
    throw new OrderError('Invalid request.')
  }
}

/** Atomic conditional decrement — `UPDATE ProductVariant SET stock = stock
 *  - quantity WHERE id = ? AND stock >= quantity`. Never a separate
 *  read-then-check-then-write: the WHERE clause and the write happen in one
 *  statement, so two concurrent orders for the last unit of a variant can
 *  never both succeed (Postgres serializes on the row's lock; the loser's
 *  WHERE re-evaluates against the winner's already-decremented value and
 *  matches zero rows). */
async function decrementStockOrThrow(tx: Tx, variantId: string, quantity: number, label: string): Promise<void> {
  const result = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  })
  if (result.count === 0) {
    throw new OrderError(`${label} just went out of stock. Please update your cart and try again.`)
  }
}

/** Same atomic-conditional-update shape as decrementStockOrThrow, applied
 *  to Coupon.usageCount — `WHERE usageCount < usageLimit` (or unconditional
 *  when the coupon has no limit) so a coupon can never be consumed beyond
 *  its configured limit under concurrent orders. */
async function consumeCouponOrThrow(tx: Tx, couponId: string, usageLimit: number | undefined): Promise<void> {
  const where: Prisma.CouponWhereInput =
    usageLimit === undefined ? { id: couponId } : { id: couponId, usageCount: { lt: usageLimit } }
  const result = await tx.coupon.updateMany({ where, data: { usageCount: { increment: 1 } } })
  if (result.count === 0) {
    throw new OrderError('This coupon has just reached its usage limit. Please remove it and try again.')
  }
}

function toShippingAddress(address: { firstName: string; lastName: string; address: string; apartment: string | null; city: string; state: string; pinCode: string; country: string; phone: string }): ShippingAddress {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    address: address.address,
    apartment: address.apartment ?? undefined,
    city: address.city,
    state: address.state,
    pinCode: address.pinCode,
    country: address.country,
    phone: address.phone,
  }
}

type DbOrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>

function toPlacedOrderSummary(order: DbOrderWithItems, items: CartItem[]): PlacedOrderSummary {
  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt.toISOString(),
    status: order.status as OrderStatus,
    paymentMethod: order.paymentMethod as PaymentMethod,
    currency: order.currency,
    totals: {
      originalSubtotal: Number(order.originalSubtotal),
      discount: Number(order.discount),
      payableSubtotal: Number(order.payableSubtotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
      amountToFreeShipping: 0,
    },
    items,
    contactEmail: order.contactEmail,
    contactPhone: order.contactPhone,
    shippingAddress: toShippingAddress({
      firstName: order.shipFirstName,
      lastName: order.shipLastName,
      address: order.shipAddress,
      apartment: order.shipApartment,
      city: order.shipCity,
      state: order.shipState,
      pinCode: order.shipPinCode,
      country: order.shipCountry,
      phone: order.shipPhone,
    }),
  }
}

/** Looks up an already-created order by idempotency key, scoped to this
 *  customer — used both for the fast pre-check and to answer a retried
 *  request after a genuine create-vs-create race (P2002 below). Returns
 *  null (never another customer's order) if the key belongs to someone
 *  else, which should be structurally impossible for a random per-attempt
 *  token but is checked anyway per "never trust client data." */
async function findOwnOrderByIdempotencyKey(idempotencyKey: string, userId: string): Promise<PlacedOrderSummary | null> {
  const existing = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } })
  if (!existing || existing.userId !== userId) return null

  const items: CartItem[] = existing.items.map((item) => ({
    productId: item.productId ?? '',
    variantId: item.variantId ?? item.id,
    slug: item.productSlug,
    name: item.productName,
    category: '',
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    price: Number(item.unitPrice),
    compareAtPrice: item.compareAtPrice !== null ? Number(item.compareAtPrice) : undefined,
    currency: existing.currency,
    image: { src: item.imageSrc, alt: item.imageAlt },
  }))

  return toPlacedOrderSummary(existing, items)
}

export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const customer = await requireCustomerSession()

  try {
    assertValidInput(input)

    // Fast path: a double-click or a retried request with the same key
    // this customer already used returns the original order instead of
    // attempting to create a second one.
    const already = await findOwnOrderByIdempotencyKey(input.idempotencyKey, customer.id)
    if (already) return { success: true, order: already }

    const normalizedEmail = input.contactEmail.trim().toLowerCase()
    const normalizedPhone = input.contactPhone.trim()
    const couponCode = input.couponCode?.trim().toUpperCase() || null

    const createdOrder = await prisma.$transaction(
      async (tx) => {
        // 1. Re-read the selected address, scoped by {id, userId} — an id
        // belonging to another customer (or no id at all) behaves as not
        // found, never a different error.
        const address = await tx.address.findFirst({ where: { id: input.addressId, userId: customer.id } })
        if (!address) throw new OrderError('That delivery address could not be found.')

        // 2. Re-read the customer's current cart with live variant/product
        // pricing — never anything cached or client-supplied.
        const cartRows = await tx.cartItem.findMany({
          where: { userId: customer.id },
          orderBy: { createdAt: 'asc' },
          include: cartItemWithRelations,
        })
        if (cartRows.length === 0) throw new OrderError('Your cart is empty.')

        // 3. Re-check current availability/stock and quantity validity —
        // the same partitioning rule lib/checkout.db.ts's getCheckoutData
        // uses (a separate cheap query for Product.inStock, since
        // lib/cart.db.ts's shared cartItemWithRelations product `select`
        // deliberately doesn't carry it — see that file's own docstring),
        // so what the customer confirmed at checkout is exactly what gets
        // ordered. Requires stock >= quantity (not just stock > 0) so a
        // line that's since fallen short excludes cleanly here rather than
        // reaching decrementStockOrThrow below and aborting the ENTIRE
        // order over one short-stocked line.
        const productIds = [...new Set(cartRows.map((row) => row.variant.product.id))]
        const availabilityRows = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, inStock: true },
        })
        const inStockByProductId = new Map(availabilityRows.map((p) => [p.id, p.inStock]))

        const purchasable = cartRows.filter(
          (row) =>
            row.quantity >= 1 &&
            Number.isInteger(row.quantity) &&
            row.variant.stock >= row.quantity &&
            (inStockByProductId.get(row.variant.product.id) ?? false)
        )
        if (purchasable.length === 0) {
          throw new OrderError('None of the items in your cart are currently available.')
        }

        // 4. Recalculate subtotal/discount from live prices — the single
        // source of truth (lib/cart-pricing.ts), never a second pricing
        // implementation.
        const lineCartItems: CartItem[] = purchasable.map(dbCartItemToCartItem)
        const baseTotals = calculateCartTotals(lineCartItems)
        const currency = lineCartItems[0]?.currency ?? 'INR'

        // 5. Revalidate the coupon from the database, if supplied — the
        // same rules lib/checkout-coupon.actions.ts's applyCouponAction
        // already encodes, re-applied here against the transaction's own
        // read so a concurrent admin edit or another order's usage can't
        // slip through.
        let couponRow: Prisma.CouponGetPayload<object> | null = null
        let couponDiscount = 0
        if (couponCode) {
          couponRow = await tx.coupon.findUnique({ where: { code: couponCode } })
          if (!couponRow) throw new OrderError('This coupon code is invalid.')

          const coupon = dbCouponToCoupon(couponRow)
          const status = computeCouponStatus(coupon, Date.now())
          if (status !== 'Active') throw new OrderError('This coupon is no longer valid.')
          if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
            throw new OrderError('This coupon has reached its usage limit.')
          }
          if (coupon.minOrderAmount && baseTotals.payableSubtotal < coupon.minOrderAmount) {
            throw new OrderError('Your order no longer meets this coupon’s minimum amount.')
          }

          couponDiscount = calculateCouponDiscount(coupon, baseTotals.payableSubtotal)
          if (couponDiscount <= 0) throw new OrderError('This coupon code is invalid.')
        }

        const finalTotal = Math.max(baseTotals.total - couponDiscount, 0)

        // 6. Atomically decrement stock for every purchased variant — any
        // single failure aborts the whole transaction (see module
        // docstring), so there's no partial stock deduction across items.
        for (const row of purchasable) {
          const label = `"${row.variant.product.name}" (${row.variant.color}, ${row.variant.size})`
          await decrementStockOrThrow(tx, row.variant.id, row.quantity, label)
        }

        // 7. Consume the coupon's usage only now that the order is
        // otherwise guaranteed to be created — a race that exhausts the
        // limit between step 5's read and here aborts the transaction
        // (stock decrements above are rolled back too).
        if (couponRow) {
          await consumeCouponOrThrow(tx, couponRow.id, couponRow.usageLimit ?? undefined)
        }

        // 8. Create the Order with an immutable address snapshot, and its
        // OrderItems with immutable product/variant snapshots.
        let order: DbOrderWithItems
        try {
          order = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              userId: customer.id,
              paymentMethod: input.paymentMethod as PrismaPaymentMethod,
              currency,
              originalSubtotal: new Prisma.Decimal(baseTotals.originalSubtotal),
              discount: new Prisma.Decimal(baseTotals.discount),
              couponDiscount: new Prisma.Decimal(couponDiscount),
              payableSubtotal: new Prisma.Decimal(baseTotals.payableSubtotal),
              shipping: new Prisma.Decimal(baseTotals.shipping),
              total: new Prisma.Decimal(finalTotal),
              contactEmail: normalizedEmail,
              contactPhone: normalizedPhone,
              shipFirstName: address.firstName,
              shipLastName: address.lastName,
              shipAddress: address.address,
              shipApartment: address.apartment,
              shipCity: address.city,
              shipState: address.state,
              shipPinCode: address.pinCode,
              shipCountry: address.country,
              shipPhone: address.phone,
              couponId: couponRow?.id ?? null,
              idempotencyKey: input.idempotencyKey,
              items: {
                create: purchasable.map((row) => {
                  const cartItem = dbCartItemToCartItem(row)
                  return {
                    productId: row.variant.product.id,
                    variantId: row.variant.id,
                    productName: row.variant.product.name,
                    productSlug: row.variant.product.slug,
                    sku: row.variant.sku,
                    color: row.variant.color,
                    size: row.variant.size,
                    quantity: row.quantity,
                    unitPrice: new Prisma.Decimal(cartItem.price),
                    compareAtPrice: cartItem.compareAtPrice !== undefined ? new Prisma.Decimal(cartItem.compareAtPrice) : null,
                    itemTotal: new Prisma.Decimal(cartItem.price * cartItem.quantity),
                    imageSrc: cartItem.image.src,
                    imageAlt: cartItem.image.alt,
                  }
                }),
              },
            },
            include: { items: true },
          })
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // Vanishingly unlikely orderNumber collision (see
            // generateOrderNumber's timestamp+random construction) — an
            // idempotencyKey collision is handled outside this try, not
            // here, since that one means "already placed", not "retry."
            throw new OrderError('Could not place your order — please try again.')
          }
          throw err
        }

        // 9. Clear only the cart items that were actually purchased —
        // never another customer's cart, and never an unavailable item
        // that was excluded from this order.
        await tx.cartItem.deleteMany({
          where: { userId: customer.id, variantId: { in: purchasable.map((row) => row.variant.id) } },
        })

        return { order, items: lineCartItems }
      },
      { maxWait: 5000, timeout: 15000 }
    )

    return { success: true, order: toPlacedOrderSummary(createdOrder.order, createdOrder.items) }
  } catch (err) {
    if (err instanceof OrderError) return { success: false, error: err.message }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // A genuine concurrent double-submit: the other request's insert won
      // the idempotencyKey unique constraint between our pre-check and our
      // own insert. Return that order instead of an error.
      const replay = await findOwnOrderByIdempotencyKey(input.idempotencyKey, customer.id)
      if (replay) return { success: true, order: replay }
    }

    console.error('[placeOrderAction] unexpected failure', err)
    return { success: false, error: 'Could not place your order. Please try again.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order History (Prisma, read-only)
//
// Backs /account/orders and /account/orders/[id] — replaces the old
// lib/services/mock-order-service.ts path for these two pages (that file
// stays in place unmodified; prisma/seed.ts still uses it as a seed-data
// source, and /checkout → /order-success's sessionStorage handoff in
// lib/order-storage.ts is unrelated and unchanged). Both actions below
// derive the customer exclusively from requireCustomerSession() and scope
// every query by that userId (lib/orders.db.ts) — a client-supplied id is
// never accepted, and one customer can never read another's order.
// ─────────────────────────────────────────────────────────────────────────────

/** All of the signed-in customer's orders, newest first. Throws (via
 *  requireCustomerSession) when there's no valid session. */
export async function getMyOrdersAction(): Promise<CustomerOrderSummary[]> {
  const customer = await requireCustomerSession()
  return listMyOrders(customer.id)
}

/** One order belonging to the signed-in customer, or null if it doesn't
 *  exist or belongs to someone else — never a different error for the two
 *  cases, so a probing customer can't tell them apart. */
export async function getMyOrderAction(orderNumber: string): Promise<CustomerOrderDetail | null> {
  const customer = await requireCustomerSession()
  return getMyOrder(customer.id, orderNumber)
}

// ─── Buy Again (Prisma, server-only) ───────────────────────────────────────
//
// Buy Again is a NEW purchase against TODAY's catalog, never a restoration
// of the historical order — nothing here reads OrderItem.unitPrice/
// itemTotal, and the price/stock used always come from a fresh Product/
// ProductVariant read. Resolution order per item:
//   1. The OrderItem's own productId (a real Product.id, when it was
//      recorded at purchase time — see lib/orders.db.ts's toItemRow).
//   2. Falls back to the product's slug — still the real database
//      (lib/products.db.ts's getCurrentProductsForOrderItems), never
//      lib/mock-data.ts or lib/product-detail-data.ts's hardcoded catalog —
//      for an item with no stored productId, or one that no longer
//      resolves (the product was deleted since).
//   3. The OrderItem's own variantId, if it still names a real variant of
//      that product; otherwise its recorded color+size matched against the
//      product's CURRENT variants (lib/product-detail-data.ts's findVariant
//      — a pure, data-source-agnostic matcher, not mock data itself).
// An item that can't be resolved this way, or whose resolved variant has
// zero stock, comes back { available: false } — never a manufactured id,
// never a guess, and never a client-supplied price (the input type below
// carries no price field at all).
//
// This only RESOLVES what to add — it never writes to the cart itself. The
// caller (components/account/OrderDetailClient.tsx) feeds each available
// result's cartInput into the existing CartContext.addItem(), which for a
// signed-in customer still calls the existing, unmodified
// lib/cart.actions.ts's addToCartAction — the same server-side
// productId/variantId consistency check every other add-to-cart already
// goes through.

export interface BuyAgainRequestItem {
  /** '' when this OrderItem never recorded a real Product.id (legacy order,
   *  or the product was deleted before this field existed). */
  productId: string
  /** May be a real ProductVariant.id, or (per lib/orders.db.ts's toItemRow)
   *  the OrderItem's own id used as a display-only fallback key — either
   *  way this is only ever used as "try this id first," never trusted. */
  variantId: string
  slug: string
  color: string
  size: string
  quantity: number
}

export interface BuyAgainResolvedItem {
  available: boolean
  cartInput?: AddToCartInput
}

/** Requires a session (Buy Again is only ever reachable from a signed-in
 *  customer's own order-detail page) even though the lookup itself is
 *  public catalog data — keeps this consistent with every other export in
 *  this file. */
export async function resolveBuyAgainItemsAction(items: BuyAgainRequestItem[]): Promise<BuyAgainResolvedItem[]> {
  await requireCustomerSession()

  const productMap = await getCurrentProductsForOrderItems(items.map((item) => ({ productId: item.productId, slug: item.slug })))

  return items.map((item) => {
    const product = (item.productId ? productMap.get(item.productId) : undefined) ?? productMap.get(item.slug)
    if (!product) return { available: false }

    const variant =
      product.variants.find((v) => v.id === item.variantId) ?? findVariant(product.variants, item.color, item.size)
    if (!variant || variant.stock <= 0) return { available: false }

    const cartInput: AddToCartInput = {
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      color: variant.color,
      size: variant.size,
      quantity: Math.min(item.quantity, variant.stock),
      price: variant.priceOverride ?? product.price,
      compareAtPrice: product.compareAtPrice,
      currency: product.currency,
      image: product.images[0],
      stock: variant.stock,
    }
    return { available: true, cartInput }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay Payment (Prisma + Razorpay, server-only)
//
// Sits entirely on top of the order created above — never re-runs any part
// of placeOrderAction's transaction (stock/coupon/cart are untouched here).
//
//   initializeRazorpayOrderAction — creates (or reuses, on a retry) the
//   Razorpay Order for an existing Pending, non-COD application Order, and
//   hands back only what Razorpay Checkout needs client-side: the Razorpay
//   order id, the amount (computed here from the authoritative
//   Order.total — never from anything the client sends), the currency, and
//   the public key id. RAZORPAY_KEY_SECRET never leaves lib/razorpay.ts.
//
//   verifyRazorpayPaymentAction — the ONLY function that may ever set
//   paymentStatus to Paid, and only after:
//     1. re-reading the Order scoped by {orderNumber, userId} (never trusts
//        an orderId/userId the client sends — ownership is the query),
//     2. confirming the caller's razorpayOrderId matches the one this
//        Order's own initialize step created,
//     3. cryptographically verifying Razorpay's HMAC signature
//        server-side (lib/razorpay.ts's verifyRazorpaySignature) — a
//        client-reported "success" is never sufficient on its own.
//   The Pending → Paid transition itself is one atomic conditional update
//   (`WHERE paymentStatus = 'Pending' AND razorpayOrderId = ?`), the same
//   "never read-check-write" pattern placeOrderAction's own stock/coupon
//   updates use — so a double-fired success handler or a genuine race
//   between two verification calls can flip it at most once. A repeat of
//   the SAME already-applied payment is detected afterward and answered
//   with the same success response (idempotent replay), never an error.
// ─────────────────────────────────────────────────────────────────────────────

export interface InitializeRazorpayOrderResult {
  success: boolean
  error?: string
  /** True when this order was already Paid — the client should skip
   *  opening Razorpay Checkout entirely and just treat this as done. */
  alreadyPaid?: boolean
  orderNumber?: string
  razorpayOrderId?: string
  /** Paise (Razorpay's smallest-unit convention for INR) — always derived
   *  from the authoritative Order.total, never client input. */
  amount?: number
  currency?: string
  /** RAZORPAY_KEY_ID only — safe to expose, required by Razorpay Checkout. */
  keyId?: string
}

/** Creates (or, on a retry, reuses) the Razorpay Order backing an existing
 *  application Order. Reusing rather than recreating on every call is what
 *  makes "retry a failed/cancelled payment" safe — the same Razorpay order
 *  id is presented to Checkout again, never a second one, and nothing here
 *  touches stock, coupon usage, or creates a second application Order. */
export async function initializeRazorpayOrderAction(orderNumber: string): Promise<InitializeRazorpayOrderResult> {
  const customer = await requireCustomerSession()

  if (!isRequired(orderNumber)) return { success: false, error: 'Order not found.' }

  const order = await prisma.order.findFirst({ where: { orderNumber, userId: customer.id } })
  if (!order) return { success: false, error: 'Order not found.' }

  if (order.paymentMethod === 'cod') {
    return { success: false, error: 'This order does not require online payment.' }
  }

  if (order.paymentStatus === 'Paid') {
    return { success: true, alreadyPaid: true, orderNumber: order.orderNumber }
  }

  // Anything other than Pending/Paid (i.e. Failed — see lib/order-
  // expiration.ts, the only place that sets it) is a terminal, no-longer-
  // payable state: its stock (and coupon usage, if any) has already been
  // released back, so letting Checkout reopen here would risk the customer
  // paying for inventory that's since been sold to someone else. Blocking
  // it here, before Checkout ever opens, is safer than only catching it at
  // verification time.
  if (order.paymentStatus !== 'Pending') {
    return { success: false, error: 'This order can no longer be paid online. Please place a new order or contact support.' }
  }

  let keyId: string
  try {
    keyId = getRazorpayKeyId()
  } catch {
    return { success: false, error: 'Online payment is not available right now. Please try Cash on Delivery or contact support.' }
  }

  // Always the current, authoritative Order.total — this is the one and
  // only place the amount sent to Razorpay comes from.
  const amountInPaise = Math.round(Number(order.total) * 100)

  let razorpayOrderId = order.razorpayOrderId
  if (!razorpayOrderId) {
    try {
      const rzOrder = await createRazorpayOrder({
        amountInPaise,
        currency: order.currency,
        receipt: order.orderNumber,
      })
      razorpayOrderId = rzOrder.id
    } catch (err) {
      console.error('[initializeRazorpayOrderAction] Razorpay order creation failed', err)
      return { success: false, error: 'Could not start payment. Please try again.' }
    }

    // Conditional write — if a concurrent call already set one (e.g. a
    // double-click), keep that one rather than overwriting it, so a stray
    // duplicate Razorpay order never becomes the one Checkout actually uses.
    const written = await prisma.order.updateMany({
      where: { id: order.id, razorpayOrderId: null },
      data: { razorpayOrderId },
    })
    if (written.count === 0) {
      const fresh = await prisma.order.findUnique({ where: { id: order.id }, select: { razorpayOrderId: true } })
      razorpayOrderId = fresh?.razorpayOrderId ?? razorpayOrderId
    }
  }

  return {
    success: true,
    orderNumber: order.orderNumber,
    razorpayOrderId,
    amount: amountInPaise,
    currency: order.currency,
    keyId,
  }
}

export interface VerifyRazorpayPaymentInput {
  orderNumber: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface VerifyRazorpayPaymentResult {
  success: boolean
  error?: string
  orderNumber?: string
}

const GENERIC_VERIFY_ERROR = 'We could not verify this payment. Please contact support if you were charged.'

/** The only function in this codebase allowed to set Order.paymentStatus
 *  to Paid. Every check below is server-side; nothing here trusts a value
 *  the client merely asserts. */
export async function verifyRazorpayPaymentAction(input: VerifyRazorpayPaymentInput): Promise<VerifyRazorpayPaymentResult> {
  const customer = await requireCustomerSession()

  if (
    !isRequired(input.orderNumber) ||
    !isRequired(input.razorpayOrderId) ||
    !isRequired(input.razorpayPaymentId) ||
    !isRequired(input.razorpaySignature)
  ) {
    return { success: false, error: GENERIC_VERIFY_ERROR }
  }

  // Ownership check: the query itself, not a separate comparison against a
  // client-supplied userId — a foreign or nonexistent order number behaves
  // identically ("not found"), so a probing customer can't tell them apart.
  const order = await prisma.order.findFirst({ where: { orderNumber: input.orderNumber, userId: customer.id } })
  if (!order) return { success: false, error: 'Order not found.' }

  // Idempotent replay: this exact payment was already recorded for this
  // order (e.g. the success handler fired twice, or the network retried
  // the same verification call) — answer success again, never an error.
  if (order.paymentStatus === 'Paid') {
    if (order.razorpayPaymentId === input.razorpayPaymentId) {
      return { success: true, orderNumber: order.orderNumber }
    }
    // A different payment id being submitted for an already-paid order —
    // never overwrite a settled payment record.
    return { success: false, error: 'This order has already been paid.' }
  }

  // The Razorpay order id must be the exact one this application Order's
  // own initialize step created — never trust a client-supplied id on its
  // own, even before checking the signature.
  if (!order.razorpayOrderId || order.razorpayOrderId !== input.razorpayOrderId) {
    return { success: false, error: GENERIC_VERIFY_ERROR }
  }

  let signatureValid: boolean
  try {
    signatureValid = verifyRazorpaySignature({
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })
  } catch (err) {
    console.error('[verifyRazorpayPaymentAction] signature check failed', err)
    signatureValid = false
  }
  if (!signatureValid) return { success: false, error: GENERIC_VERIFY_ERROR }

  // Atomic conditional transition — the WHERE clause (still Pending, still
  // this razorpayOrderId) is what makes a double-fired handler or a genuine
  // concurrent verification race safe: at most one call can ever flip this.
  let updateResult: { count: number }
  try {
    updateResult = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'Pending', razorpayOrderId: input.razorpayOrderId },
      data: { paymentStatus: 'Paid', razorpayPaymentId: input.razorpayPaymentId, paidAt: new Date() },
    })
  } catch (err) {
    // razorpayPaymentId is unique — this exact id is already attached to a
    // DIFFERENT order. Never an unhandled crash; it's the same "must not
    // apply" outcome as any other payment-id conflict below.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { success: false, error: GENERIC_VERIFY_ERROR }
    }
    throw err
  }

  if (updateResult.count === 1) return { success: true, orderNumber: order.orderNumber }

  // Lost the race to a concurrent call — if it applied the SAME payment,
  // this is an idempotent replay, not a failure.
  const fresh = await prisma.order.findUnique({ where: { id: order.id } })
  if (fresh?.paymentStatus === 'Paid' && fresh.razorpayPaymentId === input.razorpayPaymentId) {
    return { success: true, orderNumber: order.orderNumber }
  }

  return { success: false, error: GENERIC_VERIFY_ERROR }
}
