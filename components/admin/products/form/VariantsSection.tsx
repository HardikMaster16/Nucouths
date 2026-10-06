'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Variant Builder (color groups → generated size rows)
//
// The real unit of purchase is still a flat colour × size ProductVariant row
// (lib/types.ts, prisma/schema.prisma's ProductVariant, @@unique([productId,
// color, size])) — this component never changes that model or how it's
// persisted (lib/admin/products.actions.ts's parseVariants/createProductInDb/
// updateProductInDb are untouched). It only changes how the admin *produces*
// those rows: instead of typing SKU/Color/Size/Stock one row at a time,
// picking sizes for a colour and clicking "Generate Variants" appends one row
// per newly-picked size (auto-SKU, shared default stock), and unchecking an
// already-generated size removes that one row. `variants`/`onVariantsChange`
// remain the exact same prop contract as before, so AddProductClient/
// EditProductClient needed no changes beyond passing `productIdentifier`.
//
// Color groups are never their own stored entity — they're derived by
// grouping the real `variants` array by (trimmed, case-insensitive) colour
// text every render (groupVariantsByColor below). This is what makes editing
// an existing product "just work" (requirement: reconstruct color groups from
// existing ProductVariant rows) with no separate reconciliation step, and
// what keeps a flat legacy variant list fully compatible — it's the exact
// same data, just grouped for display.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { PlusIcon, TrashIcon } from '@/components/admin/icons'
import { emptyVariantDraft, isValidStockValue, makeDraftKey } from '@/lib/admin/product-service'
import { CLOTHING_SIZE_ORDER } from '@/lib/product-filters'
import type { ProductFieldErrors, ProductFormErrors, ProductVariantDraft } from '@/lib/admin/product-service'

interface VariantsSectionProps {
  variants: ProductVariantDraft[]
  errors: ProductFormErrors
  /** True once the admin has tried to submit — see ImagesSection for why
   *  dynamic rows gate errors this way instead of per-field blur tracking. */
  showErrors: boolean
  onVariantsChange: (variants: ProductVariantDraft[]) => void
  /** Product name/slug — the only other input the auto-SKU generator needs
   *  (generateVariantSku below). Never persisted itself; just seeds the SKU
   *  text, which stays fully editable either way. */
  productIdentifier: string
}

// ─── Color name/value → swatch hex ─────────────────────────────────────────
//
// Resolves whatever the admin typed into a group's Color field — a CSS
// named color ("red", "light blue"), a hex value (#f00, #ff0000), or an
// rgb()/rgba() function — to the #rrggbb the native <input type="color">
// swatch requires. Delegates the actual parsing to the browser's own CSS
// engine (via a throwaway element's `color` property) instead of
// maintaining a hardcoded name→hex table: this correctly covers every
// standard CSS3 color name (~150 of them) plus every color syntax the
// platform understands, for free, and can never drift from what a real
// stylesheet would accept.

/** Extracts the RGB channels from a computed `rgb(...)`/`rgba(...)` string
 *  (getComputedStyle's normalized serialization of any valid CSS color) and
 *  formats them as the lowercase #rrggbb string <input type="color">
 *  requires. Alpha (if present) is intentionally dropped — the swatch has
 *  no way to represent transparency. */
function computedColorToHex(computed: string): string | null {
  const match = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(computed)
  if (!match) return null
  const [, r, g, b] = match
  const toHex = (channel: string) => Math.max(0, Math.min(255, Number(channel))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Resolves a free-typed color field value to a #rrggbb swatch color, or
 *  `null` if it isn't a recognizable CSS color at all — the caller's job is
 *  then to leave the previous swatch color untouched, never reset to black.
 *  Case-insensitive and whitespace-tolerant ("Light Blue" / "light blue" /
 *  "LIGHTBLUE" all resolve the same way a real CSS keyword like
 *  "lightblue" would), and trims the input first. */
function resolveColorInputToHex(rawInput: string): string | null {
  if (typeof document === 'undefined') return null // never called during SSR, but keeps this safely typed

  const trimmed = rawInput.trim()
  if (!trimmed) return null

  // A hex literal or an rgb()/rgba() function is passed through verbatim
  // (internal spacing/commas matter there); anything else is treated as a
  // keyword name and has its internal whitespace collapsed first, so a
  // human-friendly "light blue" resolves the same as the real CSS keyword
  // "lightblue".
  const candidate = trimmed.startsWith('#') || /^rgba?\(/i.test(trimmed) ? trimmed : trimmed.replace(/\s+/g, '')

  const probe = document.createElement('span')
  probe.style.color = '' // sentinel — a successful assignment below can never leave this empty
  probe.style.color = candidate
  if (!probe.style.color) return null // browser silently rejected an invalid value

  probe.style.display = 'none'
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe).color
  document.body.removeChild(probe)

  return computedColorToHex(computed)
}

// ─── Grouping ───────────────────────────────────────────────────────────────

interface VariantGroup {
  /** Trimmed, lowercased — the join key used everywhere below (pending-size
   *  selection, default-stock text, duplicate checks). */
  colorKey: string
  /** As-typed casing, from the group's first row. */
  color: string
  colorHex: string
  rows: ProductVariantDraft[]
}

/** Groups the flat variant list by colour (case-insensitive) — this alone is
 *  what makes an existing product's saved variants show up already grouped
 *  when editing, with no separate reconstruction step. Rows with no colour
 *  yet (the single blank draft row a brand-new product form starts with)
 *  belong to no group and are simply invisible here — harmless, since a
 *  fully-blank row is dropped silently at save time either way
 *  (lib/admin/product-form.ts's validateProductForm). */
function groupVariantsByColor(variants: ProductVariantDraft[]): VariantGroup[] {
  const groups: VariantGroup[] = []
  const index = new Map<string, VariantGroup>()
  for (const v of variants) {
    const color = v.color.trim()
    if (!color) continue
    const colorKey = color.toLowerCase()
    let group = index.get(colorKey)
    if (!group) {
      group = { colorKey, color, colorHex: v.colorHex || '#111111', rows: [] }
      index.set(colorKey, group)
      groups.push(group)
    }
    group.rows.push(v)
  }
  return groups
}

/** Every size already used anywhere on this product (in first-seen order),
 *  followed by the app's standard clothing scale for anything not already
 *  covered — "reuse the project's existing size configuration first, fall
 *  back to common clothing sizes" exactly as required, with no separate
 *  hardcoded list duplicating either. */
function collectSizeOptions(variants: ProductVariantDraft[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const v of variants) {
    const size = v.size.trim()
    if (size && !seen.has(size.toLowerCase())) {
      seen.add(size.toLowerCase())
      ordered.push(size)
    }
  }
  for (const size of CLOTHING_SIZE_ORDER) {
    if (!seen.has(size.toLowerCase())) {
      seen.add(size.toLowerCase())
      ordered.push(size)
    }
  }
  return ordered
}

// ─── SKU generation ─────────────────────────────────────────────────────────
//
// No existing reusable SKU-generation utility exists elsewhere in the app
// (checked lib/, lib/admin/, scripts/) — the closest precedent is the mock
// catalog's private per-product helper (lib/product-detail-data.ts's
// mkVariants), which builds `NCT-{PRODUCTCODE}-{COLOR}-{SIZE}`. "NCT" is
// also this app's real brand code elsewhere (prisma/schema.prisma's
// StoreSettings.orderPrefix defaults to "NCT"), so it's reused here rather
// than inventing a new prefix. A new product has no database id yet, so the
// product name/slug stands in for the "product code" segment.

function acronym(text: string, singleWordLength: number): string {
  const words = text.trim().split(/[\s-]+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, singleWordLength).toUpperCase()
  return words.map((w) => w[0]).join('').toUpperCase()
}

/** Deterministic, editable SKU suggestion for one colour × size — never the
 *  only way to set a SKU (the field stays a plain text input either way),
 *  just a sensible default so the admin isn't required to type every one by
 *  hand. `existingSkusLower` is every SKU already used anywhere on this
 *  product (lowercased) — on a collision (e.g. two colours that abbreviate
 *  the same way) a numeric suffix is appended until it's unique within this
 *  form; the server's own SKU-uniqueness check (lib/admin/products.actions.ts)
 *  remains the final backstop across the whole catalog. */
function generateVariantSku(productIdentifier: string, color: string, size: string, existingSkusLower: Set<string>): string {
  const productCode = acronym(productIdentifier, 3) || 'PRD'
  const colorCode = acronym(color, 3) || 'CLR'
  const sizeCode = size.trim().toUpperCase().replace(/\s+/g, '-')
  const base = `NCT-${productCode}-${colorCode}-${sizeCode}`

  if (!existingSkusLower.has(base.toLowerCase())) return base
  let n = 2
  while (existingSkusLower.has(`${base}-${n}`.toLowerCase())) n += 1
  return `${base}-${n}`
}

// ─── Component ──────────────────────────────────────────────────────────────

interface EmptyGroupDraft {
  key: string
  color: string
  colorHex: string
}

export function VariantsSection({ variants, errors, showErrors, onVariantsChange, productIdentifier }: VariantsSectionProps) {
  // Not-yet-materialized "+ Add Another Color" cards — a colour with no
  // generated sizes yet has no real variant row to derive a group from, so
  // it's tracked here until its first "Generate Variants" click produces a
  // real row, at which point groupVariantsByColor picks it up instead (see
  // the render-time merge below) and it's dropped from this list.
  const [emptyGroups, setEmptyGroups] = useState<EmptyGroupDraft[]>([])
  // Sizes checked but not yet generated, and the default-stock text field,
  // per colour group — keyed by the same colorKey as VariantGroup. Purely
  // in-progress UI state; nothing here is saved until "Generate Variants"
  // turns a pending size into a real ProductVariantDraft row.
  const [pendingSizesByColor, setPendingSizesByColor] = useState<Record<string, string[]>>({})
  const [defaultStockByColor, setDefaultStockByColor] = useState<Record<string, string>>({})
  const [generateErrors, setGenerateErrors] = useState<Record<string, string>>({})
  const [customSizeInputByColor, setCustomSizeInputByColor] = useState<Record<string, string>>({})

  const groups = useMemo(() => groupVariantsByColor(variants), [variants])
  const sizeOptions = useMemo(() => collectSizeOptions(variants), [variants])

  const groupKeys = new Set(groups.map((g) => g.colorKey))
  // Empty drafts that have since gained a real row (their colour now shows
  // up in `groups`) are hidden here rather than rendered twice; they're
  // pruned from state entirely the moment that happens (see handleGenerate).
  const visibleEmptyGroups = emptyGroups.filter((d) => !groupKeys.has(d.color.trim().toLowerCase()))

  function clearGenerateError(colorKey: string) {
    setGenerateErrors((prev) => {
      if (!(colorKey in prev)) return prev
      return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== colorKey))
    })
  }

  function updateRow(key: string, patch: Partial<ProductVariantDraft>) {
    onVariantsChange(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)))
  }

  function addEmptyGroup() {
    setEmptyGroups((prev) => [...prev, { key: makeDraftKey('colorgroup'), color: '', colorHex: '#111111' }])
  }

  /** `explicitHex` is set when the change came from the native colour
   *  picker (the admin's manual pick always wins); otherwise the typed
   *  colour text is resolved via the CSS-parser trick above, leaving the
   *  swatch untouched when it doesn't resolve to a real color. */
  function renameEmptyGroup(draftKey: string, color: string, explicitHex?: string) {
    setEmptyGroups((prev) =>
      prev.map((d) => {
        if (d.key !== draftKey) return d
        const resolvedHex = explicitHex ?? resolveColorInputToHex(color)
        return { ...d, color, colorHex: resolvedHex ?? d.colorHex }
      })
    )
  }

  function removeEmptyGroup(draftKey: string) {
    setEmptyGroups((prev) => prev.filter((d) => d.key !== draftKey))
  }

  /** Renaming an existing group's colour updates every row currently in it
   *  (matched by their stable `.key`s, captured in `rows` at render time) —
   *  never by re-matching the new text, which wouldn't find them. Same
   *  explicitHex/auto-resolve rule as renameEmptyGroup above. */
  function renameGroupColor(rows: ProductVariantDraft[], colorText: string, explicitHex?: string) {
    const keys = new Set(rows.map((r) => r.key))
    const resolvedHex = explicitHex ?? resolveColorInputToHex(colorText)
    onVariantsChange(
      variants.map((v) =>
        keys.has(v.key) ? { ...v, color: colorText, ...(resolvedHex ? { colorHex: resolvedHex } : {}) } : v
      )
    )
  }

  function removeGroup(rows: ProductVariantDraft[]) {
    const keys = new Set(rows.map((r) => r.key))
    const next = variants.filter((v) => !keys.has(v.key))
    onVariantsChange(next.length > 0 ? next : [emptyVariantDraft()])
  }

  /** Unchecking an already-generated size removes that one row immediately
   *  (the same instant, no-confirmation behaviour the old flat "Remove
   *  variant" button already had) — checking a size that has no row yet
   *  only marks it pending until "Generate Variants" is clicked. */
  function toggleSize(colorKey: string, rows: ProductVariantDraft[], size: string) {
    const existingRow = rows.find((r) => r.size.trim().toLowerCase() === size.toLowerCase())
    if (existingRow) {
      onVariantsChange(variants.filter((v) => v.key !== existingRow.key))
      return
    }
    setPendingSizesByColor((prev) => {
      const current = prev[colorKey] ?? []
      const has = current.some((s) => s.toLowerCase() === size.toLowerCase())
      return { ...prev, [colorKey]: has ? current.filter((s) => s.toLowerCase() !== size.toLowerCase()) : [...current, size] }
    })
    clearGenerateError(colorKey)
  }

  function addCustomSize(colorKey: string) {
    const size = (customSizeInputByColor[colorKey] ?? '').trim()
    if (!size) return
    setPendingSizesByColor((prev) => {
      const current = prev[colorKey] ?? []
      if (current.some((s) => s.toLowerCase() === size.toLowerCase())) return prev
      return { ...prev, [colorKey]: [...current, size] }
    })
    setCustomSizeInputByColor((prev) => ({ ...prev, [colorKey]: '' }))
    clearGenerateError(colorKey)
  }

  /** Generates one new ProductVariantDraft row per pending size that doesn't
   *  already exist for this colour — existing rows (and anything about them
   *  the admin has already edited: SKU, stock, price override) are never
   *  touched, so re-generating to add more sizes can never clobber earlier
   *  edits. A pending size that turns out to already exist (e.g. a stale
   *  selection left over from before a row was removed elsewhere) is
   *  silently skipped rather than duplicated — the real duplicate-prevention
   *  here is structural: each size can only ever be checked or unchecked
   *  once per colour, so the same combination can't be selected twice. */
  function handleGenerate(colorKey: string, color: string, colorHex: string, rows: ProductVariantDraft[], emptyDraftKey?: string) {
    const trimmedColor = color.trim()
    if (!trimmedColor) {
      setGenerateErrors((prev) => ({ ...prev, [colorKey]: 'Enter a color name first.' }))
      return
    }

    const pending = pendingSizesByColor[colorKey] ?? []
    if (pending.length === 0) {
      setGenerateErrors((prev) => ({ ...prev, [colorKey]: 'Select at least one size to generate.' }))
      return
    }

    const defaultStock = defaultStockByColor[colorKey] ?? ''
    if (!isValidStockValue(defaultStock)) {
      setGenerateErrors((prev) => ({ ...prev, [colorKey]: 'Enter a default stock of 0 or greater.' }))
      return
    }

    const existingSizesLower = new Set(rows.map((r) => r.size.trim().toLowerCase()))
    const existingSkusLower = new Set(variants.map((v) => v.sku.trim().toLowerCase()).filter(Boolean))

    const newRows: ProductVariantDraft[] = []
    for (const size of pending) {
      if (existingSizesLower.has(size.trim().toLowerCase())) continue // already generated — skip, never duplicate
      const sku = generateVariantSku(productIdentifier, trimmedColor, size, existingSkusLower)
      existingSkusLower.add(sku.toLowerCase())
      newRows.push({
        key: makeDraftKey('variant'),
        sku,
        color: trimmedColor,
        colorHex,
        size: size.trim(),
        stock: defaultStock,
        priceOverride: '',
      })
    }

    onVariantsChange([...variants, ...newRows])
    setPendingSizesByColor((prev) => ({ ...prev, [colorKey]: [] }))
    clearGenerateError(colorKey)
    if (emptyDraftKey) removeEmptyGroup(emptyDraftKey)
  }

  function renderGroupCard(args: {
    colorKey: string
    color: string
    colorHex: string
    rows: ProductVariantDraft[]
    onColorChange: (color: string, colorHex?: string) => void
    onRemove: () => void
    emptyDraftKey?: string
    index: number
  }) {
    const { colorKey, color, colorHex, rows, onColorChange, onRemove, emptyDraftKey, index } = args
    const pending = pendingSizesByColor[colorKey] ?? []
    const generateError = generateErrors[colorKey]
    const colorInputId = `variant-group-color-${colorKey || index}`

    return (
      <div key={emptyDraftKey ?? colorKey} className="border border-border rounded-sm p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-sans font-semibold uppercase tracking-wide text-text-secondary">Color {index + 1}</h3>
          <span className="text-xs font-sans text-text-secondary">
            {rows.length} size{rows.length === 1 ? '' : 's'}
          </span>
        </div>

        <FormField label="Color" htmlFor={colorInputId}>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              aria-label="Color swatch"
              value={colorHex}
              onChange={(e) => onColorChange(color, e.target.value)}
              className="w-9 h-9 shrink-0 rounded-sm border border-border cursor-pointer bg-white p-0.5"
            />
            <input
              id={colorInputId}
              type="text"
              placeholder="Light Blue"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className={fieldInputClass(false)}
            />
          </div>
        </FormField>

        <div>
          <p className="text-xs font-sans font-semibold tracking-[0.1em] uppercase text-text-primary mb-2">Available Sizes</p>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const hasRow = rows.some((r) => r.size.trim().toLowerCase() === size.toLowerCase())
              const isPending = pending.some((s) => s.toLowerCase() === size.toLowerCase())
              const checked = hasRow || isPending
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(colorKey, rows, size)}
                  aria-pressed={checked}
                  className={[
                    'h-9 px-3 rounded-sm border text-xs font-sans font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                    checked
                      ? 'bg-text-primary text-white border-text-primary'
                      : 'bg-white text-text-primary border-border hover:bg-surface',
                  ].join(' ')}
                >
                  {checked ? '✓ ' : ''}
                  {size}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              placeholder="Custom size (e.g. 30, ONE SIZE)"
              value={customSizeInputByColor[colorKey] ?? ''}
              onChange={(e) => setCustomSizeInputByColor((prev) => ({ ...prev, [colorKey]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomSize(colorKey)
                }
              }}
              className={fieldInputClass(false) + ' max-w-[220px] text-xs h-8'}
            />
            <button
              type="button"
              onClick={() => addCustomSize(colorKey)}
              className="h-8 px-3 text-xs font-sans font-medium text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
            >
              Add size
            </button>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <FormField label="Default Stock" htmlFor={`variant-group-stock-${colorKey || index}`} className="w-32">
            <input
              id={`variant-group-stock-${colorKey || index}`}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="15"
              value={defaultStockByColor[colorKey] ?? ''}
              onChange={(e) => {
                setDefaultStockByColor((prev) => ({ ...prev, [colorKey]: e.target.value }))
                clearGenerateError(colorKey)
              }}
              className={fieldInputClass(false)}
            />
          </FormField>

          <button
            type="button"
            onClick={() => handleGenerate(colorKey, color, colorHex, rows, emptyDraftKey)}
            disabled={pending.length === 0}
            className="h-11 px-5 inline-flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Generate Variants{pending.length > 0 ? ` (${pending.length})` : ''}
          </button>
        </div>

        {generateError && (
          <p role="alert" className="text-[11px] font-sans text-sale -mt-2">
            {generateError}
          </p>
        )}

        {rows.length > 0 && (
          <div>
            <p className="text-xs font-sans font-semibold tracking-[0.1em] uppercase text-text-primary mb-2">Generated Variants</p>
            <div className="flex flex-col gap-2">
              {rows.map((row) => {
                const fieldErrors: ProductFieldErrors | undefined = showErrors ? errors.variantFields?.[row.key] : undefined
                return (
                  <div key={row.key} className="border border-border rounded-sm p-3 grid grid-cols-2 sm:grid-cols-[64px_1fr_100px_140px] gap-3 items-start bg-surface/40">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-sans font-semibold tracking-[0.1em] uppercase text-text-primary">Size</span>
                      <span className="h-11 flex items-center px-3 text-sm font-sans font-medium text-text-primary bg-white border border-border rounded-sm">
                        {row.size}
                      </span>
                    </div>

                    <FormField label="SKU" htmlFor={`variant-sku-${row.key}`} error={fieldErrors?.sku}>
                      <input
                        id={`variant-sku-${row.key}`}
                        type="text"
                        value={row.sku}
                        onChange={(e) => updateRow(row.key, { sku: e.target.value })}
                        aria-invalid={!!fieldErrors?.sku}
                        className={fieldInputClass(!!fieldErrors?.sku) + ' font-mono text-[12px]'}
                      />
                    </FormField>

                    <FormField label="Stock" htmlFor={`variant-stock-${row.key}`} error={fieldErrors?.stock}>
                      <input
                        id={`variant-stock-${row.key}`}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={row.stock}
                        onChange={(e) => updateRow(row.key, { stock: e.target.value })}
                        aria-invalid={!!fieldErrors?.stock}
                        className={fieldInputClass(!!fieldErrors?.stock)}
                      />
                    </FormField>

                    <FormField label="Price Override (₹)" htmlFor={`variant-price-override-${row.key}`} error={fieldErrors?.priceOverride}>
                      <input
                        id={`variant-price-override-${row.key}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        placeholder="Optional"
                        value={row.priceOverride}
                        onChange={(e) => updateRow(row.key, { priceOverride: e.target.value })}
                        aria-invalid={!!fieldErrors?.priceOverride}
                        className={fieldInputClass(!!fieldErrors?.priceOverride)}
                      />
                    </FormField>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 self-start text-xs font-sans font-medium text-text-secondary hover:text-sale"
        >
          <TrashIcon className="w-3.5 h-3.5" /> Remove Color
        </button>
      </div>
    )
  }

  const totalVariantCount = groups.reduce((sum, g) => sum + g.rows.length, 0)

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-sans font-semibold text-text-primary">Variants</h2>
        <span className="text-xs font-sans text-text-secondary">
          {totalVariantCount} variant{totalVariantCount === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-xs font-sans text-text-secondary mb-4">
        Add a color, pick its available sizes, and generate every size as its own variant at once — no need to
        retype the color for each size.
      </p>

      <div className="flex flex-col gap-4">
        {groups.map((group, i) =>
          renderGroupCard({
            colorKey: group.colorKey,
            color: group.color,
            colorHex: group.colorHex,
            rows: group.rows,
            onColorChange: (color, colorHex) => renameGroupColor(group.rows, color, colorHex),
            onRemove: () => removeGroup(group.rows),
            index: i,
          })
        )}

        {visibleEmptyGroups.map((draft, i) =>
          renderGroupCard({
            // Keyed by the draft's own stable id, not its (possibly still
            // blank) color text — two simultaneously-blank "+ Add Another
            // Color" cards would otherwise collide on the empty string and
            // share pending-size/default-stock state.
            colorKey: `empty:${draft.key}`,
            color: draft.color,
            colorHex: draft.colorHex,
            rows: [],
            onColorChange: (color, colorHex) => renameEmptyGroup(draft.key, color, colorHex),
            onRemove: () => removeEmptyGroup(draft.key),
            emptyDraftKey: draft.key,
            index: groups.length + i,
          })
        )}
      </div>

      {showErrors && errors.variantFields && Object.keys(errors.variantFields).length > 0 && groups.length === 0 && visibleEmptyGroups.length === 0 && (
        <p role="alert" className="text-[11px] font-sans text-sale mt-3">
          Add at least one color and generate its sizes.
        </p>
      )}

      <button
        type="button"
        onClick={addEmptyGroup}
        className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
        <PlusIcon className="w-3.5 h-3.5" /> Add Another Color
      </button>
    </section>
  )
}
