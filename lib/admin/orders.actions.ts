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
//   4. Writes a single field (Order.status) — no ProductVariant.stock
//      deduction/restoration here (out of scope for this task; see the
//      module docstring in lib/admin/orders.db.ts) and no other related
//      record needs updating alongside it, so this transaction has exactly
//      one statement in it — wrapped in $transaction anyway per the task's
//      requirement, and so a future extension (e.g. stock adjustment on
//      cancellation) can't accidentally land outside the atomic boundary.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './auth/admin-session.actions'
import { dbOrderToAdminDetail, orderWithRelations, TO_PRISMA_ORDER_STATUS } from './orders.db'
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
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) =>
      tx.order.update({
        where: { orderNumber },
        data: { status: TO_PRISMA_ORDER_STATUS[status] },
        include: orderWithRelations,
      })
    )
    return dbOrderToAdminDetail(updated)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Order not found.')
    }
    throw err instanceof Error ? err : new Error('Could not update order status.')
  }
}
