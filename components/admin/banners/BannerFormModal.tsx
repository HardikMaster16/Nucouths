'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { AlertIcon } from '@/components/admin/icons'
import {
  createInitialBannerForm,
  createBanner,
  updateBanner,
  bannerToFormValues,
  hasBannerFormErrors,
  validateBannerForm,
  BannerValidationError,
} from '@/lib/banners'
import { uploadBannerImageAction } from '@/lib/admin/upload-banner-image.actions'
import type { Banner, BannerFormValues, BannerPosition, BannerStatus } from '@/lib/banners'

interface BannerFormModalProps {
  /** null → create a new banner; set → edit this one. */
  banner: Banner | null
  nextDisplayOrder: number
  onClose: () => void
  onSaved: (banner: Banner, mode: 'create' | 'edit') => void
}

const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4MB — mirrors lib/admin/image-upload-core.ts's server-side cap

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key))
}

function ImagePreview({ src, isUploading }: { src: string; isUploading?: boolean }) {
  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-secondary/40 bg-surface">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }
  return (
    <div className="relative w-full h-full">
      {/* Admin-authored image URLs (pasted links, or an in-flight local
       *  blob: preview below) aren't known ahead of time, so they can't go
       *  through next/image's configured remote-pattern allowlist — an
       *  editor preview, same reasoning as components/admin/products/form/
       *  ImagesSection.tsx. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="w-full h-full object-cover" />
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

export function BannerFormModal({ banner, nextDisplayOrder, onClose, onSaved }: BannerFormModalProps) {
  const mode = banner ? 'edit' : 'create'
  const [values, setValues] = useState<BannerFormValues>(() =>
    banner ? bannerToFormValues(banner) : createInitialBannerForm(nextDisplayOrder)
  )
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<{ desktop?: string; mobile?: string }>({})
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({})
  // Local blob: preview shown while a file is mid-upload — never the value
  // written back via patch(); the committed field only ever becomes the
  // real /uploads/banners/... URL the server returns, so a half-finished
  // upload can never be saved as-is.
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({})
  const localPreviewsRef = useRef(localPreviews)
  localPreviewsRef.current = localPreviews

  useEffect(() => {
    return () => {
      Object.values(localPreviewsRef.current).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const titleInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const desktopFileRef = useRef<HTMLInputElement>(null)
  const mobileFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => titleInputRef.current?.focus(), 80)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, input, textarea, select')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else if (document.activeElement === last) { e.preventDefault(); first.focus() }
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

  const errors = useMemo(() => validateBannerForm(values), [values])
  const isFormValid = !hasBannerFormErrors(errors)

  function patch(fields: Partial<BannerFormValues>) {
    setValues((prev) => ({ ...prev, ...fields }))
    if (submitError) setSubmitError(null)
  }

  async function handleFileSelect(field: 'desktopImage' | 'mobileImage', file: File | undefined) {
    const key = field === 'desktopImage' ? 'desktop' : 'mobile'
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setFileError((prev) => ({ ...prev, [key]: 'That file is too large — choose an image under 4MB.' }))
      return
    }
    setFileError((prev) => ({ ...prev, [key]: undefined }))

    const previewUrl = URL.createObjectURL(file)
    setLocalPreviews((prev) => ({ ...prev, [field]: previewUrl }))
    setUploadingFields((prev) => ({ ...prev, [field]: true }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      const { url } = await uploadBannerImageAction(formData)
      patch({ [field]: url } as Partial<BannerFormValues>)
    } catch (err) {
      setFileError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Couldn't upload that file. Please try again.",
      }))
    } finally {
      setUploadingFields((prev) => omitKey(prev, field))
      setLocalPreviews((prev) => {
        if (!(field in prev)) return prev
        URL.revokeObjectURL(prev[field])
        return omitKey(prev, field)
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    setTouched({ title: true, desktopImage: true, buttonLink: true, displayOrder: true, endsAt: true })
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const saved = banner ? await updateBanner(banner.id, values) : await createBanner(values)
      onSaved(saved, mode)
      onClose()
    } catch (err) {
      if (err instanceof BannerValidationError) {
        setSubmitError(err.errors.title ?? err.errors.desktopImage ?? 'Please review the highlighted fields and try again.')
      } else {
        setSubmitError("Couldn't save this banner. Please try again.")
      }
      setIsSubmitting(false)
    }
  }

  const errorFor = (field: keyof BannerFormValues) => (touched[field] || hasAttemptedSubmit ? (errors as Record<string, string | undefined>)[field] : undefined)
  const invalid = (field: keyof BannerFormValues) => !!errorFor(field)
  const titleId = 'banner-modal-title'

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={() => !isSubmitting && onClose()} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:top-1/2 w-full sm:w-[560px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-sm shadow-card"
      >
        <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
          <h2 id={titleId} className="font-display text-xl text-text-primary">
            {mode === 'create' ? 'Add Banner' : 'Edit Banner'}
          </h2>

          {submitError && (
            <div role="alert" className="border border-sale/30 bg-sale/5 text-sale rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans">
              <AlertIcon className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <FormField label="Title" htmlFor="banner-title" required error={errorFor('title')}>
              <input
                ref={titleInputRef}
                id="banner-title"
                type="text"
                required
                placeholder="Dressed for Every Moment"
                value={values.title}
                onChange={(e) => patch({ title: e.target.value })}
                onBlur={() => setTouched((p) => ({ ...p, title: true }))}
                aria-invalid={invalid('title')}
                className={fieldInputClass(invalid('title'))}
              />
            </FormField>

            <FormField label="Subtitle" htmlFor="banner-subtitle">
              <textarea
                id="banner-subtitle"
                rows={2}
                value={values.subtitle}
                onChange={(e) => patch({ subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-sm border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus:border-text-primary resize-y"
              />
            </FormField>

            {/* Desktop image */}
            <div className="border border-border rounded-sm p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full h-24 sm:w-32 sm:h-20 rounded-sm overflow-hidden shrink-0 bg-surface">
                <ImagePreview src={localPreviews.desktopImage ?? values.desktopImage} isUploading={!!uploadingFields.desktopImage} />
              </div>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <FormField label="Desktop Image" htmlFor="banner-desktop-image" required error={errorFor('desktopImage')}>
                  <input
                    id="banner-desktop-image"
                    type="text"
                    inputMode="url"
                    placeholder="https://…"
                    value={values.desktopImage.startsWith('data:') ? '' : values.desktopImage}
                    onChange={(e) => patch({ desktopImage: e.target.value })}
                    onBlur={() => setTouched((p) => ({ ...p, desktopImage: true }))}
                    aria-invalid={invalid('desktopImage')}
                    className={fieldInputClass(invalid('desktopImage'))}
                  />
                </FormField>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => desktopFileRef.current?.click()}
                    disabled={!!uploadingFields.desktopImage}
                    className="h-8 px-3 text-xs font-sans font-medium text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploadingFields.desktopImage ? 'Uploading…' : 'Choose a file…'}
                  </button>
                  {!uploadingFields.desktopImage && values.desktopImage.startsWith('/uploads/') && (
                    <span className="text-[11px] font-sans text-text-secondary">File uploaded</span>
                  )}
                  <input
                    ref={desktopFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void handleFileSelect('desktopImage', e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </div>
                {fileError.desktop && <p role="alert" className="text-[11px] font-sans text-sale">{fileError.desktop}</p>}
              </div>
            </div>

            {/* Mobile image */}
            <div className="border border-border rounded-sm p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full h-24 sm:w-32 sm:h-20 rounded-sm overflow-hidden shrink-0 bg-surface">
                <ImagePreview src={localPreviews.mobileImage ?? values.mobileImage} isUploading={!!uploadingFields.mobileImage} />
              </div>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <FormField label="Mobile Image" htmlFor="banner-mobile-image">
                  <input
                    id="banner-mobile-image"
                    type="text"
                    inputMode="url"
                    placeholder="Optional — falls back to desktop image"
                    value={values.mobileImage.startsWith('data:') ? '' : values.mobileImage}
                    onChange={(e) => patch({ mobileImage: e.target.value })}
                    className={fieldInputClass(false)}
                  />
                </FormField>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mobileFileRef.current?.click()}
                    disabled={!!uploadingFields.mobileImage}
                    className="h-8 px-3 text-xs font-sans font-medium text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploadingFields.mobileImage ? 'Uploading…' : 'Choose a file…'}
                  </button>
                  {!uploadingFields.mobileImage && values.mobileImage.startsWith('/uploads/') && (
                    <span className="text-[11px] font-sans text-text-secondary">File uploaded</span>
                  )}
                  <input
                    ref={mobileFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void handleFileSelect('mobileImage', e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </div>
                {fileError.mobile && <p role="alert" className="text-[11px] font-sans text-sale">{fileError.mobile}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Button Text" htmlFor="banner-button-text">
                <input
                  id="banner-button-text"
                  type="text"
                  placeholder="Shop New In"
                  value={values.buttonText}
                  onChange={(e) => patch({ buttonText: e.target.value })}
                  className={fieldInputClass(false)}
                />
              </FormField>
              <FormField label="Button Link" htmlFor="banner-button-link" error={errorFor('buttonLink')}>
                <input
                  id="banner-button-link"
                  type="text"
                  placeholder="/collections/new-in"
                  value={values.buttonLink}
                  onChange={(e) => patch({ buttonLink: e.target.value })}
                  onBlur={() => setTouched((p) => ({ ...p, buttonLink: true }))}
                  aria-invalid={invalid('buttonLink')}
                  className={fieldInputClass(invalid('buttonLink'))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Position" htmlFor="banner-position">
                <select
                  id="banner-position"
                  value={values.position}
                  onChange={(e) => patch({ position: e.target.value as BannerPosition })}
                  className={fieldInputClass(false)}
                >
                  <option value="hero">Hero</option>
                  <option value="secondary">Secondary</option>
                </select>
              </FormField>
              <FormField label="Display Order" htmlFor="banner-display-order" required error={errorFor('displayOrder')}>
                <input
                  id="banner-display-order"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  required
                  value={values.displayOrder}
                  onChange={(e) => patch({ displayOrder: e.target.value })}
                  onBlur={() => setTouched((p) => ({ ...p, displayOrder: true }))}
                  aria-invalid={invalid('displayOrder')}
                  className={fieldInputClass(invalid('displayOrder'))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" htmlFor="banner-starts-at">
                <input
                  id="banner-starts-at"
                  type="date"
                  value={values.startsAt}
                  onChange={(e) => patch({ startsAt: e.target.value })}
                  className={fieldInputClass(false)}
                />
              </FormField>
              <FormField label="End Date" htmlFor="banner-ends-at" error={errorFor('endsAt')}>
                <input
                  id="banner-ends-at"
                  type="date"
                  value={values.endsAt}
                  onChange={(e) => patch({ endsAt: e.target.value })}
                  onBlur={() => setTouched((p) => ({ ...p, endsAt: true }))}
                  aria-invalid={invalid('endsAt')}
                  className={fieldInputClass(invalid('endsAt'))}
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="banner-status">
              <select
                id="banner-status"
                value={values.status}
                onChange={(e) => patch({ status: e.target.value as BannerStatus })}
                className={fieldInputClass(false)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <p className="text-[11px] font-sans text-text-secondary mt-1">
                Scheduled and Expired are set automatically from the start/end dates above.
              </p>
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
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />}
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Add Banner' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
