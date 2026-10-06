import React from 'react'
import { PAYMENT_METHOD_LABELS } from '@/lib/order-storage'
import type { PaymentStatusRow } from '@/lib/admin/settings'

/** Read-only — there's nothing an admin edits here (no API keys/secrets
 *  exist anywhere in this app to configure), so unlike the sections above
 *  this one has no Save Changes action. */
export function PaymentStatusSection({ rows }: { rows: PaymentStatusRow[] }) {
  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-1">Payment</h2>
      <p className="text-xs font-sans text-text-secondary mb-4">
        Configuration status only — no keys or credentials are shown here.
      </p>

      <ul className="flex flex-col divide-y divide-border border border-border rounded-sm">
        {rows.map((row) => (
          <li key={row.id} className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-sans font-medium text-text-primary">{row.label}</p>
              <p className="text-xs font-sans text-text-secondary mt-0.5">{row.description}</p>
              <p className="text-[11px] font-sans text-text-secondary mt-1.5">
                {row.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(' · ')}
              </p>
            </div>
            <span
              className={[
                'shrink-0 inline-flex items-center text-xs font-sans font-semibold px-2 py-1 rounded-sm border',
                row.configured
                  ? 'text-[#2F7A4D] border-[#2F7A4D]/30 bg-[#2F7A4D]/5'
                  : 'text-text-secondary border-border bg-surface',
              ].join(' ')}
            >
              {row.statusLabel}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
