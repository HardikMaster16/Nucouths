'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Personal Information Card
//
// Single read-only presentation of the authenticated user's profile fields,
// shared by /account's Overview and reused as the summary at a glance —
// editing itself now happens on the dedicated /account/details page (see
// AccountDetailsClient.tsx), which this card links to.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Link from 'next/link'
import type { AuthUser } from '@/lib/auth-context'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs font-sans font-semibold tracking-[0.1em] uppercase text-text-secondary mb-1">
        {label}
      </p>
      <p className="text-sm font-sans text-text-primary">{value}</p>
    </div>
  )
}

export function PersonalInfoCard({ user }: { user: AuthUser }) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return (
    <div className="border border-border p-6 sm:p-8 flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <InfoRow label="Full Name" value={fullName || '—'} />
        <InfoRow label="Email Address" value={user.email} />
        <InfoRow label="Phone Number" value={user.phone || '—'} />
      </div>

      <div className="pt-1">
        <Link
          href="/account/details"
          className="self-start text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Edit Account Details →
        </Link>
      </div>
    </div>
  )
}
