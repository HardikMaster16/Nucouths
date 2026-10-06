// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Mock Store-Wide Data
//
// ⚠️ TEMPORARY DEVELOPMENT DATA. There is no order database or customer
// database yet, so this file is the admin panel's stand-in "GET /api/admin/*"
// source — a small, clearly fictional, deterministic dataset representing
// activity across the *whole store* (multiple customers), as opposed to
// lib/services/mock-order-service.ts, which is scoped to the one signed-in
// demo customer's own order history.
//
// Reuses the real PlacedOrder/OrderStatus types (lib/order-storage.ts,
// lib/types.ts) and real product/variant data (lib/product-detail-data.ts) —
// no parallel "AdminOrder"/"AdminProduct" model. Line items are built the
// same way lib/services/mock-order-service.ts builds its seed orders, so an
// order's price/image/category always matches the real catalog.
//
// Swap this file's contents for real API calls when a backend exists —
// lib/admin/dashboard.ts's function signatures can stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import { getProductDetail, findVariant } from '@/lib/product-detail-data'
import { calculateCartTotals } from '@/lib/cart-pricing'
import type { PlacedOrder } from '@/lib/order-storage'
import type { CartItem, ContactInfo, PaymentMethod, ShippingAddress } from '@/lib/types'

// ─── Fictional customers ────────────────────────────────────────────────────
// Distinct from the storefront's one demo account (demo-user-001) — these
// exist only to populate store-wide admin views with more than one shopper.

export interface AdminCustomerSeed {
  id: string
  name: string
  email: string
}

export const ADMIN_MOCK_CUSTOMERS: AdminCustomerSeed[] = [
  { id: 'cust-1001', name: 'Ananya Sharma', email: 'ananya.sharma@example.com' },
  { id: 'cust-1002', name: 'Rohan Mehta', email: 'rohan.mehta@example.com' },
  { id: 'cust-1003', name: 'Priya Nair', email: 'priya.nair@example.com' },
  { id: 'cust-1004', name: 'Karan Kapoor', email: 'karan.kapoor@example.com' },
  { id: 'cust-1005', name: 'Simran Kaur', email: 'simran.kaur@example.com' },
  { id: 'cust-1006', name: 'Aditya Rao', email: 'aditya.rao@example.com' },
]

function customer(id: string): AdminCustomerSeed {
  const found = ADMIN_MOCK_CUSTOMERS.find((c) => c.id === id)
  if (!found) throw new Error(`admin mock-data: unknown customer id (${id})`)
  return found
}

function buildItem(slug: string, color: string, size: string, quantity: number): CartItem {
  const product = getProductDetail(slug)
  const variant = product ? findVariant(product.variants, color, size) : undefined
  if (!product || !variant) {
    throw new Error(`admin mock-data: unknown product/variant for seed order (${slug} ${color} ${size})`)
  }
  return {
    productId: product.id,
    variantId: variant.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    color: variant.color,
    size: variant.size,
    quantity,
    price: variant.priceOverride ?? product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    image: product.images[0],
  }
}

function fictionalAddress(c: AdminCustomerSeed, city: string, state: string, pinCode: string): ShippingAddress {
  const [firstName, ...rest] = c.name.split(' ')
  return {
    firstName,
    lastName: rest.join(' '),
    address: '—',
    city,
    state,
    pinCode,
    country: 'India',
    phone: '+91 90000 00000',
  }
}

function contactFor(c: AdminCustomerSeed): ContactInfo {
  return { email: c.email, phone: '+91 90000 00000' }
}

// ─── Product catalog metadata ───────────────────────────────────────────────
// The real Product/ProductDetail types (lib/types.ts) have no "last updated"
// timestamp — there's no CMS behind the catalog yet to have generated one.
// Keyed by Product.id, same pattern as ADMIN_MOCK_CUSTOMERS above: admin-only
// metadata *about* the real catalog, never a parallel product record.

export const ADMIN_PRODUCT_UPDATED_AT: Record<string, string> = {
  'p-001': '2026-09-10T09:00:00.000Z',
  'p-002': '2026-08-22T14:30:00.000Z',
  'p-003': '2026-09-14T11:15:00.000Z',
  'p-004': '2026-07-30T16:45:00.000Z',
  'p-005': '2026-09-16T08:20:00.000Z',
  'p-006': '2026-06-11T10:00:00.000Z',
  'p-007': '2026-09-01T13:10:00.000Z',
  'p-008': '2026-05-19T17:40:00.000Z',
}

// ─── Category/collection metadata ───────────────────────────────────────────
// Same reasoning as ADMIN_PRODUCT_UPDATED_AT above: Product.category (lib/
// mock-data.ts) and Collection (lib/collections.ts) have no "last updated"
// timestamp of their own — there's no CMS yet to have generated one — so
// it's tracked here, keyed by the real category value / collection slug,
// rather than invented on either type.

export const ADMIN_CATEGORY_UPDATED_AT: Record<string, string> = {
  men: '2026-08-14T10:00:00.000Z',
  women: '2026-09-05T15:20:00.000Z',
}

export const ADMIN_COLLECTION_UPDATED_AT: Record<string, string> = {
  aw25: '2026-09-01T09:30:00.000Z',
  resort: '2026-07-18T12:00:00.000Z',
  essentials: '2026-08-27T16:10:00.000Z',
}

// ─── Customer metadata ───────────────────────────────────────────────────────
// Same reasoning again: AdminCustomerSeed above has no "joined" date or
// account status — there's no customer database yet to have generated
// either — so both are tracked here, keyed by customer id, rather than
// invented on the seed record itself.

export const ADMIN_CUSTOMER_JOINED_AT: Record<string, string> = {
  'cust-1001': '2026-03-12T09:00:00.000Z',
  'cust-1002': '2026-04-05T11:30:00.000Z',
  'cust-1003': '2026-01-22T14:15:00.000Z',
  'cust-1004': '2026-06-18T10:45:00.000Z',
  'cust-1005': '2026-02-09T16:20:00.000Z',
  'cust-1006': '2026-07-30T13:00:00.000Z',
}

export const ADMIN_CUSTOMER_STATUS: Record<string, 'Active' | 'Inactive'> = {
  'cust-1001': 'Active',
  'cust-1002': 'Active',
  'cust-1003': 'Active',
  'cust-1004': 'Inactive',
  'cust-1005': 'Active',
  'cust-1006': 'Active',
}

function order(
  orderNumber: string,
  placedAt: string,
  status: PlacedOrder['status'],
  cust: AdminCustomerSeed,
  items: CartItem[],
  paymentMethod: PaymentMethod,
  city: string,
  state: string,
  pinCode: string,
  // Required (not optional) so every call site below must state its
  // intended payment outcome explicitly — never left to fall back to
  // Order.paymentStatus's schema default, which is exactly the ambiguity
  // scripts/repair-legacy-order-payment-status.ts had to clean up after
  // the fact. `paidAt` is a separate param (rather than derived from
  // paymentStatus === 'Paid' ? placedAt : null) so an intentionally-
  // unresolved row like NUC-20039 can be Pending/null without the helper
  // silently deciding that for every future Pending call site too.
  paymentStatus: PlacedOrder['paymentStatus'],
  paidAt: PlacedOrder['paidAt']
): PlacedOrder {
  return {
    orderNumber,
    placedAt,
    status,
    userId: cust.id,
    items,
    totals: calculateCartTotals(items),
    currency: 'INR',
    contact: contactFor(cust),
    shippingAddress: fictionalAddress(cust, city, state, pinCode),
    paymentMethod,
    paymentStatus,
    paidAt,
  }
}

/** Store-wide order history across multiple fictional customers — what the
 *  admin dashboard's KPIs, sales overview, and recent-orders list are built
 *  from. Newest last here; lib/admin/dashboard.ts sorts as needed.
 *
 *  Every entry's paymentStatus/paidAt below reflects the approved repair
 *  from scripts/repair-legacy-order-payment-status.ts — see that script's
 *  own header for the reasoning behind each one. NUC-20039 is the sole
 *  deliberate exception: still Confirmed (no fulfillment progress at all),
 *  which makes it indistinguishable from a genuinely abandoned checkout —
 *  its payment status was never inferred from fulfillment and is left
 *  Pending/unresolved on purpose, not an oversight. */
export const ADMIN_MOCK_ORDERS: PlacedOrder[] = [
  order(
    'NUC-20031', '2026-08-12T09:15:00.000Z', 'Delivered', customer('cust-1001'),
    [buildItem('structured-wool-blazer', 'Camel', 'M', 1)],
    'upi', 'Mumbai', 'Maharashtra', '400001',
    'Paid', '2026-08-12T09:15:00.000Z'
  ),
  order(
    'NUC-20032', '2026-08-18T13:40:00.000Z', 'Delivered', customer('cust-1002'),
    [buildItem('tailored-straight-trousers', 'Slate', '32', 1), buildItem('merino-ribbed-turtleneck', 'Navy', 'M', 1)],
    'card', 'Bengaluru', 'Karnataka', '560001',
    'Paid', '2026-08-18T13:40:00.000Z'
  ),
  order(
    'NUC-20033', '2026-08-25T11:05:00.000Z', 'Cancelled', customer('cust-1003'),
    [buildItem('slip-midi-dress', 'Champagne', 'M', 1)],
    'card', 'Delhi', 'Delhi', '110001',
    // Cancelled — the conservative reading (nothing here indicates payment
    // was ever captured before cancellation); doesn't affect admin's
    // countsAsSale either way, since Cancelled orders are already excluded
    // from that regardless of paymentStatus.
    'Failed', null
  ),
  order(
    'NUC-20034', '2026-09-02T16:20:00.000Z', 'Shipped', customer('cust-1004'),
    [buildItem('quilted-overshirt-jacket', 'Navy', 'M', 1)],
    'netbanking', 'Pune', 'Maharashtra', '411001',
    'Paid', '2026-09-02T16:20:00.000Z'
  ),
  order(
    'NUC-20035', '2026-09-05T10:00:00.000Z', 'Delivered', customer('cust-1005'),
    [buildItem('oversized-cotton-shirt', 'White', 'S', 1), buildItem('cashmere-blend-scarf', 'Burgundy', 'ONE SIZE', 1)],
    'upi', 'Chandigarh', 'Punjab', '160001',
    'Paid', '2026-09-05T10:00:00.000Z'
  ),
  order(
    'NUC-20036', '2026-09-09T14:30:00.000Z', 'Processing', customer('cust-1006'),
    [buildItem('linen-wide-leg-trousers', 'Sand', 'M', 2)],
    'cod', 'Hyderabad', 'Telangana', '500001',
    // COD — always unpaid until delivery, regardless of fulfillment
    // progress; never expired by lib/order-expiration.ts either (it
    // excludes every COD order unconditionally).
    'Pending', null
  ),
  order(
    'NUC-20037', '2026-09-12T08:50:00.000Z', 'Out for Delivery', customer('cust-1001'),
    [buildItem('merino-ribbed-turtleneck', 'Oatmeal', 'S', 1)],
    'card', 'Mumbai', 'Maharashtra', '400001',
    'Paid', '2026-09-12T08:50:00.000Z'
  ),
  order(
    'NUC-20038', '2026-09-14T17:10:00.000Z', 'Shipped', customer('cust-1003'),
    [buildItem('tailored-straight-trousers', 'Sand', '30', 1)],
    'upi', 'Delhi', 'Delhi', '110001',
    'Paid', '2026-09-14T17:10:00.000Z'
  ),
  order(
    'NUC-20039', '2026-09-15T12:25:00.000Z', 'Confirmed', customer('cust-1002'),
    [buildItem('structured-wool-blazer', 'Charcoal', 'M', 1), buildItem('oversized-cotton-shirt', 'Light Blue', 'S', 1)],
    'card', 'Bengaluru', 'Karnataka', '560001',
    // Intentionally unresolved — see this array's own docstring above and
    // scripts/repair-legacy-order-payment-status.ts. Do NOT change this to
    // 'Paid' just because other Confirmed-or-later orders are.
    'Pending', null
  ),
]
