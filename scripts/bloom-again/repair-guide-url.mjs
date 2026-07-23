#!/usr/bin/env node
/**
 * Repairs the Bloom Again lesson assets so they load (and the guide's lesson
 * accordions work) on the live site.
 *
 * Background: the course's downloads rows pointed at r2:// keys from the
 * pre-bucket-split R2 setup. The current app can't resolve those keys, so the
 * guide either fails to load or serves a stale export whose scripts are
 * broken. Working guides (Postpartum Reset) all use full public R2 URLs.
 *
 * For each asset this script:
 *  1. Uploads the file from docs/course-content/bloom-again/ to R2 under
 *     courses/<courseId>/downloads/<uuid>.<ext> (public bucket), unless a
 *     --<name>-key argument points at an object that already exists.
 *  2. Points the existing downloads row at the full public URL.
 *  3. Prints the row before and after, so the change is easy to roll back.
 *
 * Run: node scripts/bloom-again/repair-guide-url.mjs
 *      [--guide-key <existing-r2-key>] [--pdf-key <existing-r2-key>]
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const COURSE_ID = 'ab4596f4-3c84-43fd-b72a-8f21aaf5f708'
const CONTENT_DIR = path.join(process.cwd(), 'docs', 'course-content', 'bloom-again')

const ASSETS = [
  {
    name: 'guide',
    downloadId: 'bc9218b0-37e8-4fd4-9d6a-cfe488fd0abe',
    file: 'bloom-again.html',
    contentType: 'text/html',
  },
  {
    name: 'pdf',
    downloadId: '3d69383c-76ad-4d2f-af85-0b7e3362833d',
    file: 'bloom-again.pdf',
    contentType: 'application/pdf',
  },
]

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const publicUrl = env.R2_PUBLIC_URL.replace(/\/+$/, '')
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})

for (const asset of ASSETS) {
  const keyArgIdx = process.argv.indexOf(`--${asset.name}-key`)
  let key = keyArgIdx > -1 ? process.argv[keyArgIdx + 1] : null

  if (!key) {
    const ext = path.extname(asset.file).slice(1)
    key = `courses/${COURSE_ID}/downloads/${randomUUID()}.${ext}`
    await s3.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: fs.readFileSync(path.join(CONTENT_DIR, asset.file)),
      ContentType: asset.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    console.log(`[${asset.name}] uploaded:`, `${publicUrl}/${key}`)
  }

  const probe = await fetch(`${publicUrl}/${key}`, { method: 'HEAD' })
  if (!probe.ok) {
    console.error(`[${asset.name}] Aborting: ${publicUrl}/${key} returned ${probe.status}; row left untouched.`)
    continue
  }

  const { data: before, error: readErr } = await supabase
    .from('downloads').select('*').eq('id', asset.downloadId).single()
  if (readErr || !before) {
    console.error(`[${asset.name}] Could not read downloads row:`, readErr?.message)
    continue
  }
  console.log(`[${asset.name}] before:`, JSON.stringify(before))

  if (before.file_url === `${publicUrl}/${key}`) {
    console.log(`[${asset.name}] already repaired, skipping.`)
    continue
  }

  const { data: after, error: writeErr } = await supabase
    .from('downloads')
    .update({ file_url: `${publicUrl}/${key}`, file_type: asset.contentType })
    .eq('id', asset.downloadId)
    .select()
    .single()
  if (writeErr) {
    console.error(`[${asset.name}] Update failed:`, writeErr.message)
    continue
  }
  console.log(`[${asset.name}] after:`, JSON.stringify(after))
}
console.log('Done. Roll back by setting file_url back to the "before" values above.')
