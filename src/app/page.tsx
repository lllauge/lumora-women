import type { Metadata } from 'next'
import Link from 'next/link'
import NavbarWrapper from '@/components/layout/NavbarWrapper'

export const metadata: Metadata = {
  title: "Reconnect With Your Body After Baby | Lumora Women",
  description: "Practical wellness education for women navigating postpartum recovery, hormone health, and every season of womanhood.",
}
import FooterWrapper from '@/components/layout/FooterWrapper'
import EmailCaptureForm from '@/components/home/EmailCaptureForm'
import HeroBloomVideo from '@/components/home/HeroBloomVideo'
import { createClient } from '@/lib/supabase/server'
import { ArrowRight, Quote } from 'lucide-react'

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getFeaturedCourses() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('courses')
    .select('id, title, subtitle, price, is_free, thumbnail_url')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(3)
  return data ?? []
}

async function getRecentPosts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, category, featured_image_url, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(3)
  return data ?? []
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="hero-section overflow-hidden"
      style={{ background: 'var(--page-bg)' }}
    >
      <div className="hero-mobile-bloom" aria-hidden="true">
        <HeroBloomVideo
          posterClassName="hero-mobile-bloom-poster"
          videoClassName="hero-mobile-bloom-video"
          preload="auto"
        />
      </div>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 py-16 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left, text */}
          <div className="hero-copy space-y-6">
            <span
              className="inline-block text-xs uppercase mb-2 px-4 py-1.5 rounded-full"
              style={{
                background: 'var(--section-tint)',
                color: 'var(--botanical-green)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                letterSpacing: '0.12em',
              }}
            >
              Postpartum &amp; Women&apos;s Wellness
            </span>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(2.75rem, 6vw, 4.25rem)',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Even Flowers Bloom in the Desert.
            </h1>

            <p
              className="max-w-[520px]"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '1.125rem',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}
            >
              Real courses, real women, real support. Everything you need to grow through this season and Bloom.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/courses"
                className="btn-primary"
                style={{ borderRadius: '9999px', padding: '0.875rem 2rem', fontSize: '0.9375rem' }}
              >
                Explore Courses
              </Link>
              <Link
                href="/start-here"
                className="px-8 py-4 rounded-full text-sm transition-all duration-300"
                style={{
                  background: 'transparent',
                  color: 'var(--dark-card-bg)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  letterSpacing: '0.03em',
                  border: '1.5px solid var(--dark-card-bg)',
                }}
              >
                Start for Free
              </Link>
            </div>
          </div>

          {/* Right, hero bloom video */}
          <div className="hero-bloom-wrap relative">
            <div
              className="hero-bloom-frame aspect-[4/5] overflow-hidden editorial-shadow transform lg:rotate-2 hover:rotate-0 transition-transform duration-700"
              style={{
                borderRadius: '120px',
                background: 'linear-gradient(135deg, var(--section-tint) 0%, var(--section-sand) 100%)',
              }}
            >
              <div className="hero-bloom-media">
                <HeroBloomVideo
                  posterClassName="hero-bloom-poster"
                  videoClassName="hero-bloom-video"
                />
                <div className="hero-bloom-overlay" aria-hidden="true" />
              </div>
            </div>
            <div
              className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full -z-10 animate-pulse"
              style={{ background: 'var(--section-sand)' }}
            />
          </div>

        </div>
      </div>
      <style>{`
        .hero-section {
          position: relative;
        }
        .hero-section > .max-w-7xl {
          position: relative;
          z-index: 2;
        }
        .hero-mobile-bloom {
          display: none;
        }
        .hero-bloom-media {
          position: relative;
          width: 100%;
          height: 100%;
          background: var(--section-tint);
        }
        .hero-bloom-poster,
        .hero-bloom-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hero-bloom-video {
          z-index: 1;
        }
        .hero-bloom-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(249, 248, 243, 0.08), rgba(232, 217, 197, 0.14)),
            radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.12), transparent 45%);
        }
        @media (max-width: 1023px) {
          .hero-section {
            min-height: auto;
            background: var(--page-bg);
          }
          .hero-mobile-bloom {
            display: block;
            position: absolute;
            inset: 0;
            z-index: 0;
            overflow: hidden;
            pointer-events: none;
          }
          .hero-mobile-bloom::after {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 2;
            background:
              radial-gradient(ellipse at 28% 42%, rgba(249, 248, 243, 0.9) 0%, rgba(249, 248, 243, 0.76) 36%, rgba(249, 248, 243, 0.28) 68%, rgba(249, 248, 243, 0.12) 100%),
              linear-gradient(180deg, rgba(249, 248, 243, 0.1) 0%, rgba(249, 248, 243, 0.24) 58%, rgba(249, 248, 243, 0.88) 100%);
          }
          .hero-mobile-bloom-poster,
          .hero-mobile-bloom-video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            opacity: 1;
            transform: scale(1.08);
          }
          .hero-mobile-bloom-poster {
            z-index: 0;
          }
          .hero-mobile-bloom-video {
            z-index: 1;
          }
          .hero-copy {
            max-width: 38rem;
            text-shadow: 0 1px 18px rgba(249, 248, 243, 0.9);
          }
          .hero-bloom-wrap {
            display: none;
          }
          .hero-mobile-bloom-video::-webkit-media-controls,
          .hero-mobile-bloom-video::-webkit-media-controls-panel,
          .hero-mobile-bloom-video::-webkit-media-controls-start-playback-button,
          .hero-bloom-video::-webkit-media-controls,
          .hero-bloom-video::-webkit-media-controls-panel,
          .hero-bloom-video::-webkit-media-controls-start-playback-button {
            display: none !important;
            -webkit-appearance: none;
          }
        }
        @media (max-width: 640px) {
          .hero-section > .max-w-7xl {
            padding-top: 4.25rem;
            padding-bottom: 4.5rem;
          }
          .hero-mobile-bloom-poster,
          .hero-mobile-bloom-video {
            opacity: 1;
            object-position: 58% center;
          }
          .hero-mobile-bloom::after {
            background:
              radial-gradient(ellipse at 32% 40%, rgba(249, 248, 243, 0.92) 0%, rgba(249, 248, 243, 0.72) 38%, rgba(249, 248, 243, 0.18) 72%, rgba(249, 248, 243, 0.04) 100%),
              linear-gradient(180deg, rgba(249, 248, 243, 0.04) 0%, rgba(249, 248, 243, 0.18) 58%, rgba(249, 248, 243, 0.9) 100%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-mobile-bloom-video,
          .hero-bloom-video {
            display: none;
          }
        }
      `}</style>
    </section>
  )
}

function StatsBar() {
  const stats = [
    { value: '500+', label: 'Women Enrolled' },
    { value: '6',    label: 'Expert Modules' },
    { value: '4.9★', label: 'Average Rating' },
    { value: 'Free', label: 'To Get Started' },
  ]

  return (
    <section style={{ background: 'var(--section-tint)' }} className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center space-y-1">
              <span
                className="block gold-text"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.125rem',
                  fontWeight: 700,
                }}
              >
                {s.value}
              </span>
              <span
                className="block text-xs uppercase"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  color: 'var(--text-secondary)',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

type CourseCardData = {
  id: string
  title: string
  subtitle: string | null
  price: number
  is_free: boolean
  thumbnail_url: string | null
  tag?: string | null
}

function FeaturedCourses({ courses }: { courses: CourseCardData[] }) {
  const themes = ['cream', 'sage', 'forest'] as const

  const placeholders: CourseCardData[] = [
    {
      id: 'p-bloom',
      title: 'Bloom Again',
      subtitle: "A complete postpartum wellness course built around what you're actually going through.",
      price: 39, is_free: false, thumbnail_url: null, tag: 'Foundational',
    },
    {
      id: 'p-hormone',
      title: 'Hormone Health 101',
      subtitle: 'Understand your cycle, your hormones, and what your body is trying to tell you.',
      price: 0, is_free: true, thumbnail_url: null, tag: 'Free',
    },
    {
      id: 'p-fourth',
      title: 'The Fourth Trimester',
      subtitle: 'What no one tells you about the first 12 weeks after birth.',
      price: 29, is_free: false, thumbnail_url: null, tag: 'Postpartum',
    },
  ]

  const items = courses.length > 0 ? courses : placeholders

  return (
    <section style={{ background: 'var(--page-bg)' }} className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16">

        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              Featured Courses
            </h2>
            <p
              className="mt-2"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '1rem',
                color: 'var(--text-secondary)',
              }}
            >
              Curated pathways to your inner growth.
            </p>
          </div>
          <Link
            href="/courses"
            className="hidden md:flex items-center gap-2 group gold-text"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
            }}
          >
            View All Courses
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--gold-dark)' }} />
          </Link>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {items.slice(0, 3).map((course, i) => (
            <EditorialCourseCard
              key={course.id}
              course={course}
              theme={themes[i] ?? 'cream'}
              isPlaceholder={courses.length === 0}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function EditorialCourseCard({
  course,
  theme,
  isPlaceholder,
}: {
  course: CourseCardData
  theme: 'cream' | 'sage' | 'forest'
  isPlaceholder: boolean
}) {
  const palette = {
    cream:  { bg: '#FFFFFF',                    fg: 'var(--text-primary)',    sub: 'var(--text-secondary)',           imgBg: 'var(--pale-botanical)',   border: '1px solid rgba(200,220,192,0.35)' },
    sage:   { bg: 'var(--section-tint)',         fg: 'var(--dark-card-bg)',    sub: 'rgba(30, 50, 32, 0.75)',          imgBg: 'var(--botanical-light)',  border: 'none' },
    forest: { bg: 'var(--dark-card-bg)',         fg: '#FFFFFF',                sub: 'rgba(200, 220, 192, 0.75)',       imgBg: '#162814',                 border: 'none' },
  }[theme]

  const tag = course.tag ?? (course.is_free ? 'Free' : 'Course')

  const tagBadge =
    theme === 'cream'
      ? { background: 'var(--section-tint)',          color: 'var(--botanical-green)' }
      : theme === 'sage'
      ? { background: '#FFFFFF',                       color: 'var(--dark-card-bg)' }
      : { background: 'rgba(240,208,96,0.15)',         color: 'var(--gold-start)' }

  const button =
    theme === 'cream'
      ? { kind: 'outline-soft' as const,  label: 'Learn More' }
      : theme === 'sage'
      ? { kind: 'sage-filled' as const,   label: course.is_free ? 'Get Access' : 'Enroll Now' }
      : { kind: 'gold-filled' as const,   label: course.is_free ? 'Get Access' : 'Start Journey' }

  const href = isPlaceholder
    ? '/courses'
    : course.is_free
    ? `/free-course/${course.id}`
    : `/courses/${course.id}`

  return (
    <div
      className="rounded-2xl editorial-shadow group hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden"
      style={{ background: palette.bg, border: palette.border }}
    >
      {/* Gold top line */}
      <div className="gold-line" style={{ height: '3px', flexShrink: 0 }} />

      {/* Thumbnail */}
      <div className="relative mb-0 overflow-hidden aspect-video p-0" style={{ background: palette.imgBg }}>
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={`${course.title} course thumbnail`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div aria-hidden="true" className="w-full h-full flex items-center justify-center opacity-50">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: palette.fg }}>L</span>
          </div>
        )}
        <span
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs"
          style={{
            ...tagBadge,
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {tag}
        </span>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3
          className="mb-3"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: palette.fg,
          }}
        >
          {course.title}
        </h3>
        {course.subtitle && (
          <p
            className="mb-6 flex-1"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: palette.sub,
            }}
          >
            {course.subtitle}
          </p>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-3 mt-auto">
          <span
            className={theme === 'forest' ? 'gold-text' : ''}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: theme === 'forest' ? undefined : palette.fg,
            }}
          >
            {course.is_free ? 'Free' : `$${Number(course.price).toFixed(0)}`}
          </span>
          <Link href={href} className={
            button.kind === 'outline-soft' ? 'btn-outline-soft' :
            button.kind === 'sage-filled'  ? 'btn-sage' :
                                             'btn-gold'
          }>
            {button.label}
          </Link>
        </div>
      </div>
    </div>
  )
}

function QuoteSection() {
  return (
    <section
      className="py-24 lg:py-32 flex flex-col items-center justify-center text-center px-5"
      style={{ background: 'var(--section-sand)' }}
    >
      {/* Gold quote mark */}
      <Quote
        className="w-14 h-14 mb-8"
        strokeWidth={1.5}
        style={{ color: 'var(--gold-dark)' }}
      />
      <blockquote
        className="max-w-3xl mb-8"
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
        }}
      >
        &ldquo;Healing isn&apos;t linear. It&apos;s not a checklist or a timeline. It&apos;s showing up for yourself, again and again, even when it&apos;s hard.&rdquo;
      </blockquote>
      <cite
        className="not-italic uppercase gold-text"
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: '0.875rem',
          letterSpacing: '0.2em',
        }}
      >
       , Lumora Women
      </cite>
    </section>
  )
}

function FromTheBlog({
  posts,
}: {
  posts: {
    id: string
    title: string
    slug: string
    category: string | null
    featured_image_url: string | null
    created_at: string
  }[]
}) {
  const placeholders = [
    { id: 'p1', slug: '#', category: 'Postpartum', title: 'What Actually Happens to Your Body in the Fourth Trimester', featured_image_url: null, created_at: '' },
    { id: 'p2', slug: '#', category: 'Hormones',   title: 'The Hormone Changes No One Warns You About After Birth',     featured_image_url: null, created_at: '' },
    { id: 'p3', slug: '#', category: 'Wellness',   title: 'How to Build a Postpartum Support System That Actually Works', featured_image_url: null, created_at: '' },
  ]

  const items = posts.length > 0 ? posts : placeholders

  return (
    <section style={{ background: 'var(--page-bg)' }} className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 lg:mb-16">
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              Real Talk
            </h2>
            <div
              className="w-20 h-[3px] mt-4"
              style={{ background: 'var(--gold-gradient)' }}
            />
          </div>
          <Link
            href="/blog"
            className="hidden md:flex items-center gap-2 group gold-text"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
            }}
          >
            Read All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--gold-dark)' }} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {items.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group"
            >
              <div
                className="overflow-hidden rounded-xl mb-4"
                style={{ background: 'var(--pale-botanical)' }}
              >
                {/* Gold top line on blog card */}
                <div className="gold-line" style={{ height: '3px' }} />
                <div className="aspect-[16/10]">
                  {post.featured_image_url ? (
                    <img
                      src={post.featured_image_url}
                      alt={`Featured image for: ${post.title}`}
                      className="blog-card-art w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div aria-hidden="true" className="w-full h-full flex items-center justify-center">
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--botanical-green)', opacity: 0.6 }}>L</span>
                    </div>
                  )}
                </div>
              </div>
              {post.category && (
                <span
                  className="block uppercase mb-2"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    color: 'var(--botanical-green)',
                  }}
                >
                  {post.category}
                </span>
              )}
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: 'var(--text-primary)',
                  transition: 'color 0.15s',
                }}
              >
                {post.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function InnerCircle() {
  return (
    <section className="py-16 lg:py-24 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div
          className="relative overflow-hidden p-10 lg:p-20 flex flex-col items-center text-center"
          style={{
            background: 'var(--nav-bg)',
            borderRadius: '40px',
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32"
            style={{ background: 'rgba(30, 50, 32, 0.6)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl -ml-32 -mb-32"
            style={{ background: 'rgba(74, 122, 64, 0.2)' }}
          />

          <span
            className="relative text-xs uppercase mb-4 gold-text"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              letterSpacing: '0.2em',
            }}
          >
            Free Community
          </span>

          <h2
            className="relative mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            Join the Inner Circle
          </h2>

          <p
            className="relative max-w-xl mb-10"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.125rem',
              lineHeight: 1.6,
              color: 'rgba(200, 220, 192, 0.8)',
            }}
          >
            Weekly letters on mindfulness, exclusive course early-access, and seasonal wellness rituals delivered to your inbox. Honest conversations about the parts of womanhood no one talks about.
          </p>

          <div className="relative w-full">
            <EmailCaptureForm />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [courses, posts] = await Promise.all([getFeaturedCourses(), getRecentPosts()])

  return (
    <>
      <NavbarWrapper />
      <main id="main-content">
        <Hero />
        <StatsBar />
        <FeaturedCourses courses={courses} />
        <QuoteSection />
        <FromTheBlog posts={posts} />
        <InnerCircle />
      </main>
      <FooterWrapper />
    </>
  )
}
