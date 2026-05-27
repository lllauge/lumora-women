import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CourseEditor from '@/components/admin/course-editor/CourseEditor'
import { isR2Configured } from '@/lib/r2'
import { isStreamConfigured } from '@/lib/cloudflare-stream'
import { createClient } from '@/lib/supabase/server'
import { newKey, type CourseDraft } from '@/components/admin/course-editor/types'

export const metadata: Metadata = {
  title: 'Edit Course',
  robots: { index: false, follow: false },
}

type Params = Promise<{ courseId: string }>

type CourseRow = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  price: number | string
  is_free: boolean
  thumbnail_url: string | null
}

type ModuleRow = {
  id: string
  course_id: string
  title: string
  order_number: number | null
}

type LessonRow = {
  id: string
  module_id: string
  title: string
  content: string | null
  video_url: string | null
  order_number: number | null
}

type DownloadRow = {
  id: string
  lesson_id: string
  file_name: string
  file_url: string
  file_type: string | null
}

async function loadCourse(courseId: string): Promise<CourseDraft | null> {
  const supabase = await createClient()

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, subtitle, description, price, is_free, thumbnail_url')
    .eq('id', courseId)
    .maybeSingle<CourseRow>()

  if (courseErr || !course) return null

  const { data: modules } = await supabase
    .from('modules')
    .select('id, course_id, title, order_number')
    .eq('course_id', courseId)
    .order('order_number', { ascending: true })
    .returns<ModuleRow[]>()

  const moduleIds = (modules ?? []).map((m) => m.id)
  const { data: lessons } = moduleIds.length
    ? await supabase
        .from('lessons')
        .select('id, module_id, title, content, video_url, order_number')
        .in('module_id', moduleIds)
        .order('order_number', { ascending: true })
        .returns<LessonRow[]>()
    : { data: [] as LessonRow[] }

  const lessonIds = (lessons ?? []).map((l) => l.id)
  const { data: downloads } = lessonIds.length
    ? await supabase
        .from('downloads')
        .select('id, lesson_id, file_name, file_url, file_type')
        .in('lesson_id', lessonIds)
        .returns<DownloadRow[]>()
    : { data: [] as DownloadRow[] }

  const downloadsByLesson = new Map<string, DownloadRow[]>()
  for (const d of downloads ?? []) {
    const arr = downloadsByLesson.get(d.lesson_id) ?? []
    arr.push(d)
    downloadsByLesson.set(d.lesson_id, arr)
  }

  const lessonsByModule = new Map<string, LessonRow[]>()
  for (const l of lessons ?? []) {
    const arr = lessonsByModule.get(l.module_id) ?? []
    arr.push(l)
    lessonsByModule.set(l.module_id, arr)
  }

  return {
    id: course.id,
    title:         course.title,
    subtitle:      course.subtitle ?? '',
    description:   course.description ?? '',
    price:         Number(course.price ?? 0),
    is_free:       course.is_free,
    thumbnail_url: course.thumbnail_url ?? '',
    modules: (modules ?? []).map((m) => ({
      id:    m.id,
      _key:  newKey('m'),
      title: m.title,
      lessons: (lessonsByModule.get(m.id) ?? []).map((l) => ({
        id:        l.id,
        _key:      newKey('l'),
        title:     l.title,
        content:   l.content ?? '',
        video_url: l.video_url ?? '',
        downloads: (downloadsByLesson.get(l.id) ?? []).map((d) => ({
          id:        d.id,
          _key:      newKey('d'),
          file_name: d.file_name,
          file_url:  d.file_url,
          file_type: d.file_type,
        })),
      })),
    })),
  }
}

export default async function EditCoursePage({ params }: { params: Params }) {
  const { courseId } = await params

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseConfigured) return notFound()

  const initial = await loadCourse(courseId)
  if (!initial) return notFound()

  return (
    <CourseEditor
      mode="edit"
      r2Configured={isR2Configured()}
      streamConfigured={isStreamConfigured()}
      initial={initial}
    />
  )
}
