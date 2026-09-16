import React from 'react'

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/** Shared trust line shown at the bottom of the auth forms. */
export function SecurityMessage() {
  return (
    <div className="flex items-center justify-center gap-2 mt-8 text-[11px] font-sans text-text-secondary">
      <LockIcon />
      Your information is protected and securely encrypted.
    </div>
  )
}
