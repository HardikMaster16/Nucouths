// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Inventory Row Shape
//
// Stock is a per-variant concept (lib/types.ts's ProductVariant.stock), and
// ProductVariant.stock is the single source of truth for it — never a
// second, separately-tracked value. "Low stock" is
// lib/product-detail-data.ts's variantStockState — the one centralized
// threshold every stock-aware surface in this app (PDP, dashboard, admin)
// already shares.
//
// This file holds only the InventoryRow shape itself. Reads/writes are
// Prisma-backed (lib/admin/inventory.db.ts / lib/admin/inventory.actions.ts)
// — imported here, not redefined, so the UI needs no changes:
//
//   Inventory UI → inventory.db.ts / inventory.actions.ts (Prisma) → PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────

import type { StockState } from '@/lib/types'

export interface InventoryRow {
  productId: string
  productName: string
  productSlug: string
  category: string
  categoryLabel: string
  variantId: string
  sku: string
  color: string
  colorHex: string
  size: string
  price: number
  priceFormatted: string
  currency: string
  stock: number
  stockState: StockState
}
