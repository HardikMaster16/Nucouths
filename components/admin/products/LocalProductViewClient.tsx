'use client'

import React from 'react'
import { AdminProductDetailView } from './AdminProductDetailView'
import { ProductNotFound } from './ProductNotFound'
import type { AdminProductRow } from '@/lib/admin/products'
import type { ProductDetail } from '@/lib/types'

interface LocalProductViewClientProps {
  /** Server-resolved Prisma product row/detail (lib/admin/products.db.ts) —
   *  the only source this view reads from. Undefined means no product with
   *  this id exists. */
  seedRow?: AdminProductRow
  seedDetail?: ProductDetail
}

export function LocalProductViewClient({ seedRow, seedDetail }: LocalProductViewClientProps) {
  if (!seedRow) return <ProductNotFound />
  return <AdminProductDetailView product={seedRow} detail={seedDetail} />
}
