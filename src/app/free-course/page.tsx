import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function FreeCourseIndexPage() {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('is_free', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (course?.id) {
    redirect(`/free-course/${course.id}`)
  }

  redirect('/courses')
}
