// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Customer Reads (Prisma)
//
// Server-only reads backing /admin/customers and /admin/customers/[id].
// Imported only from those Server Components — never from a 'use client'
// component, so Prisma is never pulled into a browser bundle.
//
// Security: the User fields fetched are an explicit `select`, not `include`
// — passwordHash is never part of it, so it's never even pulled out of
// Postgres for this module, let alone constructed into a returned row. Every
// function here builds a fresh plain object (AdminCustomerRow /
// AdminCustomerDetail) field-by-field; nothing ever spreads a raw Prisma
// record into a value that could reach a client component.
//
// Customer status: lib/admin/customers.ts's CustomerStatus ('Active' |
// 'Inactive') has no corresponding column on User — the mock version's
// ADMIN_CUSTOMER_STATUS was a standalone per-id lookup with no real
// business rule behind it, and the existing /admin/customers UI has no
// control to change it (see components/admin/customers/
// AdminCustomerDetailView.tsx — the badge is read-only). Every database-
// backed row here is 'Active'. Making this a real, admin-editable field
// would need a schema change (a status column on User) — out of scope
// per this task's "do not modify the schema unless absolutely necessary"
// and "only if the existing UI supports it", and the UI doesn't.
//
// Address: preserves the User → Address → Order relationship instruction —
// prefers a real saved Address (Address.isDefault, falling back to most
// recently updated) when the customer has one, and falls back to their most
// recent order's shipping snapshot otherwise, exactly like the mock
// version's own reasoning ("this mock system has no separate saved address
// book for this fictional roster, so this is genuine order data, not
// invented") — still true today: prisma/seed.ts never seeds any Address
// rows, so this fallback is what actually renders for every seeded
// customer right now, and the preference is only here for when real
// addresses exist.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/cart-pricing'
import { formatUpdatedAt } from './products'
import { FROM_PRISMA_ORDER_STATUS } from './orders.db'
import { requireAdminSession } from './auth/admin-session.actions'
import type { AdminCustomerDetail, AdminCustomerOrderRow, AdminCustomerRow } from './customers'
import type { OrderStatus, ShippingAddress } from '@/lib/types'

export const customerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  createdAt: true,
  orders: {
    orderBy: { placedAt: 'desc' },
    select: {
      orderNumber: true,
      placedAt: true,
      status: true,
      total: true,
      currency: true,
      contactPhone: true,
      shipFirstName: true,
      shipLastName: true,
      shipAddress: true,
      shipApartment: true,
      shipCity: true,
      shipState: true,
      shipPinCode: true,
      shipCountry: true,
      shipPhone: true,
      items: { select: { quantity: true } },
    },
  },
  addresses: {
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    take: 1,
  },
} satisfies Prisma.UserSelect

export type DbCustomer = Prisma.UserGetPayload<{ select: typeof customerSelect }>

function isRevenueOrderStatus(status: OrderStatus): boolean {
  return status !== 'Cancelled'
}

function customerName(user: Pick<DbCustomer, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim()
}

export function dbCustomerToAdminRow(user: DbCustomer): AdminCustomerRow {
  const totalSpent = user.orders
    .filter((o) => isRevenueOrderStatus(FROM_PRISMA_ORDER_STATUS[o.status]))
    .reduce((sum, o) => sum + Number(o.total), 0)
  const joinedAt = user.createdAt.toISOString()

  return {
    id: user.id,
    name: customerName(user),
    email: user.email,
    orderCount: user.orders.length,
    totalSpent,
    totalSpentFormatted: formatPrice(totalSpent, 'INR'),
    joinedAt,
    joinedAtFormatted: formatUpdatedAt(joinedAt),
    status: 'Active',
  }
}

function toCustomerOrderRow(order: DbCustomer['orders'][number]): AdminCustomerOrderRow {
  const status = FROM_PRISMA_ORDER_STATUS[order.status]
  const placedAt = order.placedAt.toISOString()

  return {
    orderNumber: order.orderNumber,
    placedAt,
    placedAtFormatted: formatUpdatedAt(placedAt),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: Number(order.total),
    totalFormatted: formatPrice(Number(order.total), order.currency),
    status,
    countsAsSale: isRevenueOrderStatus(status),
  }
}

export function dbCustomerToDetail(user: DbCustomer): AdminCustomerDetail {
  const row = dbCustomerToAdminRow(user)
  const orders = user.orders // already sorted newest-first by the query
  const revenueOrderCount = orders.filter((o) => isRevenueOrderStatus(FROM_PRISMA_ORDER_STATUS[o.status])).length
  const averageOrderValue = revenueOrderCount > 0 ? row.totalSpent / revenueOrderCount : 0
  const mostRecentOrder = orders[0] as DbCustomer['orders'][number] | undefined
  const savedAddress = user.addresses[0]

  const shippingAddress: ShippingAddress | undefined = savedAddress
    ? {
        firstName: savedAddress.firstName,
        lastName: savedAddress.lastName,
        address: savedAddress.address,
        apartment: savedAddress.apartment ?? undefined,
        city: savedAddress.city,
        state: savedAddress.state,
        pinCode: savedAddress.pinCode,
        country: savedAddress.country,
        phone: savedAddress.phone,
      }
    : mostRecentOrder
      ? {
          firstName: mostRecentOrder.shipFirstName,
          lastName: mostRecentOrder.shipLastName,
          address: mostRecentOrder.shipAddress,
          apartment: mostRecentOrder.shipApartment ?? undefined,
          city: mostRecentOrder.shipCity,
          state: mostRecentOrder.shipState,
          pinCode: mostRecentOrder.shipPinCode,
          country: mostRecentOrder.shipCountry,
          phone: mostRecentOrder.shipPhone,
        }
      : undefined

  const lastOrderAt = mostRecentOrder?.placedAt.toISOString()

  return {
    ...row,
    phone: user.phone ?? mostRecentOrder?.contactPhone,
    averageOrderValue,
    averageOrderValueFormatted: formatPrice(averageOrderValue, 'INR'),
    lastOrderAt,
    lastOrderAtFormatted: lastOrderAt ? formatUpdatedAt(lastOrderAt) : undefined,
    shippingAddress,
    orders: orders.map(toCustomerOrderRow),
  }
}

/** All store-wide customers, shaped for the admin listing. Scoped to
 *  role: 'customer' so admin-role User rows (see lib/admin/auth/
 *  admin-session.actions.ts) never show up in this roster. Requires an
 *  admin session — app/admin/(dashboard)/customers/page.tsx has no guard
 *  of its own (the client-side AdminShell redirect doesn't stop a Server
 *  Component's data fetch from running or reaching the RSC payload — see
 *  Next.js's own authentication guide), so the check happens here, right
 *  at the data source, before any customer PII is ever read. */
export async function listAdminCustomers(): Promise<AdminCustomerRow[]> {
  await requireAdminSession()
  const users = await prisma.user.findMany({
    where: { role: 'customer' },
    select: customerSelect,
    orderBy: { createdAt: 'desc' },
  })
  return users.map(dbCustomerToAdminRow)
}

/** Full customer detail, for the admin customer detail page. Requires an
 *  admin session — see listAdminCustomers's docstring above. */
export async function getAdminCustomerDetail(id: string): Promise<AdminCustomerDetail | undefined> {
  await requireAdminSession()
  const user = await prisma.user.findFirst({ where: { id, role: 'customer' }, select: customerSelect })
  return user ? dbCustomerToDetail(user) : undefined
}
