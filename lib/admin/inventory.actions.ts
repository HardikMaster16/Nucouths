'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Inventory Mutations (Prisma)
//
// The real persistence behind /admin/inventory's stock editor. Reachable
// directly as a POST endpoint (see the Next.js Server Actions security
// guide), so it:
//
//   1. Calls requireAdminSession() first, unconditionally — the same guard
//      Products and Categories/Collections mutations use.
//   2. Takes only a variantId + the new stock value. ProductVariant.id is
//      globally unique (@id), so it alone is enough to find the right row —
//      a client-supplied productId is never read for this, let alone
//      trusted for authorization (the admin session already establishes
//      that; a product/variant id only ever selects *which* row to act on).
//   3. Validates stock is an integer >= 0 server-side (never trusts that the
//      client's own check in components/admin/inventory/InventoryTable.tsx's
//      StockEditor actually ran).
//   4. Writes with a single, absolute SET — `data: { stock }` — not a
//      read-then-modify-write of a delta. Two concurrent edits can't
//      silently combine or lose each other's effect: whichever UPDATE
//      commits last simply wins with its own independently-chosen value,
//      which is the correct semantics for "set stock to N" (this editor
//      doesn't offer "adjust stock by N"). Wrapped in $transaction per the
//      task's requirement, even though a single statement is already
//      atomic — leaves room to extend safely without an accidental
//      non-atomic gap between statements.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './auth/admin-session.actions'
import { variantToInventoryRow, variantWithProduct } from './inventory.db'
import type { InventoryRow } from './inventory'

export async function updateVariantStockInDb(variantId: string, stock: number): Promise<InventoryRow> {
  await requireAdminSession()

  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error('Enter a whole number, 0 or greater.')
  }

  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) =>
      tx.productVariant.update({
        where: { id: variantId },
        data: { stock },
        include: variantWithProduct,
      })
    )
    return variantToInventoryRow(updated)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Variant not found — it may have been removed from this product.')
    }
    throw err instanceof Error ? err : new Error('Could not update stock.')
  }
}
