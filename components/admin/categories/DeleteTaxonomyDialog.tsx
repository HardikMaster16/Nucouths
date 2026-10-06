'use client'

import React, { useEffect, useRef } from 'react'
import type { TaxonomyKind, TaxonomyRow } from '@/lib/admin/taxonomy'

interface DeleteTaxonomyDialogProps {
  kind: TaxonomyKind
  row: TaxonomyRow | null
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Same focus-trap/Escape/backdrop pattern as
 *  components/admin/products/DeleteProductDialog.tsx. The caller
 *  (AdminCategoriesClient) only opens this for a row whose productCount is
 *  already 0 — TaxonomyTable disables the delete action otherwise — so this
 *  dialog only ever needs the single confirm path. */
export function DeleteTaxonomyDialog({ kind, row, isDeleting, onConfirm, onCancel }: DeleteTaxonomyDialogProps) {
  const isOpen = row !== null
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => cancelRef.current?.focus(), 80)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel()

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only on open/close and isDeleting toggles Escape behaviour
  }, [isOpen, isDeleting])

  if (!isOpen) return null

  const kindLabel = kind === 'category' ? 'category' : 'collection'

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !isDeleting && onCancel()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-taxonomy-title"
        aria-describedby="delete-taxonomy-description"
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:top-1/2 w-full sm:w-[420px] bg-white rounded-sm shadow-card"
      >
        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 id="delete-taxonomy-title" className="font-display text-xl text-text-primary">
              Delete {kindLabel}?
            </h2>
            <p id="delete-taxonomy-description" className="text-sm font-sans text-text-secondary mt-2">
              This will remove <span className="font-medium text-text-primary">{row.name}</span> from{' '}
              {kindLabel === 'category' ? 'the category list' : 'the collection list'}. This cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="h-9 px-4 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              aria-busy={isDeleting}
              className="h-9 px-4 inline-flex items-center gap-2 text-xs font-sans font-medium uppercase tracking-wide text-white bg-sale hover:bg-sale/90 rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sale focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting && (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              )}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
