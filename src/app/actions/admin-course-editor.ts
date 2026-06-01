'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { inferExtension, isR2Configured, uploadFileToR2 } from '@/lib/r2'
import { getStreamDirectUploadUrl, isStreamConfigured, type StreamDirectUploadResult } from '@/lib/cloudflare-stream'

export { isStreamConfigured }

/**
 * Returns a one-time Cloudflare Stream TUS upload URL.
 * The browser uploads directly to Cloudflare — no server proxy.
 */
export async function getStreamUploadUrl(): Promise<StreamDirectUploadResult> {
  return getStreamDirectUploadUrl()
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const downloadSchema = z.object({
  id: z.string().uuid().optional(),
  file_name: z.string().min(1).max(255),
  file_url:  z.string().min(1).max(2048),
  file_type: z.string().max(120).nullable().optional(),
})

const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  title:     z.string().min(1).max(255),
  content:   z.string().max(20000).nullable().optional().default(''),
  video_url: z.string().max(2048).nullable().optional().default(''),
  downloads: z.array(downloadSchema).default([]),
})

const moduleSchema = z.object({
  id: z.string().uuid().optional(),
  title:   z.string().min(1).max(255),
  lessons: z.array(lessonSchema).default([]),
})

const courseSchema = z.object({
  id: z.string().uuid().optional(),
  title:          z.string().min(1, 'Title is required').max(255),
  subtitle:       z.string().max(500).nullable().optional().default(''),
  description:    z.string().max(20000).nullable().optional().default(''),
  price:          z.number().min(0).max(10000),
  is_free:        z.boolean(),
  thumbnail_url:  z.string().max(2048).nullable().optional().default(''),
  modules:        z.array(moduleSchema).default([]),
})

export type CourseDraft = z.infer<typeof courseSchema>

type SaveResult =
  | { ok: true;  courseId: string }
  | { ok: false; error: string;  fieldErrors?: Record<string, string[]> }

// ─── Save (handles both create + edit) ────────────────────────────────────────

/**
 * Accepts the full desired state of a course tree. For new courses, creates
 * everything. For existing courses, diffs against the DB:
 *   - matching ids → UPDATE
 *   - new entries  → INSERT
 *   - missing ids  → DELETE
 * This preserves lesson_progress rows for lessons that survive the save.
 *
 * Downloads use a simpler replace strategy per lesson (no progress data attached).
 */
export async function saveCourse(
  rawDraft: unknown,
  options: { publish: boolean }
): Promise<SaveResult> {
  const parsed = courseSchema.safeParse(rawDraft)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }
  const draft = parsed.data
  const supabase = await createClient()

  // ── 1. Course row ────────────────────────────────────────────────────────
  const coursePayload = {
    title:          draft.title.trim(),
    subtitle:       draft.subtitle?.trim() || null,
    description:    draft.description?.trim() || null,
    price:          draft.is_free ? 0 : draft.price,
    is_free:        draft.is_free,
    thumbnail_url:  draft.thumbnail_url?.trim() || null,
    published:      options.publish,
  }

  let courseId: string
  if (draft.id) {
    const { error } = await supabase.from('courses').update(coursePayload).eq('id', draft.id)
    if (error) return { ok: false, error: `Could not update course: ${error.message}` }
    courseId = draft.id
  } else {
    const { data, error } = await supabase
      .from('courses')
      .insert(coursePayload)
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: `Could not create course: ${error?.message ?? 'unknown error'}` }
    courseId = data.id
  }

  // ── 2. Modules — diff & write ────────────────────────────────────────────
  const { data: existingModulesRaw } = await supabase
    .from('modules').select('id').eq('course_id', courseId)
  const existingModuleIds = new Set((existingModulesRaw ?? []).map((m) => m.id as string))

  const keptModuleIds  = new Set<string>()
  // module-position-in-draft → resolved DB id (for child lesson FK)
  const moduleResolvedIds: string[] = []

  for (let i = 0; i < draft.modules.length; i++) {
    const m = draft.modules[i]
    const modulePayload = { title: m.title.trim(), order_number: i }

    if (m.id && existingModuleIds.has(m.id)) {
      const { error } = await supabase.from('modules').update(modulePayload).eq('id', m.id)
      if (error) return { ok: false, error: `Could not update module: ${error.message}` }
      moduleResolvedIds[i] = m.id
      keptModuleIds.add(m.id)
    } else {
      const { data, error } = await supabase
        .from('modules')
        .insert({ ...modulePayload, course_id: courseId })
        .select('id')
        .single()
      if (error || !data) return { ok: false, error: `Could not create module: ${error?.message ?? 'unknown'}` }
      moduleResolvedIds[i] = data.id
      keptModuleIds.add(data.id)
    }
  }

  // Delete modules absent from draft (cascade kills their lessons + downloads)
  const moduleIdsToDelete = [...existingModuleIds].filter((id) => !keptModuleIds.has(id))
  if (moduleIdsToDelete.length > 0) {
    const { error } = await supabase.from('modules').delete().in('id', moduleIdsToDelete)
    if (error) return { ok: false, error: `Could not remove old modules: ${error.message}` }
  }

  // ── 3. Lessons per module — diff & write ─────────────────────────────────
  for (let i = 0; i < draft.modules.length; i++) {
    const courseModule = draft.modules[i]
    const moduleId = moduleResolvedIds[i]

    const { data: existingLessonsRaw } = await supabase
      .from('lessons').select('id').eq('module_id', moduleId)
    const existingLessonIds = new Set((existingLessonsRaw ?? []).map((l) => l.id as string))

    const keptLessonIds = new Set<string>()
    const lessonResolvedIds: string[] = []

    for (let j = 0; j < courseModule.lessons.length; j++) {
      const l = courseModule.lessons[j]
      const lessonPayload = {
        title:        l.title.trim(),
        content:      l.content?.trim() || null,
        video_url:    l.video_url?.trim() || null,
        order_number: j,
      }

      if (l.id && existingLessonIds.has(l.id)) {
        const { error } = await supabase.from('lessons').update(lessonPayload).eq('id', l.id)
        if (error) return { ok: false, error: `Could not update lesson: ${error.message}` }
        lessonResolvedIds[j] = l.id
        keptLessonIds.add(l.id)
      } else {
        const { data, error } = await supabase
          .from('lessons')
          .insert({ ...lessonPayload, module_id: moduleId })
          .select('id')
          .single()
        if (error || !data) return { ok: false, error: `Could not create lesson: ${error?.message ?? 'unknown'}` }
        lessonResolvedIds[j] = data.id
        keptLessonIds.add(data.id)
      }
    }

    const lessonIdsToDelete = [...existingLessonIds].filter((id) => !keptLessonIds.has(id))
    if (lessonIdsToDelete.length > 0) {
      const { error } = await supabase.from('lessons').delete().in('id', lessonIdsToDelete)
      if (error) return { ok: false, error: `Could not remove old lessons: ${error.message}` }
    }

    // ── 4. Downloads per lesson — replace strategy ─────────────────────────
    for (let j = 0; j < courseModule.lessons.length; j++) {
      const lessonId = lessonResolvedIds[j]
      const downloads = courseModule.lessons[j].downloads

      // Wipe and re-insert. Downloads carry no progress data.
      const { error: delErr } = await supabase.from('downloads').delete().eq('lesson_id', lessonId)
      if (delErr) return { ok: false, error: `Could not clear downloads: ${delErr.message}` }

      if (downloads.length > 0) {
        const { error: insErr } = await supabase.from('downloads').insert(
          downloads.map((d) => ({
            lesson_id: lessonId,
            file_name: d.file_name.trim(),
            file_url:  d.file_url.trim(),
            file_type: d.file_type?.trim() || null,
          }))
        )
        if (insErr) return { ok: false, error: `Could not save downloads: ${insErr.message}` }
      }
    }
  }

  // ── 5. Revalidate ─────────────────────────────────────────────────────────
  revalidatePath('/admin/courses')
  revalidatePath(`/admin/courses/edit/${courseId}`)
  revalidatePath('/admin') // dashboard stats might change

  return { ok: true, courseId }
}

// ─── Asset upload (thumbnails + lesson downloads) ────────────────────────────

export type UploadAssetResult =
  | { ok: true;  url: string; name: string; size: number; contentType: string }
  | { ok: false; error: string; r2Configured: boolean }

/**
 * Generic uploader used by the editor for both thumbnails and lesson downloads.
 * `kind`: 'thumbnail' | 'download' just controls the key prefix.
 */
export async function uploadCourseAsset(formData: FormData): Promise<UploadAssetResult> {
  const file     = formData.get('file')
  const kind     = (formData.get('kind') ?? '').toString()
  const courseId = (formData.get('courseId') ?? '').toString() || 'unfiled'

  if (!(file instanceof File))   return { ok: false, error: 'No file received.',   r2Configured: isR2Configured() }
  if (file.size === 0)           return { ok: false, error: 'File is empty.',       r2Configured: isR2Configured() }
  if (kind !== 'thumbnail' && kind !== 'download' && kind !== 'video') {
    return { ok: false, error: 'Invalid upload kind.', r2Configured: isR2Configured() }
  }

  const maxSize =
    kind === 'video' ? 2 * 1024 * 1024 * 1024 : 50 * 1024 * 1024
  const maxLabel = kind === 'video' ? '2 GB' : '50 MB'
  if (file.size > maxSize) {
    return { ok: false, error: `File too large (${maxLabel} max).`, r2Configured: isR2Configured() }
  }

  if (kind === 'thumbnail' && !file.type.startsWith('image/')) {
    return { ok: false, error: 'Thumbnails must be an image (JPG, PNG, WEBP).', r2Configured: isR2Configured() }
  }
  if (kind === 'video' && !file.type.startsWith('video/')) {
    return { ok: false, error: 'Please select a video file (MP4, MOV, WEBM).', r2Configured: isR2Configured() }
  }

  const ext = inferExtension(file)
  const folder =
    kind === 'thumbnail' ? `courses/${courseId}/thumbnails`
    : kind === 'video'   ? `courses/${courseId}/videos`
                         : `courses/${courseId}/downloads`
  const key = `${folder}/${randomUUID()}.${ext}`

  const result = await uploadFileToR2(file, key)
  if (!result.ok) return { ok: false, error: result.error, r2Configured: isR2Configured() }

  return {
    ok: true,
    url: kind === 'thumbnail' ? result.url : `r2://${result.key}`,
    name: file.name,
    size: result.size,
    contentType: result.contentType,
  }
}
