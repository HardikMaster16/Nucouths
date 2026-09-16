// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Checkout Form Validation
//
// Pure validators, data-source-agnostic like the rest of lib/. Kept separate
// from the form components so the same rules can be unit-tested or reused
// (e.g. by a future server-side check) without dragging in any UI.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaymentMethod } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Indian mobile numbers: 10 digits, first digit 6-9. Accepts an optional
// leading +91/91/0 and any spaces/dashes, which are stripped before checking.
const INDIAN_PHONE_RE = /^[6-9]\d{9}$/
// Indian PIN codes: 6 digits, first digit 1-9 (no PIN starts with 0).
const INDIAN_PIN_RE = /^[1-9]\d{5}$/

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, '').replace(/^(\+?91)/, '').replace(/^0/, '')
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function isValidIndianPhone(value: string): boolean {
  return INDIAN_PHONE_RE.test(normalizePhone(value.trim()))
}

export function isValidIndianPin(value: string): boolean {
  return INDIAN_PIN_RE.test(value.trim())
}

export function isRequired(value: string): boolean {
  return value.trim().length > 0
}

// ─── Checkout form shape + aggregate validation ───────────────────────────────

export interface CheckoutFormData {
  email: string
  phone: string
  firstName: string
  lastName: string
  address: string
  apartment: string
  city: string
  state: string
  pinCode: string
  country: string
  shippingPhone: string
  paymentMethod: PaymentMethod | null
}

export const INITIAL_CHECKOUT_FORM: CheckoutFormData = {
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  address: '',
  apartment: '',
  city: '',
  state: '',
  pinCode: '',
  country: 'India',
  shippingPhone: '',
  paymentMethod: null,
}

export type CheckoutFieldErrors = Partial<Record<keyof CheckoutFormData, string>>

/** Single source of truth for which fields are required and how — the Place
 *  Order button and the inline field errors both derive from this. */
export function validateCheckoutForm(data: CheckoutFormData): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {}

  if (!isRequired(data.email)) errors.email = 'Email address is required.'
  else if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address.'

  if (!isRequired(data.phone)) errors.phone = 'Phone number is required.'
  else if (!isValidIndianPhone(data.phone)) errors.phone = 'Enter a valid 10-digit mobile number.'

  if (!isRequired(data.firstName)) errors.firstName = 'First name is required.'
  if (!isRequired(data.lastName)) errors.lastName = 'Last name is required.'
  if (!isRequired(data.address)) errors.address = 'Address is required.'
  if (!isRequired(data.city)) errors.city = 'City is required.'
  if (!isRequired(data.state)) errors.state = 'State is required.'

  if (!isRequired(data.pinCode)) errors.pinCode = 'PIN code is required.'
  else if (!isValidIndianPin(data.pinCode)) errors.pinCode = 'Enter a valid 6-digit PIN code.'

  if (!isRequired(data.country)) errors.country = 'Country is required.'

  if (!isRequired(data.shippingPhone)) errors.shippingPhone = 'Phone number is required.'
  else if (!isValidIndianPhone(data.shippingPhone)) {
    errors.shippingPhone = 'Enter a valid 10-digit mobile number.'
  }

  if (!data.paymentMethod) errors.paymentMethod = 'Select a payment method.'

  return errors
}

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
] as const
