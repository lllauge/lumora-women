'use server'

import { createClient } from '@/lib/supabase/server'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

export type CourseProgress = {
  course_id: string
  course_title: string
  course_is_free: boolean
  total_lessons: number
  completed_lessons: number
  enrolled_at: string
}

export type OrderHistoryItem = {
  id: string
  course_title: string | null
  amount: number
  status: string
  stripe_payment_id: string | null
  created_at: string
}

export type StudentDetail = {
  user: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    created_at: string
  }
  enrollments: CourseProgress[]
  orders: OrderHistoryItem[]
  totalSpent: number
}

type StudentDetailResult =
  | { ok: true;  detail: StudentDetail }
  | { ok: false; error: string }

/**
 * Returns everything the drawer needs for a single student: profile fields,
 * per-course progress %, full order history, lifetime total spent.
 *
 * Progress is computed in JS — we pull all lesson_progress rows for the user,
 * map lessons → modules → courses, and divide completed / total per course.
 */
export async function getStudentDetail(userId: string): Promise<StudentDetailResult> {
  if (!userId || typeof userId !== 'string') {
    return { ok: false, error: 'Missing user id.' }
  }

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    ;({ supabase } = await getVerifiedAdminUser())
  } catch {
    return { ok: false, error: 'Unauthorized.' }
  }

  const [
    userQ,
    enrollmentsQ,
    progressQ,
    ordersQ,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .eq('id', userId)
      .maybeSingle(),

    supabase
      .from('enrollments')
      .select('course_id, enrolled_at, courses(id, title, is_free)')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false }),

    supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId),

    supabase
      .from('orders')
      .select('id, course_id, amount, status, stripe_payment_id, created_at, courses(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  if (userQ.error || !userQ.data) {
    return { ok: false, error: userQ.error?.message ?? 'Student not found.' }
  }

  // ── Build per-course progress ─────────────────────────────────────────────
  type EnrollmentRow = {
    course_id: string
    enrolled_at: string
    courses: { id: string; title: string; is_free: boolean } | null
  }
  const enrollments = (enrollmentsQ.data ?? []) as unknown as EnrollmentRow[]
  const courseIds  = enrollments.map((e) => e.course_id).filter(Boolean)

  // Walk lessons → modules → courses for total counts
  const totalByCourse = new Map<string, number>()
  const lessonToCourse = new Map<string, string>()

  if (courseIds.length > 0) {
    const { data: modules } = await supabase
      .from('modules')
      .select('id, course_id')
      .in('course_id', courseIds)

    const moduleIds = (modules ?? []).map((m: { id: string }) => m.id)
    const moduleToCourse = new Map(
      ((modules ?? []) as { id: string; course_id: string }[]).map((m) => [m.id, m.course_id])
    )

    if (moduleIds.length > 0) {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', moduleIds)

      for (const l of (lessons ?? []) as { id: string; module_id: string }[]) {
        const cid = moduleToCourse.get(l.module_id)
        if (!cid) continue
        lessonToCourse.set(l.id, cid)
        totalByCourse.set(cid, (totalByCourse.get(cid) ?? 0) + 1)
      }
    }
  }

  const completedByCourse = new Map<string, number>()
  for (const p of (progressQ.data ?? []) as { lesson_id: string; completed: boolean }[]) {
    if (!p.completed) continue
    const cid = lessonToCourse.get(p.lesson_id)
    if (!cid) continue
    completedByCourse.set(cid, (completedByCourse.get(cid) ?? 0) + 1)
  }

  const enrollmentsView: CourseProgress[] = enrollments
    .filter((e) => !!e.courses)
    .map((e) => ({
      course_id:         e.course_id,
      course_title:      e.courses!.title,
      course_is_free:    e.courses!.is_free,
      total_lessons:     totalByCourse.get(e.course_id) ?? 0,
      completed_lessons: completedByCourse.get(e.course_id) ?? 0,
      enrolled_at:       e.enrolled_at,
    }))

  // ── Orders + total spent ──────────────────────────────────────────────────
  type OrderRow = {
    id: string
    course_id: string | null
    amount: number | string
    status: string
    stripe_payment_id: string | null
    created_at: string
    courses: { title: string | null } | null
  }
  const orderRows = (ordersQ.data ?? []) as unknown as OrderRow[]

  const orders: OrderHistoryItem[] = orderRows.map((o) => ({
    id:                o.id,
    course_title:      o.courses?.title ?? null,
    amount:            Number(o.amount ?? 0),
    status:            o.status,
    stripe_payment_id: o.stripe_payment_id,
    created_at:        o.created_at,
  }))

  const totalSpent = orders
    .filter((o) => o.status === 'paid')
    .reduce((acc, o) => acc + o.amount, 0)

  return {
    ok: true,
    detail: {
      user: userQ.data,
      enrollments: enrollmentsView,
      orders,
      totalSpent,
    },
  }
}
