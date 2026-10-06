'use client'

import React, { useMemo, useState } from 'react'
import { deleteCoupon } from '@/lib/admin/coupons'
import type { AdminCouponRow } from '@/lib/admin/coupons'
import { PlusIcon, AlertIcon, CheckCircleIcon } from '@/components/admin/icons'
import { CouponsToolbar } from './CouponsToolbar'
import type { CouponStatusFilter } from './CouponsToolbar'
import { CouponsTable } from './CouponsTable'
import { CouponFormModal } from './CouponFormModal'
import { DeleteCouponDialog } from './DeleteCouponDialog'

interface AdminCouponsClientProps {
  initialCoupons: AdminCouponRow[]
}

type Feedback = { type: 'success' | 'error'; message: string } | null
type FormTarget = { coupon: AdminCouponRow | null } | null

export function AdminCouponsClient({ initialCoupons }: AdminCouponsClientProps) {
  const [coupons, setCoupons] = useState(initialCoupons)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CouponStatusFilter>('all')
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [formTarget, setFormTarget] = useState<FormTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCouponRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const hasActiveFilters = search.trim() !== '' || status !== 'all'

  function clearFilters() {
    setSearch('')
    setStatus('all')
  }

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase()
    return coupons.filter((coupon) => {
      if (query && !coupon.code.toLowerCase().includes(query)) return false
      if (status !== 'all' && coupon.status !== status) return false
      return true
    })
  }, [coupons, search, status])

  function handleSaved(coupon: AdminCouponRow, mode: 'create' | 'edit') {
    setCoupons((prev) => (mode === 'create' ? [coupon, ...prev] : prev.map((c) => (c.id === coupon.id ? coupon : c))))
    setFeedback({ type: 'success', message: `“${coupon.code}” was ${mode === 'create' ? 'added' : 'updated'}.` })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget

    setIsDeleting(true)
    try {
      await deleteCoupon(target.id)
      setCoupons((prev) => prev.filter((c) => c.id !== target.id))
      setFeedback({ type: 'success', message: `“${target.code}” was deleted.` })
      setDeleteTarget(null)
    } catch {
      setFeedback({ type: 'error', message: `Couldn't delete “${target.code}”. Please try again.` })
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
            Coupons & Discounts
          </h1>
          <p className="text-sm font-sans text-text-secondary mt-1 max-w-xl">
            Create and manage discount codes customers can apply at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget({ coupon: null })}
          className="inline-flex items-center gap-1.5 h-11 px-6 text-sm font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 shrink-0"
        >
          <PlusIcon className="w-3.5 h-3.5" /> Add Coupon
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={[
            'border rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans',
            feedback.type === 'success'
              ? 'bg-[#2F7A4D]/5 border-[#2F7A4D]/30 text-[#2F7A4D]'
              : 'bg-sale/5 border-sale/30 text-sale',
          ].join(' ')}
        >
          {feedback.type === 'success' ? (
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
          ) : (
            <AlertIcon className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 text-xs font-sans font-medium uppercase tracking-wide focus-visible:outline-none"
          >
            Dismiss
          </button>
        </div>
      )}

      <CouponsToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <p className="text-xs font-sans text-text-secondary" aria-live="polite">
        {filteredCoupons.length} of {coupons.length} coupons
      </p>

      <CouponsTable
        coupons={filteredCoupons}
        totalCount={coupons.length}
        onClearFilters={clearFilters}
        onEdit={(coupon) => setFormTarget({ coupon })}
        onRequestDelete={setDeleteTarget}
      />

      {formTarget && (
        <CouponFormModal
          key={formTarget.coupon?.id ?? 'new'}
          coupon={formTarget.coupon}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <DeleteCouponDialog
        coupon={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
