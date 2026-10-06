'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatusAction } from '@/lib/admin/orders.actions'
import { ALL_ORDER_STATUSES } from '@/lib/admin/orders'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { PencilIcon } from '@/components/admin/icons'
import type { OrderStatus } from '@/lib/types'

interface OrderStatusEditorProps {
  orderNumber: string
  status: OrderStatus
}

/** Inline "click to edit" status control — same small edit-in-place pattern
 *  as components/admin/inventory/InventoryTable.tsx's StockEditor. Owns its
 *  own pending/error state; on a successful save it calls router.refresh()
 *  so the rest of the (server-rendered) page — the fulfillment timeline, the
 *  header badge, the "counts as sale" total styling — picks up the new
 *  status too, not just this control. */
export function OrderStatusEditor({ orderNumber, status }: OrderStatusEditorProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState<OrderStatus>(status)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setValue(status)
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    if (value === status) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await updateOrderStatusAction(orderNumber, value)
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update status.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <span className="inline-flex items-center gap-2">
        <OrderStatusBadge status={status} />
        <button
          type="button"
          onClick={startEdit}
          aria-label="Change order status"
          className="inline-flex items-center justify-center w-6 h-6 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <select
          value={value}
          disabled={isSaving}
          onChange={(e) => setValue(e.target.value as OrderStatus)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelEdit()
          }}
          aria-label="New order status"
          className="h-8 px-2 text-xs font-sans text-text-primary bg-white border border-text-primary rounded-sm focus-visible:outline-none"
        >
          {ALL_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Save status"
          className="h-8 px-2 text-[11px] font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 disabled:opacity-60"
        >
          {isSaving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={isSaving}
          aria-label="Cancel"
          className="h-8 px-2 text-[11px] font-sans font-medium uppercase tracking-wide text-text-secondary hover:text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 disabled:opacity-60"
        >
          ✕
        </button>
      </div>
      {error && <p className="text-[11px] font-sans text-sale">{error}</p>}
    </div>
  )
}
