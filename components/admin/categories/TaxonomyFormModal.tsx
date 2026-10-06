'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { AlertIcon } from '@/components/admin/icons'
import {
  createInitialTaxonomyForm,
  createTaxonomyEntry,
  updateTaxonomyEntry,
  hasTaxonomyFormErrors,
  validateTaxonomyForm,
  slugify,
  TaxonomyValidationError,
} from '@/lib/admin/taxonomy'
import type { TaxonomyFormValues, TaxonomyKind, TaxonomyRow, TaxonomyStatus } from '@/lib/admin/taxonomy'

interface TaxonomyFormModalProps {
  kind: TaxonomyKind
  /** null → create a new entry; set → edit this one. */
  row: TaxonomyRow | null
  onClose: () => void
  onSaved: (row: TaxonomyRow, mode: 'create' | 'edit') => void
}

function rowToFormValues(row: TaxonomyRow): TaxonomyFormValues {
  return {
    name: row.name,
    slug: row.slug,
    slugTouchedByUser: true,
    description: row.description ?? '',
    status: row.status,
  }
}

export function TaxonomyFormModal({ kind, row, onClose, onSaved }: TaxonomyFormModalProps) {
  const mode = row ? 'edit' : 'create'
  const [values, setValues] = useState<TaxonomyFormValues>(() => (row ? rowToFormValues(row) : createInitialTaxonomyForm()))
  const [touched, setTouched] = useState<{ name?: boolean; slug?: boolean }>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // The parent (AdminCategoriesClient) mounts a fresh instance of this
  // component per open — switching from "Add Category" to "Edit Category"
  // unmounts and remounts rather than reusing one, so there's no cross-open
  // reset effect needed; useState's initializer above is the only reset.

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => nameInputRef.current?.focus(), 80)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, input, textarea, select')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; isSubmitting toggles Escape behaviour
  }, [isSubmitting])

  const errors = useMemo(() => validateTaxonomyForm(kind, values, row?.id), [kind, values, row?.id])
  const isFormValid = !hasTaxonomyFormErrors(errors)

  function handleNameChange(value: string) {
    setValues((prev) => ({
      ...prev,
      name: value,
      slug: prev.slugTouchedByUser ? prev.slug : slugify(value),
    }))
    if (submitError) setSubmitError(null)
  }

  function handleSlugChange(value: string) {
    setValues((prev) => ({ ...prev, slug: slugify(value), slugTouchedByUser: true }))
    if (submitError) setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    setTouched({ name: true, slug: true })
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const saved = row ? await updateTaxonomyEntry(kind, row, values) : await createTaxonomyEntry(kind, values)
      onSaved(saved, mode)
      onClose()
    } catch (err) {
      if (err instanceof TaxonomyValidationError) {
        setSubmitError(err.errors.slug ?? err.errors.name ?? 'Please review the highlighted fields and try again.')
      } else {
        setSubmitError("Couldn't save this — please try again.")
      }
      setIsSubmitting(false)
    }
  }

  const kindLabel = kind === 'category' ? 'Category' : 'Collection'
  const titleId = `taxonomy-modal-title-${kind}`
  const errorFor = (field: 'name' | 'slug') => (touched[field] || hasAttemptedSubmit ? errors[field] : undefined)
  const invalid = (field: 'name' | 'slug') => !!errorFor(field)

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:top-1/2 w-full sm:w-[440px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-sm shadow-card"
      >
        <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
          <h2 id={titleId} className="font-display text-xl text-text-primary">
            {mode === 'create' ? `Add ${kindLabel}` : `Edit ${kindLabel}`}
          </h2>

          {submitError && (
            <div role="alert" className="border border-sale/30 bg-sale/5 text-sale rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans">
              <AlertIcon className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <FormField label="Name" htmlFor="taxonomy-name" required error={errorFor('name')}>
              <input
                ref={nameInputRef}
                id="taxonomy-name"
                name="name"
                type="text"
                required
                placeholder={kind === 'category' ? 'Women' : 'Resort Edit'}
                value={values.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                aria-invalid={invalid('name')}
                className={fieldInputClass(invalid('name'))}
              />
            </FormField>

            <FormField label="Slug" htmlFor="taxonomy-slug" required error={errorFor('slug')}>
              <input
                id="taxonomy-slug"
                name="slug"
                type="text"
                required
                placeholder={kind === 'category' ? 'women' : 'resort-edit'}
                value={values.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, slug: true }))}
                aria-invalid={invalid('slug')}
                className={fieldInputClass(invalid('slug')) + ' font-mono text-[13px]'}
              />
            </FormField>

            {kind === 'collection' && (
              <FormField label="Description" htmlFor="taxonomy-description">
                <textarea
                  id="taxonomy-description"
                  name="description"
                  rows={3}
                  placeholder="A short description shown on the collection page…"
                  value={values.description}
                  onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-sm border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus:border-text-primary resize-y"
                />
              </FormField>
            )}

            <FormField label="Status" htmlFor="taxonomy-status">
              <select
                id="taxonomy-status"
                name="status"
                value={values.status}
                onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value as TaxonomyStatus }))}
                className={fieldInputClass(false)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="h-10 px-5 inline-flex items-center gap-2 text-xs font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              )}
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Add' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
