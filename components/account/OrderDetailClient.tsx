'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Order Detail (client)
//
// Shares the account auth gate + sidebar with /account and /account/orders
// (useAccountAuth, AccountSidebar). Looked up via lib/orders.actions.ts's
// getMyOrderAction(orderId) — a Server Action that derives the customer
// from requireCustomerSession() and scopes the Prisma query by
// {orderNumber, userId} together, never trusting the [id] URL param alone.
// A mismatch (wrong owner or unknown id) returns null exactly like "doesn't
// exist" (rendered as "Order not found"), so a probing customer can't tell
// the two apart.
//
// Order Summary reuses components/cart/OrderTotalsBreakdown — the same
// Subtotal/Discount/Shipping/Total(/Coupon) block /cart and /checkout use —
// instead of re-deriving the numbers. All of it (including price/name/SKU/
// image) comes from the OrderItem snapshot Prisma already stored at
// purchase time, never a live Product/ProductVariant lookup — see
// lib/orders.db.ts. Buy Again is the one deliberate exception: it calls
// lib/orders.actions.ts's resolveBuyAgainItemsAction to resolve each line
// against TODAY's real Prisma catalog (never the historical snapshot above,
// never lib/product-detail-data.ts's mock catalog), then feeds the result
// into the existing CartContext.addItem — since "buy again" is a new
// purchase against today's catalog, not a copy of the old one.
//
// A Pending, non-COD order also gets a "Pay Now" button here — the durable
// half of the Razorpay retry path (components/checkout/CheckoutClient.tsx
// has the same-session half). This is what lets a customer resume payment
// after closing the tab or losing the checkout page's in-memory state:
// lib/razorpay-client.ts's payForOrder() re-opens Checkout against the same
// Razorpay order lib/orders.actions.ts's initializeRazorpayOrderAction
// already created, and a successful verification just bumps this
// component's own retryToken to re-fetch the order (now Paid) — never a
// second Order, never a second stock/coupon deduction.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PAYMENT_METHOD_LABELS } from '@/lib/order-storage'
import { getMyOrderAction, resolveBuyAgainItemsAction } from '@/lib/orders.actions'
import { payForOrder } from '@/lib/razorpay-client'
import type { CustomerOrderDetail } from '@/lib/orders.db'
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-pricing'
import { OrderTotalsBreakdown } from '@/components/cart/OrderTotalsBreakdown'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/Button'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { AccountSidebar } from './AccountSidebar'
import { useAccountAuth } from './useAccountAuth'
import type { OrderStatus } from '@/lib/types'

const TIMELINE_STAGES: OrderStatus[] = ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Header ─────────────────────────────────────────────────────────────────

function OrderHeader({ order }: { order: CustomerOrderDetail }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8 sm:mb-10 border-b border-border pb-6">
      <div>
        <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight mb-1.5">
          Order #{order.orderNumber}
        </h1>
        <p className="text-sm font-sans text-text-secondary">Placed on {formatOrderDate(order.placedAt)}</p>
      </div>
      {/* Plain bordered text, not a colour-coded badge — status is conveyed by
          the label itself, never by colour alone. */}
      <p className="shrink-0 text-xs font-sans font-semibold tracking-[0.15em] uppercase text-text-primary border border-border px-3 py-1.5">
        {order.status}
      </p>
    </div>
  )
}

// ─── Status timeline ────────────────────────────────────────────────────────
//
// Only the "Order Confirmed" step gets a real date (order.placedAt — the
// actual moment the order was placed). No other stage has a tracked
// timestamp, so none is invented; reached/upcoming is the only thing shown
// for the rest.

function OrderTimeline({ order }: { order: CustomerOrderDetail }) {
  if (order.status === 'Cancelled') {
    return (
      <div>
        <p className="text-sm font-sans font-semibold text-text-primary mb-1">Order Cancelled</p>
        <p className="text-sm font-sans text-text-secondary">This order has been cancelled.</p>
      </div>
    )
  }

  const currentIndex = TIMELINE_STAGES.indexOf(order.status)

  return (
    <ol>
      {TIMELINE_STAGES.map((stage, i) => {
        const reached = currentIndex >= 0 && i <= currentIndex
        const isLast = i === TIMELINE_STAGES.length - 1
        return (
          <li key={stage} className="flex gap-3" aria-current={i === currentIndex ? 'step' : undefined}>
            <div className="flex flex-col items-center" aria-hidden="true">
              <span
                className={['w-2.5 h-2.5 mt-1 rounded-full shrink-0', reached ? 'bg-text-primary' : 'bg-border'].join(' ')}
              />
              {!isLast && (
                <span
                  className={['w-px flex-1 min-h-[24px]', i < currentIndex ? 'bg-text-primary' : 'bg-border'].join(' ')}
                />
              )}
            </div>
            <div className={isLast ? 'pb-0' : 'pb-5'}>
              <p
                className={[
                  'text-xs font-sans tracking-wide uppercase',
                  reached ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary',
                ].join(' ')}
              >
                {stage === 'Confirmed' ? 'Order Confirmed' : stage}
              </p>
              {stage === 'Confirmed' && (
                <p className="text-2xs font-sans text-text-secondary mt-0.5">{formatOrderDate(order.placedAt)}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function OrderContentSkeleton() {
  return (
    <div className="flex-1 min-w-0 animate-pulse" aria-hidden="true">
      <div className="h-16 bg-surface rounded-sm mb-8 sm:mb-10" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-8 lg:gap-10">
        <div className="flex flex-col gap-6">
          <div className="h-40 bg-surface rounded-sm" />
          <div className="h-64 bg-surface rounded-sm" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-48 bg-surface rounded-sm" />
          <div className="h-24 bg-surface rounded-sm" />
        </div>
      </div>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 animate-pulse" aria-hidden="true">
      <div className="lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 bg-surface rounded-sm" />
        ))}
      </div>
      <OrderContentSkeleton />
    </div>
  )
}

// ─── Not found ──────────────────────────────────────────────────────────────

function OrderNotFound() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 border border-border">
      <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-3">
        Order not found
      </h1>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        We couldn&apos;t find this order or you don&apos;t have access to it.
      </p>
      <div className="w-full max-w-xs px-4">
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/account/orders')}>
          Back to My Orders
        </Button>
      </div>
    </div>
  )
}

// ─── Error state ────────────────────────────────────────────────────────────

function OrderError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 border border-border">
      <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-3">
        Unable to load order
      </h1>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        We couldn&apos;t load the order details right now. Please try again.
      </p>
      <div className="w-full max-w-xs px-4">
        <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  )
}

// ─── Order detail ───────────────────────────────────────────────────────────

function OrderDetail({ order, onPaid }: { order: CustomerOrderDetail; onPaid: () => void }) {
  const router = useRouter()
  const { addItem } = useCart()
  const [buyAgainMessage, setBuyAgainMessage] = useState<string | null>(null)
  const [isBuyingAgain, setIsBuyingAgain] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const addr = order.shippingAddress
  const needsPayment = order.paymentStatus === 'Pending' && order.paymentMethod !== 'cod'

  const handlePayNow = async () => {
    setIsPaying(true)
    setPaymentMessage(null)

    const outcome = await payForOrder(order.orderNumber, {
      name: `${addr.firstName} ${addr.lastName}`.trim(),
      email: order.contactEmail,
      contact: order.contactPhone,
    })

    switch (outcome.status) {
      case 'success':
        onPaid()
        return
      case 'cancelled':
        setPaymentMessage('Payment was cancelled. You can try again whenever you’re ready.')
        break
      case 'failed':
      case 'error':
        setPaymentMessage(outcome.message)
        break
    }
    setIsPaying(false)
  }

  // Resolves each ordered line against TODAY's real Prisma catalog — never
  // the historical snapshot shown in Order Items, and never a client-side
  // guess — via lib/orders.actions.ts's resolveBuyAgainItemsAction. Skips
  // (with a message) anything sold out, deleted, or otherwise no longer
  // resolvable since the order was placed.
  const handleBuyAgain = async () => {
    setBuyAgainMessage(null)
    setIsBuyingAgain(true)

    try {
      const resolved = await resolveBuyAgainItemsAction(
        order.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          slug: item.slug,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
        }))
      )

      let addedCount = 0
      for (const result of resolved) {
        if (!result.available || !result.cartInput) continue
        addItem(result.cartInput)
        addedCount++
      }

      if (addedCount === resolved.length) {
        router.push('/cart')
      } else if (addedCount > 0) {
        setBuyAgainMessage('Some items in this order are no longer available and were skipped.')
        router.push('/cart')
      } else {
        setBuyAgainMessage('These items are no longer available.')
      }
    } catch {
      setBuyAgainMessage('Something went wrong. Please try again.')
    } finally {
      setIsBuyingAgain(false)
    }
  }

  return (
    <div>
      <OrderHeader order={order} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
        {/* ── Main column: status + items ─────────────────────────── */}
        <div className="flex flex-col gap-8 sm:gap-10 min-w-0">
          <section aria-labelledby="order-status-heading">
            <h2
              id="order-status-heading"
              className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary mb-5"
            >
              Order Status
            </h2>
            <div className="border border-border p-6">
              <OrderTimeline order={order} />
            </div>
          </section>

          <section aria-labelledby="order-items-heading">
            <h2
              id="order-items-heading"
              className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary mb-5"
            >
              Order Items
            </h2>
            <ul className="border border-border divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.variantId} className="p-4 sm:p-5 flex items-center gap-4">
                  <Link
                    href={`/products/${item.slug}`}
                    aria-label={`View ${item.name}`}
                    className="relative shrink-0 w-16 h-20 sm:w-20 sm:h-[104px] overflow-hidden bg-surface"
                  >
                    <ImageWithFallback image={item.image} fill sizes="80px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="text-sm font-sans font-medium text-text-primary hover:underline underline-offset-2 decoration-text-secondary/50 transition-colors duration-150"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs font-sans text-text-secondary mt-1">
                      Colour: {item.color} &nbsp;·&nbsp; Size: {item.size} &nbsp;·&nbsp; Quantity: {item.quantity}
                    </p>
                    <p className="text-xs font-sans text-text-secondary mt-0.5">
                      Price: {formatPrice(item.price, item.currency)}
                    </p>
                  </div>
                  <p className="text-sm font-sans font-semibold text-text-primary shrink-0">
                    {formatPrice(item.price * item.quantity, item.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/account/orders"
            className="self-start text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
          >
            ← Back to My Orders
          </Link>
        </div>

        {/* ── Secondary column: summary, address, payment, delivery ── */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="border border-border p-6 flex flex-col gap-5">
            <h2 className="font-display text-xl text-text-primary leading-tight">Order Summary</h2>
            <OrderTotalsBreakdown
              currency={order.currency}
              totals={order.totals}
              couponCode={order.couponCode ?? undefined}
              couponDiscount={order.totals.couponDiscount}
            />
          </div>

          <div className="border border-border p-6 flex flex-col gap-2">
            <h2 className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary">
              Delivery Address
            </h2>
            <p className="text-sm font-sans text-text-primary leading-relaxed">
              {addr.firstName} {addr.lastName}
              <br />
              {addr.address}
              {addr.apartment ? `, ${addr.apartment}` : ''}
              <br />
              {addr.city}, {addr.state} {addr.pinCode}
              <br />
              {addr.country} &nbsp;·&nbsp; {addr.phone}
            </p>
          </div>

          <div className="border border-border p-6 flex flex-col gap-2">
            <h2 className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary">
              Payment
            </h2>
            <p className="text-sm font-sans text-text-primary">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
            <p className="text-xs font-sans text-text-secondary">
              Payment status: <span className="text-text-primary font-medium">{order.paymentStatus}</span>
            </p>
            {needsPayment && (
              <div className="flex flex-col gap-2 mt-1">
                <Button variant="primary" size="md" fullWidth onClick={handlePayNow} disabled={isPaying} loading={isPaying}>
                  {isPaying ? 'Processing...' : 'Pay Now'}
                </Button>
                {paymentMessage && (
                  <p role="status" className="text-[11px] font-sans text-text-secondary text-center">
                    {paymentMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border border-border p-6 flex flex-col gap-2">
            <h2 className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary">
              Delivery
            </h2>
            <p className="text-sm font-sans text-text-primary">Standard Delivery</p>
            <p className="text-xs font-sans text-text-secondary">
              Free delivery on orders above {formatPrice(FREE_SHIPPING_THRESHOLD, order.currency)}.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="primary" size="lg" fullWidth onClick={handleBuyAgain} loading={isBuyingAgain} disabled={isBuyingAgain}>
              Buy Again
            </Button>
            {buyAgainMessage && (
              <p role="status" className="text-[11px] font-sans text-text-secondary text-center">
                {buyAgainMessage}
              </p>
            )}
            <Button variant="outline" size="lg" fullWidth onClick={() => router.push('/products')}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── OrderDetailClient ──────────────────────────────────────────────────────

interface OrderDetailClientProps {
  orderId: string
}

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const { user, isHydrated, isLoggingOut, handleLogout } = useAccountAuth()

  // undefined = not loaded yet, null = no matching order for this id.
  const [order, setOrder] = useState<CustomerOrderDetail | null | undefined>(undefined)
  const [loadError, setLoadError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!isHydrated || !user) return
    let cancelled = false
    getMyOrderAction(orderId)
      .then((result) => {
        if (cancelled) return
        setOrder(result)
        setLoadError(false)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [isHydrated, user, orderId, retryToken])

  if (!isHydrated) return <OrderDetailSkeleton />
  if (!user) return null

  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
      <AccountSidebar active="orders" onLogout={handleLogout} isLoggingOut={isLoggingOut} />

      {loadError ? (
        <div className="flex-1 min-w-0">
          <OrderError onRetry={() => setRetryToken((t) => t + 1)} />
        </div>
      ) : order === undefined ? (
        <OrderContentSkeleton />
      ) : order === null ? (
        <div className="flex-1 min-w-0">
          <OrderNotFound />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <OrderDetail order={order} onPaid={() => setRetryToken((t) => t + 1)} />
        </div>
      )}
    </div>
  )
}
