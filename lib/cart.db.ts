// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Cart Reads (Prisma)
//
// Server-only. Imported only from lib/cart.actions.ts's Server Actions —
// never from a 'use client' component, so Prisma is never pulled into a
// browser bundle.
//
// Hydrates directly to lib/types.ts's CartItem shape — the same shape the
// guest/localStorage cart already uses — so lib/cart-context.tsx's
// consumers (CartClient, Header, ProductClient, CheckoutClient,
// OrderDetailClient) need no changes. Price/compareAtPrice/image are always
// read live from the current Product/ProductVariant row, never
// denormalized onto CartItem — an admin price change or stock update is
// reflected the next time the cart is read, exactly like the rest of the
// (already-migrated) storefront.
//
// CartItem's FKs are both ON DELETE CASCADE (see prisma/schema.prisma's
// module comment) — a deleted variant/product's cart rows are removed by
// Postgres itself, so this can never encounter a dangling reference to
// handle defensively.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { CartItem } from '@/lib/types'

export const cartItemWithRelations = {
  variant: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          compareAtPrice: true,
          currency: true,
          category: { select: { slug: true } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude

export type DbCartItem = Prisma.CartItemGetPayload<{ include: typeof cartItemWithRelations }>

export function dbCartItemToCartItem(row: DbCartItem): CartItem {
  const { variant } = row
  const { product } = variant
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0]

  return {
    productId: product.id,
    variantId: variant.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.slug ?? '',
    color: variant.color,
    size: variant.size,
    quantity: row.quantity,
    price: Number(variant.priceOverride ?? product.price),
    compareAtPrice: product.compareAtPrice !== null ? Number(product.compareAtPrice) : undefined,
    currency: product.currency,
    image: primaryImage ? { src: primaryImage.src, alt: primaryImage.alt } : { src: '', alt: product.name },
    stock: variant.stock,
  }
}

/** The authenticated customer's cart, oldest-added first — shaped identically
 *  to the guest/localStorage cart. */
export async function listCartItems(userId: string): Promise<CartItem[]> {
  const rows = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: cartItemWithRelations,
  })
  return rows.map(dbCartItemToCartItem)
}
