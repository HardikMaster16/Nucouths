'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Checkout Page (client)
//
// `checkout` (CheckoutData) arrives as a prop from the Server Component at
// app/checkout/page.tsx, resolved server-side by lib/checkout.db.ts's
// getCheckoutData() — items, serverTotals, and the address book are all
// authoritative, server-computed values, never derived from client state.
//
// "Place Order" calls the real lib/orders.actions.ts's placeOrderAction — a
// signed-in-customer-only, server-side transaction that re-reads cart/
// pricing/stock/coupon/address from Prisma, decrements stock, consumes the
// coupon, and creates the Order/OrderItems (still paymentStatus Pending —
// see that file's own docstring). Nothing here computes or sends a price/
// subtotal/discount; the server's response is the only source of the real
// orderNumber/totals.
//
// For an online payment method (upi/card/netbanking), placing the order is
// only step one: lib/razorpay-client.ts's payForOrder() then opens Razorpay
// Checkout and, on its success callback, calls
// lib/orders.actions.ts's verifyRazorpayPaymentAction — the only place the
// order's paymentStatus can become Paid, and only after a server-side
// signature check. A cancelled/failed attempt leaves the order exactly as
// placeOrderAction created it (Pending, stock/coupon already applied,
// cart already cleared) and offers "Retry Payment", which re-opens
// Checkout against that SAME order — it never calls placeOrderAction again
// (idempotencyKey would just return the same order anyway) and never
// double-touches stock or coupon usage. COD orders skip this step
// entirely, exactly as before. Only after a successful payment (COD: the
// order itself; online: verified payment) does this hand the server-
// authoritative order off to /order-success via the existing sessionStorage
// mechanism (lib/order-storage.ts) — never used as proof of payment itself.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { EmptyCart } from '@/components/cart/EmptyCart'
import { INITIAL_CHECKOUT_FORM, validateCheckoutForm } from '@/lib/checkout-validation'
import type { CheckoutFormData } from '@/lib/checkout-validation'
import { ContactSection } from './ContactSection'
import { ShippingSection } from './ShippingSection'
import { DeliverySection } from './DeliverySection'
import { PaymentSection } from './PaymentSection'
import { CheckoutSummary } from './CheckoutSummary'
import { SavedAddressPicker } from './SavedAddressPicker'
import { Button } from '@/components/ui/Button'
import { AlertIcon } from '@/components/admin/icons'
import { savePlacedOrder } from '@/lib/order-storage'
import { createAddressAction } from '@/lib/addresses.actions'
import { placeOrderAction } from '@/lib/orders.actions'
import { payForOrder } from '@/lib/razorpay-client'
import type { PlacedOrderSummary } from '@/lib/orders.actions'
import type { AppliedCoupon } from './PromoCode'
import type { PaymentMethod } from '@/lib/types'
import type { CheckoutData } from '@/lib/checkout.db'
import type { CartTotals } from '@/lib/cart-pricing'

/** Editing any of these after picking a saved address means the submitted
 *  address no longer necessarily matches that saved row — clearing
 *  `selectedAddressId` forces handleSubmit to save (and order against) a
 *  fresh Address snapshot of exactly what's on screen, instead of silently
 *  reusing a saved address the customer has since changed. */
const ADDRESS_FIELD_KEYS: (keyof CheckoutFormData)[] = [
  'firstName', 'lastName', 'address', 'apartment', 'city', 'state', 'pinCode', 'country', 'shippingPhone',
]

type TouchedMap = Partial<Record<keyof CheckoutFormData, boolean>>

const ALL_FIELDS_TOUCHED: TouchedMap = (Object.keys(INITIAL_CHECKOUT_FORM) as (keyof CheckoutFormData)[]).reduce(
  (acc, key) => {
    acc[key] = true
    return acc
  },
  {} as TouchedMap
)

function addressDefaults(checkout: CheckoutData): Partial<CheckoutFormData> {
  const defaultAddress = checkout.addresses.find((a) => a.id === checkout.defaultAddressId)
  if (!defaultAddress) return {}
  return {
    firstName: defaultAddress.firstName,
    lastName: defaultAddress.lastName,
    address: defaultAddress.address,
    apartment: defaultAddress.apartment ?? '',
    city: defaultAddress.city,
    state: defaultAddress.state,
    pinCode: defaultAddress.pinCode,
    country: defaultAddress.country,
    shippingPhone: defaultAddress.phone,
  }
}

export function CheckoutClient({ checkout }: { checkout: CheckoutData }) {
  const { removeItem } = useCart()
  const { user } = useAuth()
  const router = useRouter()

  // items/serverTotals/currency/addresses are all server-computed
  // (lib/checkout.db.ts's getCheckoutData(), re-read from Prisma on this
  // page load) — the authoritative values this checkout treats as truth.
  // Nothing below ever recomputes them from client state.
  const { items, currency, addresses, unavailableItems } = checkout

  const [formData, setFormData] = useState<CheckoutFormData>(() => ({
    ...INITIAL_CHECKOUT_FORM,
    email: user?.email ?? '',
    ...addressDefaults(checkout),
  }))
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(checkout.defaultAddressId)
  const [touched, setTouched] = useState<TouchedMap>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Set once placeOrderAction succeeds for an online payment method and
  // payment hasn't been verified yet — its presence is what turns the
  // button into "Retry Payment" (re-opens Razorpay Checkout against this
  // SAME order) instead of re-submitting the form. Never set for COD,
  // which finishes in one step exactly as before.
  const [placedOrder, setPlacedOrder] = useState<PlacedOrderSummary | null>(null)
  // Inline feedback from a Razorpay attempt (cancelled/failed) — distinct
  // from submitError, which is for the order-creation step itself.
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)

  // Generated once for this page load and reused across every submit
  // attempt for it (never regenerated per click) — a double-click or a
  // retried request carries the identical key, so lib/orders.actions.ts's
  // placeOrderAction can recognize it as the same attempt and never create
  // a second Order for it.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  // `totals` starts as the server-computed pre-coupon value and is only ever
  // replaced by what a coupon Server Action itself returns (lib/checkout-
  // coupon.actions.ts) — never recomputed here from a client-side discount.
  const [totals, setTotals] = useState<CartTotals>(checkout.serverTotals)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const handleCouponTotalsChange = (nextTotals: CartTotals, coupon: AppliedCoupon | null) => {
    setTotals(nextTotals)
    setAppliedCoupon(coupon)
  }

  const errors = useMemo(() => validateCheckoutForm(formData), [formData])
  const isFormValid = Object.keys(errors).length === 0
  const hasAttemptedSubmit = Object.keys(touched).length > 0

  if (checkout.isEmpty) return <EmptyCart />

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (ADDRESS_FIELD_KEYS.includes(field)) setSelectedAddressId(undefined)
  }

  const handleBlur = (field: keyof CheckoutFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handlePaymentChange = (method: PaymentMethod) => {
    setFormData((prev) => ({ ...prev, paymentMethod: method }))
    setTouched((prev) => ({ ...prev, paymentMethod: true }))
  }

  const handleSelectSavedAddress = (addressId: string, fields: Partial<CheckoutFormData>) => {
    setSelectedAddressId(addressId)
    setFormData((prev) => ({ ...prev, ...fields }))
  }

  /** Returns an Address id belonging to this customer, re-verifiable
   *  server-side by {id, userId} — either the saved address still exactly
   *  selected, or a freshly saved snapshot of whatever's currently on
   *  screen (via the existing, already-validated createAddressAction).
   *  Never sends raw shipping text to placeOrderAction itself. */
  const resolveAddressId = async (): Promise<string> => {
    if (selectedAddressId) return selectedAddressId

    const created = await createAddressAction({
      label: 'Home',
      firstName: formData.firstName,
      lastName: formData.lastName,
      address: formData.address,
      apartment: formData.apartment || undefined,
      city: formData.city,
      state: formData.state,
      pinCode: formData.pinCode,
      country: formData.country,
      phone: formData.shippingPhone,
      isDefault: false,
    })
    return created.id
  }

  /** Only reached once payment is actually settled — COD immediately (no
   *  online payment step exists), or an online method only after
   *  verifyRazorpayPaymentAction has confirmed the signature server-side.
   *  Hands the server-authoritative order to /order-success's existing
   *  sessionStorage mechanism — display data for that one page, never
   *  itself treated as proof of anything. */
  const finalizeOrder = (order: PlacedOrderSummary) => {
    savePlacedOrder({
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      status: order.status,
      // Tags the order with whoever is signed in at the moment of purchase
      // — this page already requires a signed-in customer (see
      // app/checkout/page.tsx), so this is always a real user id, never a
      // client-supplied one.
      userId: user?.id ?? null,
      items: order.items,
      totals: order.totals,
      currency: order.currency,
      contact: { email: order.contactEmail, phone: order.contactPhone },
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
    })
    router.push('/order-success')
  }

  /** Opens Razorpay Checkout for an order placeOrderAction already created
   *  (Pending, non-COD) and reacts to how it ends — this is also the retry
   *  path: calling it again for the same `order` re-opens Checkout against
   *  the same Razorpay order (lib/orders.actions.ts's
   *  initializeRazorpayOrderAction reuses it) rather than creating anything
   *  new. Never touches stock, coupon usage, or placeOrderAction again. */
  const handlePayment = async (order: PlacedOrderSummary) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setPaymentNotice(null)

    const outcome = await payForOrder(order.orderNumber, {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      contact: formData.phone,
    })

    switch (outcome.status) {
      case 'success':
        finalizeOrder(order)
        return
      case 'cancelled':
        setPaymentNotice('Payment was cancelled. Your order is saved — you can try paying again.')
        break
      case 'failed':
        setPaymentNotice(outcome.message)
        break
      case 'error':
        setSubmitError(outcome.message)
        break
    }
    setIsSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Payment retry: the order already exists (Pending, online method) —
    // re-open Checkout for it instead of re-validating/re-submitting the
    // form or calling placeOrderAction a second time.
    if (placedOrder) {
      await handlePayment(placedOrder)
      return
    }

    setTouched(ALL_FIELDS_TOUCHED)
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const addressId = await resolveAddressId()
      const result = await placeOrderAction({
        addressId,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        paymentMethod: formData.paymentMethod as PaymentMethod,
        couponCode: appliedCoupon?.code ?? null,
        idempotencyKey,
      })

      if (!result.success || !result.order) {
        setSubmitError(result.error ?? 'Could not place your order. Please try again.')
        setIsSubmitting(false)
        return
      }

      const { order } = result

      // Removes only what the order transaction actually cleared server-side
      // — never the whole cart, so any item that was unavailable (and so
      // excluded from the order) stays exactly where it was. Happens once,
      // here, regardless of payment outcome — a payment retry below never
      // touches the cart again.
      order.items.forEach((item) => removeItem(item.variantId))

      if (order.paymentMethod === 'cod') {
        finalizeOrder(order)
        return
      }

      setPlacedOrder(order)
      await handlePayment(order)
    } catch {
      setSubmitError('Could not place your order. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 sm:mb-10 border-b border-border pb-5 sm:pb-6">
        <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight">
          Checkout
        </h1>
      </div>

      {unavailableItems.length > 0 && (
        <div role="alert" className="mb-6 border border-sale/30 bg-sale/5 text-sale rounded-sm p-3 flex items-start gap-2.5 text-sm font-sans">
          <AlertIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {unavailableItems.length === 1 ? 'An item in' : `${unavailableItems.length} items in`} your cart{' '}
            {unavailableItems.length === 1 ? 'is' : 'are'} no longer available and{' '}
            {unavailableItems.length === 1 ? "wasn't" : "weren't"} included in your order total. You can remove{' '}
            {unavailableItems.length === 1 ? 'it' : 'them'} from your cart.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 md:gap-8 lg:gap-12 xl:gap-16 items-start">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8 sm:gap-10">
          <ContactSection
            data={formData}
            errors={errors}
            touched={touched}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {addresses.length > 0 && (
            <div className="flex flex-col gap-5 pb-8 sm:pb-10 border-b border-border">
              <SavedAddressPicker
                addresses={addresses}
                selectedId={selectedAddressId}
                onSelect={handleSelectSavedAddress}
              />
            </div>
          )}
          <ShippingSection
            data={formData}
            errors={errors}
            touched={touched}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <DeliverySection currency={currency} totals={totals} />
          <PaymentSection
            value={formData.paymentMethod}
            error={touched.paymentMethod ? errors.paymentMethod : undefined}
            onChange={handlePaymentChange}
          />

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={(!placedOrder && !isFormValid) || isSubmitting}
              loading={isSubmitting}
            >
              {placedOrder
                ? isSubmitting
                  ? 'Processing Payment...'
                  : 'Retry Payment'
                : isSubmitting
                  ? 'Placing Order...'
                  : 'Place Order'}
            </Button>
            {hasAttemptedSubmit && !isFormValid && !placedOrder && (
              <p role="status" aria-live="polite" className="text-[11px] font-sans text-sale text-center">
                Please complete all required fields to place your order.
              </p>
            )}
            {paymentNotice && (
              <p role="status" aria-live="polite" className="text-[11px] font-sans text-text-secondary text-center">
                {paymentNotice}
              </p>
            )}
            {submitError && (
              <p role="alert" aria-live="assertive" className="text-[11px] font-sans text-sale text-center">
                {submitError}
              </p>
            )}
          </div>
        </form>

        <CheckoutSummary
          items={items}
          currency={currency}
          totals={totals}
          appliedCoupon={appliedCoupon}
          onTotalsChange={handleCouponTotalsChange}
        />
      </div>
    </div>
  )
}
