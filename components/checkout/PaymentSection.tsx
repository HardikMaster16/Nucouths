'use client'

import React from 'react'
import type { PaymentMethod } from '@/lib/types'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: 'upi', label: 'UPI', description: 'Google Pay, PhonePe, Paytm & more' },
  { value: 'card', label: 'Credit / Debit Card', description: 'Visa, Mastercard, RuPay & more' },
  { value: 'netbanking', label: 'Net Banking', description: 'All major Indian banks supported' },
  { value: 'cod', label: 'Cash on Delivery', description: 'Pay in cash when your order arrives' },
]

interface PaymentSectionProps {
  value: PaymentMethod | null
  error?: string
  onChange: (method: PaymentMethod) => void
}

export function PaymentSection({ value, error, onChange }: PaymentSectionProps) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
        Payment
      </h2>

      <div
        role="radiogroup"
        aria-label="Payment method"
        aria-describedby={error ? 'paymentMethod-error' : undefined}
        className="flex flex-col gap-3"
      >
        {PAYMENT_METHODS.map((method) => {
          const checked = value === method.value
          return (
            <label
              key={method.value}
              className={[
                'flex items-center gap-3 border p-4 cursor-pointer transition-colors duration-150',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-primary has-[:focus-visible]:ring-offset-1',
                checked ? 'border-text-primary' : 'border-border hover:border-text-secondary',
              ].join(' ')}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.value}
                checked={checked}
                onChange={() => onChange(method.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={[
                  'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                  checked ? 'border-text-primary' : 'border-border',
                ].join(' ')}
              >
                {checked && <span className="w-2 h-2 rounded-full bg-text-primary" />}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-sans font-medium text-text-primary">
                  {method.label}
                </span>
                <span className="text-xs font-sans text-text-secondary">{method.description}</span>
              </span>
            </label>
          )
        })}
      </div>

      {error && (
        <p id="paymentMethod-error" role="alert" className="text-[11px] font-sans text-sale">
          {error}
        </p>
      )}
    </section>
  )
}
