import React from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/cart-pricing'
import { FULFILLMENT_STAGES } from '@/lib/admin/orders'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderStatusEditor } from './OrderStatusEditor'
import { OrderTotalsBreakdown } from '@/components/cart/OrderTotalsBreakdown'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import type { AdminOrderDetail, AdminOrderItemRow } from '@/lib/admin/orders'

const backLinkClasses =
  'text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded'

const secondaryButtonClasses =
  'inline-flex items-center h-11 px-5 text-sm font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary'

interface AdminOrderDetailViewProps {
  order: AdminOrderDetail
}

// ─── Fulfillment timeline ────────────────────────────────────────────────
// Same stage sequence and "reached vs upcoming" logic as
// components/account/OrderDetailClient.tsx's private OrderTimeline — kept as
// its own small component here (rather than shared) since it's purely
// presentational and the admin page needs no interactivity from it.

function FulfillmentTimeline({ order }: { order: AdminOrderDetail }) {
  if (order.status === 'Cancelled') {
    return (
      <div>
        <p className="text-sm font-sans font-semibold text-text-primary mb-1">Order Cancelled</p>
        <p className="text-sm font-sans text-text-secondary">This order has been cancelled.</p>
      </div>
    )
  }

  const currentIndex = FULFILLMENT_STAGES.indexOf(order.status)

  return (
    <ol>
      {FULFILLMENT_STAGES.map((stage, i) => {
        const reached = currentIndex >= 0 && i <= currentIndex
        const isLast = i === FULFILLMENT_STAGES.length - 1
        return (
          <li key={stage} className="flex gap-3" aria-current={i === currentIndex ? 'step' : undefined}>
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className={['w-2.5 h-2.5 mt-1 rounded-full shrink-0', reached ? 'bg-text-primary' : 'bg-border'].join(' ')} />
              {!isLast && (
                <span className={['w-px flex-1 min-h-[24px]', i < currentIndex ? 'bg-text-primary' : 'bg-border'].join(' ')} />
              )}
            </div>
            <div className={isLast ? 'pb-0' : 'pb-5'}>
              <p
                className={[
                  'text-xs font-sans tracking-wide uppercase',
                  reached ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary',
                ].join(' ')}
              >
                {stage === 'Confirmed' ? 'Order Confirmed' : stage}
              </p>
              {stage === 'Confirmed' && (
                <p className="text-2xs font-sans text-text-secondary mt-0.5">{order.placedAtFormatted}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Order items ────────────────────────────────────────────────────────────

function OrderItemRow({ item, currency }: { item: AdminOrderItemRow; currency: string }) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href={`/products/${item.slug}`}
        aria-label={`View ${item.name}`}
        className="relative shrink-0 w-14 h-[70px] sm:w-16 sm:h-20 overflow-hidden bg-surface rounded-sm"
      >
        <ImageWithFallback image={item.image} fill sizes="64px" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${item.slug}`}
          className="text-sm font-sans font-medium text-text-primary hover:underline underline-offset-2 decoration-text-secondary/50 transition-colors duration-150"
        >
          {item.name}
        </Link>
        <p className="text-xs font-sans text-text-secondary mt-1 font-mono">{item.sku ?? '—'}</p>
        <p className="text-xs font-sans text-text-secondary mt-0.5">
          Colour: {item.color} &nbsp;·&nbsp; Size: {item.size} &nbsp;·&nbsp; Qty: {item.quantity}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-sans text-text-secondary">{formatPrice(item.price, currency)} each</p>
        <p className="text-sm font-sans font-semibold text-text-primary mt-0.5">
          {formatPrice(item.lineTotal, currency)}
        </p>
      </div>
    </div>
  )
}

export function AdminOrderDetailView({ order }: AdminOrderDetailViewProps) {
  const addr = order.shippingAddress

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs font-sans text-text-secondary flex-wrap">
          <li>
            <Link href="/admin" className="hover:text-text-primary transition-colors duration-150">
              Admin
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">›</li>
          <li>
            <Link href="/admin/orders" className="hover:text-text-primary transition-colors duration-150">
              Orders
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">›</li>
          <li aria-current="page" className="text-text-primary font-medium">
            {order.orderNumber}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/orders" className={backLinkClasses}>
            ← Back to Orders
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mt-2">
            Order #{order.orderNumber}
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <OrderStatusBadge status={order.status} />
            <span className="text-xs font-sans text-text-secondary">Placed on {order.placedAtFormatted}</span>
          </div>
        </div>

        <Link href="/admin/orders" className={secondaryButtonClasses}>
          Back to Orders
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">
          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Fulfillment</h2>
            <FulfillmentTimeline order={order} />
          </section>

          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-sans font-semibold text-text-primary">Order Items</h2>
              <span className="text-xs font-sans text-text-secondary">
                {order.items.length} item{order.items.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.variantId} className="py-4 first:pt-0 last:pb-0">
                  <OrderItemRow item={item} currency={order.currency} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Secondary column ────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Order Summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm font-sans">
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Order ID</dt>
                <dd className="text-text-primary font-medium">{order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Date Placed</dt>
                <dd className="text-text-primary">{order.placedAtFormatted}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Status</dt>
                <dd><OrderStatusEditor orderNumber={order.orderNumber} status={order.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Payment Method</dt>
                <dd className="text-text-primary">{order.paymentMethodLabel}</dd>
              </div>
              <div className="col-span-2 pt-3 border-t border-border">
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Order Total</dt>
                <dd className={order.countsAsSale ? 'text-text-primary font-semibold text-lg' : 'text-text-secondary font-semibold text-lg'}>
                  {order.totalFormatted}
                </dd>
                {!order.countsAsSale && (
                  <p className="text-[11px] font-sans text-text-secondary mt-1">
                    Cancelled — excluded from sales totals.
                  </p>
                )}
              </div>
            </dl>
          </section>

          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-3">Customer</h2>
            <dl className="flex flex-col gap-2.5 text-sm font-sans">
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Name</dt>
                <dd className="text-text-primary">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Email</dt>
                <dd className="text-text-primary break-all">{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Phone</dt>
                  <dd className="text-text-primary">{order.customerPhone}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-3">Shipping Address</h2>
            <p className="text-sm font-sans text-text-primary leading-relaxed">
              {addr.firstName} {addr.lastName}
              <br />
              {addr.address}
              {addr.apartment ? `, ${addr.apartment}` : ''}
              <br />
              {addr.city}, {addr.state} {addr.pinCode}
              <br />
              {addr.country} &nbsp;·&nbsp; {addr.phone}
            </p>
          </section>

          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="font-display text-xl text-text-primary leading-tight mb-4">Pricing Summary</h2>
            <OrderTotalsBreakdown currency={order.currency} totals={order.totals} />
          </section>
        </div>
      </div>

      {/* Bottom action */}
      <div className="flex items-center justify-end pb-2">
        <Link href="/admin/orders" className={secondaryButtonClasses}>
          Back to Orders
        </Link>
      </div>
    </div>
  )
}
