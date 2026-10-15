// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Supabase Storage (server-only)
//
// Thin wrapper around @supabase/supabase-js's Storage API, used only by
// lib/admin/image-upload-core.ts to persist admin-uploaded product and
// banner images somewhere that survives a Hostinger redeploy (unlike the
// old public/uploads/ filesystem writes — see that file's module docstring
// for why those 404 in production).
//
// SUPABASE_SERVICE_ROLE_KEY is the project's server-side secret: it bypasses
// Storage's row-level-security policies entirely, so this module must never
// be imported from a 'use client' component or any code path reachable from
// the browser — only from server-only admin Server Action files, each of
// which runs its own requireAdminSession() check before ever reaching here.
// Never log this key or echo it back in an error message.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** The single public bucket created for this project (see DEPLOYMENT.md) —
 *  shared by both product and banner uploads, kept apart only by the
 *  'products/' / 'banners/' path prefix each caller passes in. */
export const IMAGE_STORAGE_BUCKET = 'product-images'

let cachedClient: SupabaseClient | null = null

/** Lazily builds (and caches) the server-side Storage client. Throws a
 *  clear, actionable error — instead of letting the Supabase SDK fail on a
 *  confusing undefined-url/undefined-key call — if either env var is
 *  missing, so a misconfigured deploy fails loudly at upload time rather
 *  than silently. */
function getSupabaseStorageClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Image uploads are not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).'
    )
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
  return cachedClient
}

/** Uploads one validated image's bytes to the shared bucket at
 *  `${pathPrefix}/<filename>` and returns its public URL (the bucket is
 *  public, so this is a stable, directly browser-fetchable URL — no signed
 *  URL, no expiry — ready to store as ProductImage.src or
 *  Banner.desktopImage/mobileImage). Throws a user-facing Error on failure;
 *  callers (lib/admin/image-upload-core.ts) have already run their own
 *  size/type validation by the time this is called. */
export async function uploadImageToSupabaseStorage(
  bytes: Uint8Array,
  objectPath: string,
  contentType: string
): Promise<string> {
  const client = getSupabaseStorageClient()

  const { error } = await client.storage.from(IMAGE_STORAGE_BUCKET).upload(objectPath, bytes, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) {
    throw new Error(`Couldn't upload that file — ${error.message}`)
  }

  const { data } = client.storage.from(IMAGE_STORAGE_BUCKET).getPublicUrl(objectPath)
  return data.publicUrl
}
