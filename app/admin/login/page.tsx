import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminLoginClient } from '@/components/admin/AdminLoginClient'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function AdminLoginPage() {
  return (
    <main id="admin-login-main" className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      {/* useSearchParams (for post-login redirect) requires a Suspense boundary */}
      <Suspense fallback={null}>
        <AdminLoginClient />
      </Suspense>
    </main>
  )
}
