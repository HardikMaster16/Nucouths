'use client'

import React from 'react'
import { PencilIcon, TrashIcon, CouponsIcon } from '@/components/admin/icons'
import type { AdminCouponRow, CouponStatus } from '@/lib/admin/coupons'

interface CouponsTableProps {
  coupons: AdminCouponRow[]
  totalCount: number
  onClearFilters: () => void
  onEdit: (coupon: AdminCouponRow) => void
  onRequestDelete: (coupon: AdminCouponRow) => void
}

const STATUS_CONFIG: Record<CouponStatus, string> = {
  Active: 'text-[#2F7A4D] border-[#2F7A4D]/30 bg-[#2F7A4D]/5',
  Scheduled: 'text-[#B45309] border-[#B45309]/30 bg-[#B45309]/5',
  Expired: 'text-text-secondary border-border bg-surface',
  Disabled: 'text-sale border-sale/30 bg-sale/5',
}

function StatusBadge({ status }: { status: CouponStatus }) {
  return (
    <span className={['inline-flex items-center text-xs font-sans font-semibold px-2 py-1 rounded-sm border', STATUS_CONFIG[status]].join(' ')}>
      {status}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <CouponsIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No coupons yet</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        Add your first coupon to start offering discounts at checkout.
      </p>
    </div>
  )
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <CouponsIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No matching coupons</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        No coupons match your search and filters. Try adjusting or clearing them.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-1 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        Clear Filters
      </button>
    </div>
  )
}

const iconButtonClasses =
  'relative inline-flex items-center justify-center w-7 h-7 rounded-sm text-text-primary bg-transparent hover:bg-surface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1'

export function CouponsTable({ coupons, totalCount, onClearFilters, onEdit, onRequestDelete }: CouponsTableProps) {
  if (totalCount === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <EmptyState />
      </div>
    )
  }

  if (coupons.length === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <NoResultsState onClearFilters={onClearFilters} />
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-sm overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border text-left bg-surface/60">
              <th scope="col" className="py-3 pl-4 pr-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Code</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Discount</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Type</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">Usage</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">Valid From</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">Expires</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Status</th>
              <th scope="col" className="py-3 pl-3 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-surface/40 transition-colors duration-100">
                <td className="py-2.5 pl-4 pr-3 font-mono font-medium text-text-primary whitespace-nowrap">{coupon.code}</td>
                <td className="py-2.5 px-3 text-text-primary font-medium whitespace-nowrap">{coupon.discountValueFormatted}</td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{coupon.typeLabel}</td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{coupon.usageLabel}</td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{coupon.startDateFormatted}</td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{coupon.expiryDateFormatted ?? 'No expiry'}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <StatusBadge status={coupon.status} />
                </td>
                <td className="py-2.5 pl-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${coupon.code}`}
                      onClick={() => onEdit(coupon)}
                      className={iconButtonClasses}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${coupon.code}`}
                      onClick={() => onRequestDelete(coupon)}
                      className={`${iconButtonClasses} hover:text-sale`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards, not a squeezed table */}
      <ul className="md:hidden divide-y divide-border">
        {coupons.map((coupon) => (
          <li key={coupon.id} className="p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-sans font-mono font-medium text-text-primary">{coupon.code}</p>
                <p className="text-xs font-sans text-text-secondary mt-0.5">
                  {coupon.discountValueFormatted} · {coupon.typeLabel}
                </p>
              </div>
              <StatusBadge status={coupon.status} />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-sans text-text-secondary">
              <span>{coupon.usageLabel}</span>
              <span>{coupon.startDateFormatted} – {coupon.expiryDateFormatted ?? 'No expiry'}</span>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border/70 -mx-4 px-4 mt-1">
              <button
                type="button"
                onClick={() => onEdit(coupon)}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <PencilIcon className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(coupon)}
                aria-label={`Delete ${coupon.code}`}
                className="w-9 h-9 shrink-0 flex items-center justify-center text-text-secondary hover:text-sale bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
