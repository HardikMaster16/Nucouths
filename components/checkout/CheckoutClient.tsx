'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Checkout Page (client)
//
// Reads directly from the shared CartContext (same source /cart uses) and the
// shared pricing module (lib/cart-pricing.ts) — no separate checkout pricing
// system. No backend/payment provider exists yet: "placing an order" snapshots
// the cart + form into sessionStorage (lib/order-storage.ts), clears the cart,
// and navigates to /order-success.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { EmptyCart } from '@/components/cart/EmptyCart'
import { calculateCartTotals } from '@/lib/cart-pricing'
import { INITIAL_CHECKOUT_FORM, validateCheckoutForm } from '@/lib/checkout-validation'
import type { CheckoutFormData } from '@/lib/checkout-validation'
import { ContactSection } from './ContactSection'
import { ShippingSection } from './ShippingSection'
import { DeliverySection } from './DeliverySection'
import { PaymentSection } from './PaymentSection'
import { CheckoutSummary } from './CheckoutSummary'
import { Button } from '@/components/ui/Button'
import { generateOrderNumber, savePlacedOrder } from '@/lib/order-storage'
import type { PaymentMethod } from '@/lib/types'

type TouchedMap = Partial<Record<keyof CheckoutFormData, boolean>>

const ALL_FIELDS_TOUCHED: TouchedMap = (Object.keys(INITIAL_CHECKOUT_FORM) as (keyof CheckoutFormData)[]).reduce(
  (acc, key) => {
    acc[key] = true
    return acc
  },
  {} as TouchedMap
)

export function CheckoutClient() {
  const { items, isHydrated, clearCart } = useCart()
  const router = useRouter()

  const [formData, setFormData] = useState<CheckoutFormData>(INITIAL_CHECKOUT_FORM)
  const [touched, setTouched] = useState<TouchedMap>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const errors = useMemo(() => validateCheckoutForm(formData), [formData])
  const isFormValid = Object.keys(errors).length === 0
  const hasAttemptedSubmit = Object.keys(touched).length > 0

  // Hooks above this line always run; only the render output is gated, so
  // this respects the Rules of Hooks while still avoiding a misleading
  // "empty bag" flash before the persisted cart has loaded.
  if (!isHydrated) return null
  if (items.length === 0) return <EmptyCart />

  const currency = items[0].currency
  const totals = calculateCartTotals(items)

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleBlur = (field: keyof CheckoutFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handlePaymentChange = (method: PaymentMethod) => {
    setFormData((prev) => ({ ...prev, paymentMethod: method }))
    setTouched((prev) => ({ ...prev, paymentMethod: true }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(ALL_FIELDS_TOUCHED)
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    // Simulated processing delay — no real payment provider is wired up yet.
    window.setTimeout(() => {
      savePlacedOrder({
        orderNumber: generateOrderNumber(),
        placedAt: new Date().toISOString(),
        items,
        totals,
        currency,
        contact: { email: formData.email, phone: formData.phone },
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          apartment: formData.apartment || undefined,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          country: formData.country,
          phone: formData.shippingPhone,
        },
        paymentMethod: formData.paymentMethod as PaymentMethod,
      })
      router.push('/order-success')
      clearCart()
    }, 900)
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 sm:mb-10 border-b border-border pb-5 sm:pb-6">
        <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight">
          Checkout
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 md:gap-8 lg:gap-12 xl:gap-16 items-start">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8 sm:gap-10">
          <ContactSection
            data={formData}
            errors={errors}
            touched={touched}
            onChange={handleChange}
            onBlur={handleBlur}
          />
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
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Placing Order...' : 'Place Order'}
            </Button>
            {hasAttemptedSubmit && !isFormValid && (
              <p role="status" aria-live="polite" className="text-[11px] font-sans text-sale text-center">
                Please complete all required fields to place your order.
              </p>
            )}
          </div>
        </form>

        <CheckoutSummary items={items} currency={currency} totals={totals} />
      </div>
    </div>
  )
}
