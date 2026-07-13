#!/usr/bin/env node
/**
 * Syncs the live draft course with regenerated lesson guides and the
 * evidence-based exercise library.
 *
 * - Re-uploads every guide in docs/course-content/postpartum-reset/ to a NEW
 *   R2 key and repoints the lesson's downloads row (new key avoids any stale
 *   caching on the old immutable object).
 * - Replaces all lessons in "The Exercise Library" module with library.mjs.
 *
 * Run: node scripts/postpartum-course/generate-html.mjs && node scripts/postpartum-course/update-workouts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { LIBRARY } from './library.mjs'

const COURSE_TITLE = 'The Postpartum Reset'
const GUIDES_DIR = path.join(process.cwd(), 'docs', 'course-content', 'postpartum-reset')

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})

async function main() {
  const { data: course, error: cErr } = await supabase
    .from('courses').select('id').eq('title', COURSE_TITLE).single()
  if (cErr || !course) throw new Error(`course not found: ${cErr?.message}`)
  const courseId = course.id

  const { data: modules, error: mErr } = await supabase
    .from('modules')
    .select('id, title, lessons(id, title)')
    .eq('course_id', courseId)
  if (mErr) throw new Error(mErr.message)

  // ── 1. Re-upload guides and repoint downloads ─────────────────────────────
  const contentLessons = modules
    .filter((m) => m.title !== 'The Exercise Library')
    .flatMap((m) => m.lessons)

  for (const lesson of contentLessons) {
    const { data: dls, error: dErr } = await supabase
      .from('downloads').select('id, file_name').eq('lesson_id', lesson.id)
    if (dErr) throw new Error(dErr.message)
    const dl = (dls ?? []).find((d) => /\.html$/i.test(d.file_name))
    if (!dl) { console.warn('no HTML download for lesson:', lesson.title); continue }

    const filePath = path.join(GUIDES_DIR, dl.file_name)
    if (!fs.existsSync(filePath)) { console.warn('missing local guide:', dl.file_name); continue }

    const key = `courses/${courseId}/downloads/${randomUUID()}.html`
    await r2.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME, Key: key,
      Body: fs.readFileSync(filePath), ContentType: 'text/html',
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    // Store the full public URL, not r2://<key>. Production's R2 env points at
    // different buckets than local, so key-based lookups 502 there; the asset
    // route serves registered full URLs via its external-asset path instead.
    const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
    const { error: uErr } = await supabase
      .from('downloads').update({ file_url: publicUrl }).eq('id', dl.id)
    if (uErr) throw new Error(uErr.message)
    console.log('updated guide:', lesson.title)
  }

  // ── 2. Replace exercise library ───────────────────────────────────────────
  const libModule = modules.find((m) => m.title === 'The Exercise Library')
  if (!libModule) throw new Error('Exercise Library module not found')

  const oldIds = libModule.lessons.map((l) => l.id)
  if (oldIds.length) {
    // lesson_progress/downloads may reference lessons; library lessons have
    // neither in practice, but clean up defensively.
    await supabase.from('lesson_progress').delete().in('lesson_id', oldIds)
    await supabase.from('downloads').delete().in('lesson_id', oldIds)
    const { error: delErr } = await supabase.from('lessons').delete().in('id', oldIds)
    if (delErr) throw new Error(`library delete failed: ${delErr.message}`)
  }
  console.log(`removed ${oldIds.length} old library lessons`)

  for (let i = 0; i < LIBRARY.length; i++) {
    const [title, cues] = LIBRARY[i]
    const { error } = await supabase.from('lessons').insert({
      module_id: libModule.id, title, content: cues, video_url: null, order_number: i,
    })
    if (error) throw new Error(`library insert failed (${title}): ${error.message}`)
  }
  console.log(`inserted ${LIBRARY.length} new library lessons`)
  console.log('\nDone — live draft course now matches the regenerated content.')
}

main().catch((err) => { console.error(err); process.exit(1) })
