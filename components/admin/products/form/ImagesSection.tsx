'use client'

import React, { useEffect, useRef, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { PlusIcon, TrashIcon } from '@/components/admin/icons'
import { emptyImageDraft } from '@/lib/admin/product-service'
import { uploadProductImageAction } from '@/lib/admin/upload-image.actions'
import type { ProductFieldErrors, ProductFormErrors, ProductImageDraft } from '@/lib/admin/product-service'

interface ImagesSectionProps {
  images: ProductImageDraft[]
  errors: ProductFormErrors
  /** True once the admin has tried to submit — dynamic list rows don't get
   *  per-field blur tracking like the scalar fields above them, so errors
   *  here show only after a submit attempt rather than while still typing. */
  showErrors: boolean
  onImagesChange: (images: ProductImageDraft[]) => void
}

const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4MB — mirrors lib/admin/upload-image.actions.ts's server-side cap

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key))
}

function ImagePreview({ src, isUploading }: { src: string; isUploading?: boolean }) {
  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-secondary/40 bg-surface">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }
  return (
    <div className="relative w-full h-full">
      {/* Admin-authored image URLs (pasted links, or an in-flight local
       *  blob: preview below) aren't known ahead of time, so they can't go
       *  through next/image's configured remote-pattern allowlist
       *  (next.config.ts) the way catalog images do — this is an editor
       *  preview, not the storefront rendering path. */}
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

export function ImagesSection({ images, errors, showErrors, onImagesChange }: ImagesSectionProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({})
  // Local blob: preview shown while a file is mid-upload — never the value
  // written back via onImagesChange; the committed src only ever becomes
  // the real /uploads/products/... URL the server returns (or stays empty
  // until it does), so a half-finished upload can never be saved as-is.
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({})
  const localPreviewsRef = useRef(localPreviews)
  localPreviewsRef.current = localPreviews

  useEffect(() => {
    return () => {
      Object.values(localPreviewsRef.current).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function updateImage(key: string, patch: Partial<ProductImageDraft>) {
    onImagesChange(images.map((img) => (img.key === key ? { ...img, ...patch } : img)))
  }

  function addImage() {
    onImagesChange([...images, emptyImageDraft()])
  }

  function clearFileError(key: string) {
    setFileErrors((prev) => {
      if (!(key in prev)) return prev
      return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key))
    })
  }

  function removeImage(key: string) {
    const next = images.filter((img) => img.key !== key)
    onImagesChange(next.length > 0 ? next : [emptyImageDraft()])
    clearFileError(key)
    setLocalPreviews((prev) => {
      if (!(key in prev)) return prev
      URL.revokeObjectURL(prev[key])
      return omitKey(prev, key)
    })
  }

  function setPrimary(key: string) {
    const target = images.find((img) => img.key === key)
    if (!target) return
    onImagesChange([target, ...images.filter((img) => img.key !== key)])
  }

  async function handleFileSelect(key: string, file: File | undefined) {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setFileErrors((prev) => ({ ...prev, [key]: 'That file is too large — choose an image under 4MB.' }))
      return
    }
    clearFileError(key)

    const previewUrl = URL.createObjectURL(file)
    setLocalPreviews((prev) => ({ ...prev, [key]: previewUrl }))
    setUploadingKeys((prev) => ({ ...prev, [key]: true }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      const { url } = await uploadProductImageAction(formData)
      updateImage(key, { src: url })
    } catch (err) {
      setFileErrors((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Couldn't upload that file. Please try again.",
      }))
    } finally {
      setUploadingKeys((prev) => omitKey(prev, key))
      setLocalPreviews((prev) => {
        if (!(key in prev)) return prev
        URL.revokeObjectURL(prev[key])
        return omitKey(prev, key)
      })
    }
  }

  const topLevelError = showErrors ? errors.images : undefined

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-sans font-semibold text-text-primary">Product Images</h2>
        <span className="text-xs font-sans text-text-secondary">{images.filter((i) => i.src.trim()).length} added</span>
      </div>
      <p className="text-xs font-sans text-text-secondary mb-4">
        Paste an image URL or upload a file from your computer (JPG, PNG, or WEBP, up to 4MB). The first image is the primary/cover image.
      </p>

      {topLevelError && (
        <p role="alert" className="text-[11px] font-sans text-sale mb-3">
          {topLevelError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {images.map((img, index) => {
          const fieldErrors: ProductFieldErrors | undefined = showErrors ? errors.imageFields?.[img.key] : undefined
          const isPrimary = index === 0 && img.src.trim() !== ''
          return (
            <div key={img.key} className="border border-border rounded-sm p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full h-40 sm:w-24 sm:h-24 rounded-sm overflow-hidden shrink-0 bg-surface">
                <ImagePreview src={localPreviews[img.key] ?? img.src} isUploading={!!uploadingKeys[img.key]} />
                {isPrimary && (
                  <span className="absolute top-1 left-1 text-[10px] font-sans font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-text-primary text-white rounded-sm">
                    Primary
                  </span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                <FormField label="Image URL" htmlFor={`image-url-${img.key}`} error={fieldErrors?.src}>
                  <input
                    id={`image-url-${img.key}`}
                    type="text"
                    inputMode="url"
                    placeholder="https://…"
                    value={img.src.startsWith('data:') ? '' : img.src}
                    onChange={(e) => updateImage(img.key, { src: e.target.value })}
                    aria-invalid={!!fieldErrors?.src}
                    className={fieldInputClass(!!fieldErrors?.src)}
                  />
                </FormField>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[img.key]?.click()}
                    disabled={!!uploadingKeys[img.key]}
                    className="h-8 px-3 text-xs font-sans font-medium text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploadingKeys[img.key] ? 'Uploading…' : 'Choose a file…'}
                  </button>
                  {!uploadingKeys[img.key] && img.src.startsWith('/uploads/') && (
                    <span className="text-[11px] font-sans text-text-secondary">File uploaded</span>
                  )}
                  <input
                    ref={(el) => { fileInputRefs.current[img.key] = el }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void handleFileSelect(img.key, e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </div>
                {fileErrors[img.key] && (
                  <p role="alert" className="text-[11px] font-sans text-sale -mt-1.5">
                    {fileErrors[img.key]}
                  </p>
                )}

                <FormField label="Alt Text" htmlFor={`image-alt-${img.key}`} error={fieldErrors?.alt}>
                  <input
                    id={`image-alt-${img.key}`}
                    type="text"
                    placeholder="Describe the image for accessibility"
                    value={img.alt}
                    onChange={(e) => updateImage(img.key, { alt: e.target.value })}
                    aria-invalid={!!fieldErrors?.alt}
                    className={fieldInputClass(!!fieldErrors?.alt)}
                  />
                </FormField>

                <div className="flex items-center gap-3 pt-0.5">
                  {!isPrimary && img.src.trim() && (
                    <button
                      type="button"
                      onClick={() => setPrimary(img.key)}
                      className="text-xs font-sans font-medium text-text-primary underline underline-offset-4 hover:no-underline"
                    >
                      Set as primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.key)}
                    className="inline-flex items-center gap-1 text-xs font-sans font-medium text-text-secondary hover:text-sale ml-auto"
                  >
                    <TrashIcon className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addImage}
        className="mt-3 inline-flex items-center gap-1.5 h-9 px-3 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
        <PlusIcon className="w-3.5 h-3.5" /> Add Image
      </button>
    </section>
  )
}
