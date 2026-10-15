'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Order Mutations (Prisma)
//
// The real persistence behind /admin/orders/[id]'s status editor. Reachable
// directly as a POST endpoint (see the Next.js Server Actions security
// guide), so it:
//
//   1. Calls requireAdminSession() first, unconditionally — the same guard
//      Products, Categories/Collections, and Inventory mutations use.
//   2. Takes only an orderNumber + the requested status string. Never reads
//      a client-supplied userId or role for authorization — the admin
//      session already establishes that; an orderNumber only ever selects
//      *which* row to act on (see the Server Actions data-security guide's
//      "send a reference, not the row's contents" pattern, already applied
//      the same way in lib/admin/products.actions.ts/taxonomy.actions.ts/
//      inventory.actions.ts).
//   3. Validates the requested status is one of the six real OrderStatus
//      values (lib/admin/orders.ts's ALL_ORDER_STATUSES) — accepted as a
//      plain string, not typed as OrderStatus, because a raw POST to this
//      action isn't bound by TypeScript at runtime; this is the actual
//      runtime enforcement, not the type annotation.
//   4. Delegates the actual write to lib/admin/orders.db.ts's
//      updateOrderStatusInDb — see that function's docstring for the
//      single transaction it runs (the status update plus, only on a
//      genuine transition into Cancelled, the matching ProductVariant.stock
//      restoration) and the atomic-claim shape that makes the restoration
//      idempotent under a race or a retry.
// ─────────────────────────────────────────────────────────────────────────────

import { requireAdminSession } from './auth/admin-session.actions'
import { dbOrderToAdminDetail, updateOrderStatusInDb } from './orders.db'
import { ALL_ORDER_STATUSES } from './orders'
import type { AdminOrderDetail } from './orders'
import type { OrderStatus } from '@/lib/types'

function isValidOrderStatus(value: string): value is OrderStatus {
  return (ALL_ORDER_STATUSES as string[]).includes(value)
}

export async function updateOrderStatusAction(orderNumber: string, status: string): Promise<AdminOrderDetail> {
  await requireAdminSession()

  if (!isValidOrderStatus(status)) {
    throw new Error(`"${status}" isn't a valid order status.`)
  }

  try {
    const updated = await updateOrderStatusInDb(orderNumber, status)
    return dbOrderToAdminDetail(updated)
  } catch (err) {
    throw err instanceof Error ? err : new Error('Could not update order status.')
  }
}
