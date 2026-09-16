import React from 'react'

/** Shared "── OR ──" divider between password auth and social auth. */
export function AuthDivider({ label = 'OR' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-6" aria-hidden="true">
      <div className="flex-1 border-t border-border" />
      <span className="text-[11px] font-sans text-text-secondary tracking-wide">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}
