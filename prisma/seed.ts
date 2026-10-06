// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Database Seed
//
// Populates PostgreSQL from the EXISTING frontend mock data — never a second,
// invented dataset. Every source here is a module the app already reads at
// runtime:
//   - lib/mock-data.ts + lib/product-detail-data.ts → products, images, variants
//   - lib/collections.ts                            → named collections
//   - lib/admin/mock-data.ts                         → fictional customers + orders
//   - lib/auth/mock-auth-service.ts                  → the storefront demo account
//   - lib/services/mock-order-service.ts             → the demo account's own orders
//   - lib/admin/coupons.ts                           → seed coupons
//   - lib/banners.ts                                 → seed banners
//   - lib/admin/settings.ts                          → seed store settings
//
// Idempotent — every write is an upsert keyed by a natural unique field
// (slug, sku, email, code, orderNumber, "singleton"), so re-running this
// script updates existing rows instead of duplicating or destroying data.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import type {
  OrderStatus as PrismaOrderStatus,
  PaymentMethod as PrismaPaymentMethod,
  OrderPaymentStatus as PrismaOrderPaymentStatus,
  CouponType as PrismaCouponType,
} from '@prisma/client'

import { prisma } from '../lib/prisma'
import { products } from '../lib/mock-data'
import { getProductDetail } from '../lib/product-detail-data'
import { COLLECTIONS } from '../lib/collections'
import { ADMIN_MOCK_CUSTOMERS, ADMIN_MOCK_ORDERS } from '../lib/admin/mock-data'
import { DEMO_USER, DEMO_USER_ID } from '../lib/auth/mock-auth-service'
import { getOrdersForUser } from '../lib/services/mock-order-service'
import { getSeedCoupons } from '../lib/admin/coupons'
import { getSeedBanners } from '../lib/banners'
import { getSeedStoreSettings, getSeedStorefrontSettings, getSeedOrderSettings } from '../lib/admin/settings'
import type { PlacedOrder } from '../lib/order-storage'
import type { OrderStatus, OrderPaymentStatus, PaymentMethod } from '../lib/types'

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value
}

/** Frontend OrderStatus strings → the Prisma enum's identifier names. Only
 *  "Out for Delivery" differs (it's mapped back to that exact string at the
 *  DB level via @map in schema.prisma). */
const ORDER_STATUS_MAP: Record<OrderStatus, PrismaOrderStatus> = {
  Confirmed: 'Confirmed',
  Processing: 'Processing',
  Shipped: 'Shipped',
  'Out for Delivery': 'OutForDelivery',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
}

const PAYMENT_METHOD_MAP: Record<PaymentMethod, PrismaPaymentMethod> = {
  upi: 'upi',
  card: 'card',
  netbanking: 'netbanking',
  cod: 'cod',
}

/// Identity map (values match exactly, no @map involved) — kept as an
/// explicit Record anyway, same style as the two maps above, so every seed
/// order's payment intent is a deliberate, typo-checked choice rather than
/// an implicit cast.
const PAYMENT_STATUS_MAP: Record<OrderPaymentStatus, PrismaOrderPaymentStatus> = {
  Pending: 'Pending',
  Paid: 'Paid',
  Failed: 'Failed',
  Refunded: 'Refunded',
}

async function seedCategories(): Promise<Map<string, string>> {
  const idByCategory = new Map<string, string>()
  const seen = new Set<string>()

  for (const p of products) {
    if (seen.has(p.category)) continue
    seen.add(p.category)

    const row = await prisma.category.upsert({
      where: { slug: p.category },
      update: { name: capitalize(p.category) },
      create: { slug: p.category, name: capitalize(p.category), status: 'Active' },
    })
    idByCategory.set(p.category, row.id)
  }

  console.log(`Seeded ${idByCategory.size} categories.`)
  return idByCategory
}

async function seedCollections(): Promise<Map<string, string>> {
  const idByCollectionName = new Map<string, string>()

  for (const c of COLLECTIONS) {
    if (c.criteria.type !== 'collection') continue // badge-type "collections" (New In, Sale) aren't real Collection rows — see lib/collections.ts

    const row = await prisma.collection.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { slug: c.slug, name: c.name, description: c.description, status: 'Active' },
    })
    idByCollectionName.set(c.criteria.collection, row.id)
  }

  console.log(`Seeded ${idByCollectionName.size} collections.`)
  return idByCollectionName
}

interface ProductLookup {
  productIdBySlug: Map<string, string>
  variantIdBySku: Map<string, string>
}

async function seedProducts(categoryIds: Map<string, string>, collectionIds: Map<string, string>): Promise<ProductLookup> {
  const productIdBySlug = new Map<string, string>()
  const variantIdBySku = new Map<string, string>()

  for (const p of products) {
    const detail = getProductDetail(p.slug)
    if (!detail) continue

    const product = await prisma.product.upsert({
      where: { slug: detail.slug },
      update: {
        name: detail.name,
        brand: detail.brand,
        categoryId: categoryIds.get(detail.category),
        subcategory: detail.subcategory,
        collectionId: detail.collection ? collectionIds.get(detail.collection) : undefined,
        price: detail.price,
        compareAtPrice: detail.compareAtPrice,
        currency: detail.currency,
        description: detail.description,
        shortDescription: detail.shortDescription,
        details: detail.details,
        materials: detail.materials,
        care: detail.care,
        shipping: detail.shipping,
        returns: detail.returns,
        badge: detail.badge,
        tags: detail.tags ?? [],
        inStock: detail.inStock,
      },
      create: {
        slug: detail.slug,
        name: detail.name,
        brand: detail.brand,
        categoryId: categoryIds.get(detail.category),
        subcategory: detail.subcategory,
        collectionId: detail.collection ? collectionIds.get(detail.collection) : undefined,
        price: detail.price,
        compareAtPrice: detail.compareAtPrice,
        currency: detail.currency,
        description: detail.description,
        shortDescription: detail.shortDescription,
        details: detail.details,
        materials: detail.materials,
        care: detail.care,
        shipping: detail.shipping,
        returns: detail.returns,
        badge: detail.badge,
        tags: detail.tags ?? [],
        inStock: detail.inStock,
      },
    })
    productIdBySlug.set(detail.slug, product.id)

    // Images — replace-on-reseed so a mock-data image swap is reflected,
    // rather than accumulating duplicates on every run.
    await prisma.productImage.deleteMany({ where: { productId: product.id } })
    await prisma.productImage.createMany({
      data: detail.images.map((img, index) => ({
        productId: product.id,
        src: img.src,
        alt: img.alt,
        isPrimary: index === 0,
        isHover: detail.hoverImage?.src === img.src,
        sortOrder: index,
      })),
    })

    for (const variant of detail.variants) {
      const row = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: product.id,
          color: variant.color,
          colorHex: variant.colorHex,
          size: variant.size,
          stock: variant.stock,
          priceOverride: variant.priceOverride,
        },
        create: {
          productId: product.id,
          sku: variant.sku,
          color: variant.color,
          colorHex: variant.colorHex,
          size: variant.size,
          stock: variant.stock,
          priceOverride: variant.priceOverride,
        },
      })
      variantIdBySku.set(variant.sku, row.id)
    }
  }

  console.log(`Seeded ${productIdBySlug.size} products (${variantIdBySku.size} variants).`)
  return { productIdBySlug, variantIdBySku }
}

async function seedUsers(): Promise<Map<string, string>> {
  const userIdByMockId = new Map<string, string>()

  const demo = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { firstName: DEMO_USER.firstName, lastName: DEMO_USER.lastName, phone: DEMO_USER.phone },
    create: {
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      phone: DEMO_USER.phone,
      role: 'customer',
    },
  })
  userIdByMockId.set(DEMO_USER_ID, demo.id)

  for (const customer of ADMIN_MOCK_CUSTOMERS) {
    const [firstName, ...rest] = customer.name.split(' ')
    const lastName = rest.join(' ') || firstName
    const row = await prisma.user.upsert({
      where: { email: customer.email },
      update: { firstName, lastName },
      create: { email: customer.email, firstName, lastName, role: 'customer' },
    })
    userIdByMockId.set(customer.id, row.id)
  }

  console.log(`Seeded ${userIdByMockId.size} users.`)
  return userIdByMockId
}

async function seedCoupons(): Promise<Map<string, string>> {
  const couponIdByCode = new Map<string, string>()

  for (const coupon of getSeedCoupons()) {
    const row = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type as PrismaCouponType,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimit: coupon.usageLimit,
        usageCount: coupon.usageCount,
        startDate: new Date(coupon.startDate),
        expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate) : null,
        enabled: coupon.enabled,
        currency: coupon.currency,
      },
      create: {
        code: coupon.code,
        type: coupon.type as PrismaCouponType,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimit: coupon.usageLimit,
        usageCount: coupon.usageCount,
        startDate: new Date(coupon.startDate),
        expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate) : null,
        enabled: coupon.enabled,
        currency: coupon.currency,
      },
    })
    couponIdByCode.set(coupon.code, row.id)
  }

  console.log(`Seeded ${couponIdByCode.size} coupons.`)
  return couponIdByCode
}

async function seedBanners(): Promise<void> {
  let count = 0
  for (const banner of getSeedBanners()) {
    await prisma.banner.upsert({
      where: { id: banner.id },
      update: {
        title: banner.title,
        subtitle: banner.subtitle,
        desktopImage: banner.desktopImage,
        mobileImage: banner.mobileImage,
        buttonText: banner.buttonText,
        buttonLink: banner.buttonLink,
        position: banner.position,
        status: banner.status,
        displayOrder: banner.displayOrder,
        startsAt: banner.startsAt ? new Date(banner.startsAt) : null,
        endsAt: banner.endsAt ? new Date(banner.endsAt) : null,
      },
      create: {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        desktopImage: banner.desktopImage,
        mobileImage: banner.mobileImage,
        buttonText: banner.buttonText,
        buttonLink: banner.buttonLink,
        position: banner.position,
        status: banner.status,
        displayOrder: banner.displayOrder,
        startsAt: banner.startsAt ? new Date(banner.startsAt) : null,
        endsAt: banner.endsAt ? new Date(banner.endsAt) : null,
      },
    })
    count++
  }
  console.log(`Seeded ${count} banners.`)
}

async function seedStoreSettings(): Promise<void> {
  const store = getSeedStoreSettings()
  const storefront = getSeedStorefrontSettings()
  const order = getSeedOrderSettings()

  await prisma.storeSettings.upsert({
    where: { id: 'singleton' },
    update: {
      storeName: store.storeName,
      storeEmail: store.storeEmail,
      storePhone: store.storePhone,
      storeAddress: store.storeAddress,
      currency: store.currency,
      timeZone: store.timeZone,
      storeStatus: storefront.storeStatus,
      lowStockThreshold: storefront.lowStockThreshold,
      defaultShippingCharge: storefront.defaultShippingCharge,
      freeShippingThreshold: storefront.freeShippingThreshold,
      orderPrefix: order.orderPrefix,
    },
    create: {
      id: 'singleton',
      storeName: store.storeName,
      storeEmail: store.storeEmail,
      storePhone: store.storePhone,
      storeAddress: store.storeAddress,
      currency: store.currency,
      timeZone: store.timeZone,
      storeStatus: storefront.storeStatus,
      lowStockThreshold: storefront.lowStockThreshold,
      defaultShippingCharge: storefront.defaultShippingCharge,
      freeShippingThreshold: storefront.freeShippingThreshold,
      orderPrefix: order.orderPrefix,
    },
  })
  console.log('Seeded store settings.')
}

async function seedOrders(
  userIds: Map<string, string>,
  productLookup: ProductLookup,
  couponIds: Map<string, string>
): Promise<void> {
  const allOrders: PlacedOrder[] = [...ADMIN_MOCK_ORDERS, ...getOrdersForUser(DEMO_USER_ID)]
  let count = 0

  for (const order of allOrders) {
    const userId = order.userId ? userIds.get(order.userId) : undefined
    const addr = order.shippingAddress

    // Every seed/demo order must state its own intended payment outcome —
    // never left to Order.paymentStatus's schema default (that's exactly
    // the ambiguity scripts/repair-legacy-order-payment-status.ts existed
    // to clean up). lib/admin/mock-data.ts's order() helper and lib/
    // services/mock-order-service.ts's DEMO_SEED_ORDERS both already make
    // this a required field; this throw only guards against a future seed
    // source that forgets to.
    if (!order.paymentStatus) {
      throw new Error(`seed order ${order.orderNumber} has no paymentStatus — every seed order must set one explicitly.`)
    }
    const paymentStatus = PAYMENT_STATUS_MAP[order.paymentStatus]
    const paidAt = order.paidAt ? new Date(order.paidAt) : null

    const created = await prisma.order.upsert({
      where: { orderNumber: order.orderNumber },
      update: {
        userId,
        status: ORDER_STATUS_MAP[order.status],
        paymentStatus,
        paymentMethod: PAYMENT_METHOD_MAP[order.paymentMethod],
        currency: order.currency,
        originalSubtotal: order.totals.originalSubtotal,
        discount: order.totals.discount,
        payableSubtotal: order.totals.payableSubtotal,
        shipping: order.totals.shipping,
        total: order.totals.total,
        contactEmail: order.contact.email,
        contactPhone: order.contact.phone,
        shipFirstName: addr.firstName,
        shipLastName: addr.lastName,
        shipAddress: addr.address,
        shipApartment: addr.apartment,
        shipCity: addr.city,
        shipState: addr.state,
        shipPinCode: addr.pinCode,
        shipCountry: addr.country,
        shipPhone: addr.phone,
        placedAt: new Date(order.placedAt),
        paidAt,
      },
      create: {
        orderNumber: order.orderNumber,
        userId,
        status: ORDER_STATUS_MAP[order.status],
        paymentStatus,
        paymentMethod: PAYMENT_METHOD_MAP[order.paymentMethod],
        currency: order.currency,
        originalSubtotal: order.totals.originalSubtotal,
        discount: order.totals.discount,
        payableSubtotal: order.totals.payableSubtotal,
        shipping: order.totals.shipping,
        total: order.totals.total,
        contactEmail: order.contact.email,
        contactPhone: order.contact.phone,
        shipFirstName: addr.firstName,
        shipLastName: addr.lastName,
        shipAddress: addr.address,
        shipApartment: addr.apartment,
        shipCity: addr.city,
        shipState: addr.state,
        shipPinCode: addr.pinCode,
        shipCountry: addr.country,
        shipPhone: addr.phone,
        placedAt: new Date(order.placedAt),
        paidAt,
      },
    })

    // Items — replace-on-reseed, same reasoning as product images above.
    await prisma.orderItem.deleteMany({ where: { orderId: created.id } })
    await prisma.orderItem.createMany({
      data: order.items.map((item) => ({
        orderId: created.id,
        productId: productLookup.productIdBySlug.get(item.slug),
        variantId: productLookup.variantIdBySku.get(
          // CartItem doesn't carry a SKU directly — resolve it via the same
          // (slug, color, size) lookup lib/admin/orders.ts's toItemRow uses.
          getProductDetail(item.slug)?.variants.find((v) => v.color === item.color && v.size === item.size)?.sku ?? ''
        ),
        productName: item.name,
        productSlug: item.slug,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.price,
        compareAtPrice: item.compareAtPrice,
        itemTotal: item.price * item.quantity,
        imageSrc: item.image.src,
        imageAlt: item.image.alt,
      })),
    })

    count++
  }

  console.log(`Seeded ${count} orders.`)
  void couponIds // reserved for once orders track an applied coupon (none of the seed orders currently do)
}

async function main() {
  const categoryIds = await seedCategories()
  const collectionIds = await seedCollections()
  const productLookup = await seedProducts(categoryIds, collectionIds)
  const userIds = await seedUsers()
  const couponIds = await seedCoupons()
  await seedBanners()
  await seedStoreSettings()
  await seedOrders(userIds, productLookup, couponIds)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
