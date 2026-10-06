import { AdminShell } from '@/components/admin/AdminShell'

// Every route in this group is protected — AdminShell redirects to
// /admin/login when there's no admin session. /admin/login itself lives
// outside this group (app/admin/login/page.tsx) so it isn't gated by itself.
export default function AdminDashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
