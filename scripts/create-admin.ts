// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Admin Account Provisioning
//
// Run with: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npx tsx scripts/create-admin.ts
//           (optionally also ADMIN_FIRST_NAME / ADMIN_LAST_NAME)
//
// WHY THIS EXISTS
// ────────────────
// There is no admin sign-up UI, by design — an admin account is provisioned
// out-of-band by whoever controls deploy credentials, never through the
// application itself. This script is the only way to create or rotate one.
// It never hardcodes a credential; email/password always come from the
// environment (or a local .env, via dotenv), and the password is never
// logged.
//
// Idempotent: re-running with the same ADMIN_EMAIL updates that row (and,
// if it wasn't already an admin, promotes it) rather than creating a
// duplicate — safe to use both for first-time setup and for rotating an
// existing admin's password.
//
// Touches ONLY the one target User row (by email). Never touches any other
// User, Order, Product, or other table.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/auth/password'
import { isValidEmail } from '../lib/checkout-validation'

const MIN_PASSWORD_LENGTH = 8

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'Admin'
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'User'

  if (!email || !isValidEmail(email)) {
    console.error('ADMIN_EMAIL is required and must be a valid email address.')
    process.exitCode = 1
    return
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    console.error(`ADMIN_PASSWORD is required and must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    process.exitCode = 1
    return
  }

  const passwordHash = await hashPassword(password)
  const existing = await prisma.user.findFirst({ where: { email } })

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'admin', passwordHash },
    })
    console.log(
      existing.role === 'admin'
        ? `Updated existing admin account: ${email} (password rotated).`
        : `Promoted existing account to admin: ${email} (was role=${existing.role}).`
    )
    return
  }

  await prisma.user.create({
    data: { email, firstName, lastName, role: 'admin', passwordHash },
  })
  console.log(`Created new admin account: ${email}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
