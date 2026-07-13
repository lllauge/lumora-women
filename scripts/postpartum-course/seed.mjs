#!/usr/bin/env node
/**
 * Seeds "The Postpartum Reset" course into Supabase + R2.
 *
 * - Creates the course UNPUBLISHED (draft) so it can be reviewed in the
 *   admin (/admin/courses) before going live.
 * - Uploads each lesson guide from docs/course-content/postpartum-reset/
 *   to R2 under courses/<courseId>/downloads/<uuid>.html and registers it
 *   in the downloads table (rendered inline by the lesson page).
 * - Creates a generated brand thumbnail.
 * - Refuses to run twice: aborts if a course with the same title exists.
 *
 * Run: node scripts/postpartum-course/seed.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { LIBRARY } from './library.mjs'

// ── env ──────────────────────────────────────────────────────────────────────
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
const BUCKET = env.R2_BUCKET_NAME

const GUIDES_DIR = path.join(process.cwd(), 'docs', 'course-content', 'postpartum-reset')

const COURSE = {
  title: 'The Postpartum Reset',
  subtitle:
    'A 6-week strength and nourishment program for the fourth trimester — rebuild your core, restore your energy, and come back stronger than before.',
  description:
    'Six weeks, three short workouts a week, and a food method built on adding — never restricting. ' +
    'The Postpartum Reset starts where postpartum recovery actually starts: your breath, deep core, and pelvic floor. ' +
    'From there you build real strength with simple dumbbell training you can do at home or at the gym, while three gentle ' +
    'nutrition phases layer in the foods your recovery (and your milk supply, if you are nursing) depends on. ' +
    'Evidence-informed, mother-paced, and designed to be repeated as you get stronger.',
  price: 49,
  is_free: false,
}

// content lesson order → guide file
const CONTENT_LESSONS = [
  { module: 'Start Here', title: 'Welcome to Your Reset', file: '01-welcome.html', content: 'What this program is, who it is for, and the two ground rules before you begin.' },
  { module: 'Nourish · The Food Phases', title: 'Phase 1 · Build Your Base', file: '02-nourish-phase-1.html', content: 'Three small daily food additions — berries, leafy greens, and nuts — repeated for two weeks.' },
  { module: 'Nourish · The Food Phases', title: 'Phase 2 · Power Up Your Plate', file: '03-nourish-phase-2.html', content: 'Omega-3 seeds, a palm of protein at every meal, and whole grains. The recovery heavyweights.' },
  { module: 'Nourish · The Food Phases', title: 'Phase 3 · Hydrate & Sustain', file: '04-nourish-phase-3.html', content: 'Realistic hydration targets, habit anchors that make water automatic, and how the phases become a lifestyle.' },
  { module: 'Rebuild · The 6-Week Strength Plan', title: 'Before You Begin', file: '05-before-you-begin.html', content: 'Medical clearance, the diastasis self-check, warning signs to respect, and the Foundation Five warm-up.' },
  { module: 'Rebuild · The 6-Week Strength Plan', title: 'Week 1 · Reconnect', file: '06-week-1.html', content: 'Light, controlled, zero impact. Groove the movements and find your breath under load.' },
  { module: 'Rebuild · The 6-Week Strength Plan', title: 'Week 2 · Foundation', file: '07-week-2.html', content: 'Same calm pace, a little more volume.' },
  { module: 'Rebuild · The 6-Week Strength Plan', title: 'Week 3 · Build', file: '08-week-3.html', content: 'Heavier dumbbells, four sets. This is where change begins — and Phase 2 eating starts.' },
  { module: 'Rebuild · The 6-Week Strength Plan', title: 'Week 4 · Strengthen', file: '09-week-4.html', content: 'The halfway mark. Heavier, more confident, visibly stronger.' },
  { module: 'Rebuild · The 6-Week Strength Plan', title: 'Week 5 · Progress', file: '10-week-5.html', content: 'Peak strength, plus the impact-readiness check and optional jump work.' },
  { module: 'Rebuild · The 6-Week Strength Plan', title: 'Week 6 · Thrive', file: '11-week-6.html', content: 'Your strongest week — and how to repeat the program heavier.' },
]

// Exercise library lives in library.mjs (shared with update-workouts.mjs).

// ── thumbnail SVG ────────────────────────────────────────────────────────────
const THUMB_SVG = `<svg width="1200" height="675" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="675" fill="#1E3220"/>
  <rect x="26" y="26" width="1148" height="623" fill="none" stroke="#C8980A" stroke-width="1.5" opacity="0.75"/>
  <rect x="34" y="34" width="1132" height="607" fill="none" stroke="#C8980A" stroke-width="0.75" opacity="0.4"/>
  <g opacity="0.10" stroke="#C8DCC0" fill="none" stroke-width="2.5">
    <path d="M80 560 C 180 460, 160 380, 90 300 M90 300 C 150 350, 190 430, 150 520"/>
    <path d="M1110 130 C 1010 220, 1030 310, 1105 380 M1105 380 C 1045 330, 1010 250, 1050 160"/>
  </g>
  <g transform="translate(600,180)">
    <circle r="52" fill="none" stroke="#C8980A" stroke-width="1.5"/>
    <path d="M0 -30 C 12 -16, 16 -2, 0 26 C -16 -2, -12 -16, 0 -30 Z" fill="#C8DCC0"/>
    <path d="M0 -22 L0 18" stroke="#1E3220" stroke-width="2"/>
  </g>
  <text x="600" y="290" text-anchor="middle" font-family="Georgia, serif" font-size="26" letter-spacing="14" fill="#C8DCC0">L U M O R A &#160;W O M E N</text>
  <text x="600" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#FFFFFF">The Postpartum Reset</text>
  <text x="600" y="440" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="26" fill="#F0D060">strength &#183; nourishment &#183; the fourth trimester</text>
  <rect x="480" y="480" width="240" height="2" fill="#C8980A"/>
  <text x="600" y="530" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="6" fill="#C8DCC0">A 6-WEEK PROGRAM</text>
</svg>`

// ── helpers ──────────────────────────────────────────────────────────────────
async function uploadToR2(key, body, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
}

async function main() {
  // 0. refuse to double-seed
  const { data: existing, error: exErr } = await supabase
    .from('courses').select('id').eq('title', COURSE.title).maybeSingle()
  if (exErr) throw new Error(`course lookup failed: ${exErr.message}`)
  if (existing) {
    console.error(`A course titled "${COURSE.title}" already exists (${existing.id}). Aborting — edit it in /admin/courses instead.`)
    process.exit(1)
  }

  // 1. course (draft)
  const { data: course, error: cErr } = await supabase
    .from('courses')
    .insert({ ...COURSE, thumbnail_url: null, published: false })
    .select('id')
    .single()
  if (cErr) throw new Error(`course insert failed: ${cErr.message}`)
  const courseId = course.id
  console.log('course created (draft):', courseId)

  // 2. thumbnail
  const png = await sharp(Buffer.from(THUMB_SVG)).png().toBuffer()
  const thumbKey = `courses/${courseId}/thumbnails/${randomUUID()}.png`
  await uploadToR2(thumbKey, png, 'image/png')
  const thumbUrl = `${env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${thumbKey}`
  const { error: tErr } = await supabase.from('courses').update({ thumbnail_url: thumbUrl }).eq('id', courseId)
  if (tErr) throw new Error(`thumbnail update failed: ${tErr.message}`)
  console.log('thumbnail uploaded:', thumbUrl)

  // 3. modules
  const moduleTitles = [...new Set(CONTENT_LESSONS.map((l) => l.module))]
  moduleTitles.push('The Exercise Library')
  const moduleIds = {}
  for (let i = 0; i < moduleTitles.length; i++) {
    const { data, error } = await supabase
      .from('modules')
      .insert({ course_id: courseId, title: moduleTitles[i], order_number: i })
      .select('id')
      .single()
    if (error) throw new Error(`module insert failed (${moduleTitles[i]}): ${error.message}`)
    moduleIds[moduleTitles[i]] = data.id
    console.log('module:', moduleTitles[i])
  }

  // 4. content lessons + guide uploads
  const perModuleCount = {}
  for (const lesson of CONTENT_LESSONS) {
    const order = perModuleCount[lesson.module] ?? 0
    perModuleCount[lesson.module] = order + 1

    const { data: l, error: lErr } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleIds[lesson.module],
        title: lesson.title,
        content: lesson.content,
        video_url: null,
        order_number: order,
      })
      .select('id')
      .single()
    if (lErr) throw new Error(`lesson insert failed (${lesson.title}): ${lErr.message}`)

    const html = fs.readFileSync(path.join(GUIDES_DIR, lesson.file))
    const key = `courses/${courseId}/downloads/${randomUUID()}.html`
    await uploadToR2(key, html, 'text/html')

    const { error: dErr } = await supabase.from('downloads').insert({
      lesson_id: l.id,
      file_name: lesson.file,
      file_url: `r2://${key}`,
      file_type: 'text/html',
    })
    if (dErr) throw new Error(`download insert failed (${lesson.title}): ${dErr.message}`)
    console.log('lesson + guide:', lesson.title)
  }

  // 5. exercise library lessons (text cues; videos attachable later in admin)
  for (let i = 0; i < LIBRARY.length; i++) {
    const [title, cues] = LIBRARY[i]
    const { error } = await supabase.from('lessons').insert({
      module_id: moduleIds['The Exercise Library'],
      title,
      content: cues,
      video_url: null,
      order_number: i,
    })
    if (error) throw new Error(`library lesson failed (${title}): ${error.message}`)
  }
  console.log(`exercise library: ${LIBRARY.length} lessons`)

  console.log('\nDone. The course is a DRAFT (unpublished).')
  console.log(`Review it at /admin/courses/edit/${courseId} — set the price, attach your videos, then publish.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
