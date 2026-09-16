'use client'

import React, { useState } from 'react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    // TODO: wire to email service / API route
    setStatus('success')
    setEmail('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2"
      aria-label="Newsletter signup"
      noValidate
    >
      {status === 'success' ? (
        <p className="text-sm font-sans text-accent py-2">
          Thank you — you&apos;re on the list!
        </p>
      ) : (
        <>
          <input
            type="email"
            placeholder="Your email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 px-3 bg-white/5 border border-white/15 text-sm font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-accent/60 transition-colors duration-200"
            aria-label="Email address for newsletter"
          />
          <button
            type="submit"
            className="w-full h-10 bg-accent text-white text-xs font-sans font-semibold tracking-wider uppercase hover:bg-accent-dark transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-text-primary"
          >
            Subscribe
          </button>
        </>
      )}
    </form>
  )
}
