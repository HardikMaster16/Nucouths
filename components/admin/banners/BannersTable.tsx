'use client'

import React from 'react'
import { PencilIcon, TrashIcon, BannersIcon } from '@/components/admin/icons'
import { computeBannerScheduleState } from '@/lib/banners'
import type { Banner, BannerScheduleState } from '@/lib/banners'

interface BannersTableProps {
  banners: Banner[]
  totalCount: number
  onClearFilters: () => void
  onEdit: (banner: Banner) => void
  onRequestDelete: (banner: Banner) => void
}

const STATE_CONFIG: Record<BannerScheduleState, string> = {
  Active: 'text-[#2F7A4D] border-[#2F7A4D]/30 bg-[#2F7A4D]/5',
  Scheduled: 'text-[#B45309] border-[#B45309]/30 bg-[#B45309]/5',
  Expired: 'text-text-secondary border-border bg-surface',
  Inactive: 'text-sale border-sale/30 bg-sale/5',
}

function StateBadge({ state }: { state: BannerScheduleState }) {
  return (
    <span className={['inline-flex items-center text-xs font-sans font-semibold px-2 py-1 rounded-sm border', STATE_CONFIG[state]].join(' ')}>
      {state}
    </span>
  )
}

function BannerThumb({ banner }: { banner: Banner }) {
  return (
    <div className="relative w-16 h-10 shrink-0 bg-surface rounded-sm overflow-hidden border border-border">
      {banner.desktopImage ? (
        // Admin-authored URLs aren't known ahead of time, so they can't go
        // through next/image's remote-pattern allowlist — an editor preview,
        // same reasoning as components/admin/products/form/ImagesSection.tsx.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner.desktopImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-secondary/40">
          <BannersIcon className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <BannersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No banners yet</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        Add your first banner to start promoting collections on the homepage.
      </p>
    </div>
  )
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <BannersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No matching banners</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        No banners match your filters. Try adjusting or clearing them.
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

const POSITION_LABELS: Record<Banner['position'], string> = { hero: 'Hero', secondary: 'Secondary' }

export function BannersTable({ banners, totalCount, onClearFilters, onEdit, onRequestDelete }: BannersTableProps) {
  if (totalCount === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <EmptyState />
      </div>
    )
  }

  if (banners.length === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <NoResultsState onClearFilters={onClearFilters} />
      </div>
    )
  }

  const now = Date.now()

  return (
    <div className="bg-white border border-border rounded-sm overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border text-left bg-surface/60">
              <th scope="col" className="py-3 pl-4 pr-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Preview</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Title</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Position</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Status</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Order</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">Start Date</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">End Date</th>
              <th scope="col" className="py-3 pl-3 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {banners.map((banner) => (
              <tr key={banner.id} className="hover:bg-surface/40 transition-colors duration-100">
                <td className="py-2.5 pl-4 pr-3">
                  <BannerThumb banner={banner} />
                </td>
                <td className="py-2.5 px-3 font-medium text-text-primary max-w-[200px] truncate">{banner.title}</td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{POSITION_LABELS[banner.position]}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <StateBadge state={computeBannerScheduleState(banner, now)} />
                </td>
                <td className="py-2.5 px-3 text-text-primary text-right">{banner.displayOrder}</td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                  {banner.startsAt ? new Date(banner.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                  {banner.endsAt ? new Date(banner.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'}
                </td>
                <td className="py-2.5 pl-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" aria-label={`Edit ${banner.title}`} onClick={() => onEdit(banner)} className={iconButtonClasses}>
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${banner.title}`}
                      onClick={() => onRequestDelete(banner)}
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
        {banners.map((banner) => (
          <li key={banner.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <BannerThumb banner={banner} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-sans font-medium text-text-primary truncate">{banner.title}</p>
                <p className="text-xs font-sans text-text-secondary mt-0.5">
                  {POSITION_LABELS[banner.position]} · Order {banner.displayOrder}
                </p>
              </div>
              <StateBadge state={computeBannerScheduleState(banner, now)} />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-sans text-text-secondary">
              <span>
                {banner.startsAt ? new Date(banner.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No start date'}
              </span>
              <span>
                {banner.endsAt ? new Date(banner.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border/70 -mx-4 px-4 mt-1">
              <button
                type="button"
                onClick={() => onEdit(banner)}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <PencilIcon className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(banner)}
                aria-label={`Delete ${banner.title}`}
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
