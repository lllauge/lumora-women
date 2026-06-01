import { Resend } from 'resend'

type CourseAccessClient = {
  // The project uses both @supabase/ssr and @supabase/supabase-js clients.
  // We only need the shared query-builder surface here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/+$/, '')
  }

  return 'https://www.lumorawomen.com'
}

export async function getCourseStartPath(supabase: CourseAccessClient, courseId: string) {
  const { data: modules } = await supabase
    .from('modules')
    .select('id, order_number')
    .eq('course_id', courseId)
    .order('order_number', { ascending: true })
    .limit(1)

  const firstModuleId = modules?.[0]?.id
  if (!firstModuleId) return `/courses/${courseId}`

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, order_number')
    .eq('module_id', firstModuleId)
    .order('order_number', { ascending: true })
    .limit(1)

  const firstLessonId = lessons?.[0]?.id
  return firstLessonId ? `/lesson/${firstLessonId}` : `/courses/${courseId}`
}

function accessEmailHtml(firstName: string | null, courseTitle: string, startUrl: string, dashboardUrl: string) {
  return `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 14px; font-size:32px;">Your course is ready</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 18px;">
          Hi ${firstName || 'there'}, your access to <strong>${courseTitle}</strong> is live.
        </p>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 22px;">
          Log in with the email and password you used at checkout, then start the course from your dashboard.
        </p>
        <a href="${startUrl}" style="display:inline-block; background:#3A4B36; color:#FFFFFF; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:700;">
          Start the Course
        </a>
        <p style="color:#6B6B64; font-size:13px; line-height:1.6; margin:28px 0 0;">
          Dashboard: <a href="${dashboardUrl}" style="color:#3A4B36;">${dashboardUrl}</a><br />
          Course link: <span style="word-break:break-all;">${startUrl}</span>
        </p>
      </div>
    </div>
  `
}

export async function sendCourseAccessEmail(
  supabase: CourseAccessClient,
  input: { userId: string; courseId: string }
) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const [{ data: user }, { data: course }] = await Promise.all([
    supabase
      .from('users')
      .select('email, first_name')
      .eq('id', input.userId)
      .maybeSingle(),
    supabase
      .from('courses')
      .select('title')
      .eq('id', input.courseId)
      .maybeSingle(),
  ])

  if (!user?.email || !course?.title) return

  const siteUrl = getSiteUrl()
  const startPath = await getCourseStartPath(supabase, input.courseId)
  const startUrl = `${siteUrl}${startPath}`
  const dashboardUrl = `${siteUrl}/dashboard`

  const resend = new Resend(resendKey)
  const firstName = user.first_name ?? null

  await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: user.email,
    subject: `Your access to ${course.title} is ready`,
    html: accessEmailHtml(firstName, course.title, startUrl, dashboardUrl),
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      `Your access to ${course.title} is live.`,
      'Log in with the email and password you used at checkout, then start the course from your dashboard.',
      '',
      `Start the course: ${startUrl}`,
      `Dashboard: ${dashboardUrl}`,
    ].join('\n'),
  })
}
