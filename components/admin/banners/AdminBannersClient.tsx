'use client'

import React, { useMemo, useState } from 'react'
import { deleteBanner } from '@/lib/banners'
import type { Banner } from '@/lib/banners'
import { PlusIcon, AlertIcon, CheckCircleIcon } from '@/components/admin/icons'
import { BannersTable } from './BannersTable'
import { BannerFormModal } from './BannerFormModal'
import { DeleteBannerDialog } from './DeleteBannerDialog'

interface AdminBannersClientProps {
  initialBanners: Banner[]
}

type Feedback = { type: 'success' | 'error'; message: string } | null
type FormTarget = { banner: Banner | null } | null

export function AdminBannersClient({ initialBanners }: AdminBannersClientProps) {
  const [banners, setBanners] = useState(initialBanners)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [formTarget, setFormTarget] = useState<FormTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)),
    [banners]
  )
  const nextDisplayOrder = useMemo(() => banners.reduce((max, b) => Math.max(max, b.displayOrder), 0) + 1, [banners])

  function handleSaved(banner: Banner, mode: 'create' | 'edit') {
    setBanners((prev) => (mode === 'create' ? [...prev, banner] : prev.map((b) => (b.id === banner.id ? banner : b))))
    setFeedback({ type: 'success', message: `“${banner.title}” was ${mode === 'create' ? 'added' : 'updated'}.` })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setIsDeleting(true)
    try {
      await deleteBanner(target.id)
      setBanners((prev) => prev.filter((b) => b.id !== target.id))
      setFeedback({ type: 'success', message: `“${target.title}” was deleted.` })
      setDeleteTarget(null)
    } catch {
      setFeedback({ type: 'error', message: `Couldn't delete “${target.title}”. Please try again.` })
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">Banners</h1>
          <p className="text-sm font-sans text-text-secondary mt-1 max-w-xl">
            Manage homepage banners and promotional content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget({ banner: null })}
          className="inline-flex items-center gap-1.5 h-11 px-6 text-sm font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 shrink-0"
        >
          <PlusIcon className="w-3.5 h-3.5" /> Add Banner
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={[
            'border rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans',
            feedback.type === 'success' ? 'bg-[#2F7A4D]/5 border-[#2F7A4D]/30 text-[#2F7A4D]' : 'bg-sale/5 border-sale/30 text-sale',
          ].join(' ')}
        >
          {feedback.type === 'success' ? <CheckCircleIcon className="w-4 h-4 shrink-0" /> : <AlertIcon className="w-4 h-4 shrink-0" />}
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

      <p className="text-xs font-sans text-text-secondary" aria-live="polite">
        {sortedBanners.length} banner{sortedBanners.length === 1 ? '' : 's'}
      </p>

      <BannersTable
        banners={sortedBanners}
        totalCount={banners.length}
        onClearFilters={() => {}}
        onEdit={(banner) => setFormTarget({ banner })}
        onRequestDelete={setDeleteTarget}
      />

      {formTarget && (
        <BannerFormModal
          key={formTarget.banner?.id ?? 'new'}
          banner={formTarget.banner}
          nextDisplayOrder={nextDisplayOrder}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      <DeleteBannerDialog
        banner={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
