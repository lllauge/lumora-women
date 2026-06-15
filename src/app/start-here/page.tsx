import type { Metadata } from 'next'
import Link from 'next/link'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import EmailCaptureForm from '@/components/home/EmailCaptureForm'
import { createClient } from '@/lib/supabase/server'
import { getShowShop } from '@/lib/settings-schema'
import { ArrowRight, ArrowDown } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Start Here | Lumora Women',
  description: 'Not sure where to begin? Follow our guided roadmap to find your perfect path at Lumora Women.',
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

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

// ─── Types ─────────────────────────────────────────────────────────────────────

type CourseCardData = {
  id: string
  title: string
  subtitle: string | null
  price: number
  is_free: boolean
  thumbnail_url: string | null
}

// ─── Sections ──────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        background: 'var(--warm-white)',
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 5vw, 3rem)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--warm-terracotta)',
          background: 'var(--rose-blush)',
          padding: '0.375rem 1rem',
          borderRadius: '999px',
          marginBottom: '1.5rem',
        }}>
          Your Guided Roadmap
        </span>

        <h1 style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
          fontWeight: 500,
          color: 'var(--sage-green-dark)',
          lineHeight: 1.15,
          marginBottom: '1.5rem',
        }}>
          Not Sure Where to Start?
        </h1>

        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: 'clamp(1rem, 2.5vw, 1.1875rem)',
          color: 'var(--on-surface-variant)',
          lineHeight: 1.75,
          marginBottom: '2.5rem',
          maxWidth: '40rem',
          margin: '0 auto 2.5rem',
        }}>
          Every woman&apos;s journey to wellness looks different. We&apos;ve mapped out a simple
          path so you can find exactly where you belong, and begin there.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.125rem',
            fontStyle: 'italic',
            color: 'var(--sage-green-deep)',
          }}>
            Follow our guided roadmap
          </span>
          <ArrowDown
            size={20}
            strokeWidth={1.75}
            style={{ color: 'var(--sage-green-deep)', animation: 'bounce 1.8s infinite' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>
    </section>
  )
}

function Steps({ showShop }: { showShop: boolean }) {
  const allSteps = [
    {
      number: '01',
      badge: 'Free',
      title: 'Grab the Free Course',
      body: 'Begin your journey with our foundational wellness course, completely free. No credit card required. Just you, showing up for yourself.',
      cta: 'Enroll for Free',
      href: '/free-course',
      accent: 'var(--sage-green-dark)',
      bg: 'var(--sage-green-light)',
      badgeColor: { background: 'var(--burnished-gold)', color: '#241A00' },
    },
    {
      number: '02',
      badge: 'Community',
      title: 'Join the Inner Circle',
      body: 'Connect with a sisterhood of women walking the same path. Share, learn, and grow inside our private community space.',
      cta: 'Join Us',
      href: '/community',
      accent: 'var(--warm-terracotta)',
      bg: 'var(--rose-blush)',
      badgeColor: { background: 'var(--warm-terracotta)', color: '#fff' },
    },
    {
      number: '03',
      badge: 'Courses',
      title: 'Explore All Courses',
      body: 'Ready to go deeper? Browse our full library of holistic wellness courses designed around the rhythms of the feminine body and spirit.',
      cta: 'Explore All Courses',
      href: '/courses',
      accent: 'var(--sage-green-deep)',
      bg: 'var(--surface-container)',
      badgeColor: { background: 'var(--sage-green-deep)', color: '#fff' },
    },
    {
      number: '04',
      badge: 'Shop',
      title: 'Shop the Wellness Collection',
      body: 'Curated tools, rituals, and resources to support your daily practice, handpicked for the modern woman on a healing path.',
      cta: 'Shop the Collection',
      href: '/shop',
      accent: 'var(--deep-earth)',
      bg: 'var(--soft-cream)',
      badgeColor: { background: 'var(--deep-earth)', color: '#fff' },
    },
  ]

  const steps = (showShop ? allSteps : allSteps.filter((s) => s.href !== '/shop'))
    .map((s, i) => ({ ...s, number: String(i + 1).padStart(2, '0') }))
  const stepWord = ['One', 'Two', 'Three', 'Four', 'Five'][steps.length - 1] ?? `${steps.length}`

  return (
    <section style={{
      background: 'var(--surface-container-low)',
      padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 500,
            color: 'var(--sage-green-dark)',
            marginBottom: '1rem',
          }}>
            Your {stepWord}-Step Path
          </h2>
          <div style={{ width: '4rem', height: '3px', background: 'var(--sage-green-tint)', margin: '0 auto' }} />
        </div>

        <div className="steps-grid" style={{ ['--step-cols' as string]: steps.length }}>
          {steps.map((step, i) => (
            <div key={step.number} className="step-card" style={{ background: step.bg }}>
              {/* Number + Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <span style={{
                  fontFamily: 'var(--font-eb-garamond)',
                  fontSize: '3.5rem',
                  fontWeight: 400,
                  color: step.accent,
                  opacity: 0.2,
                  lineHeight: 1,
                }}>
                  {step.number}
                </span>
                <span style={{
                  ...step.badgeColor,
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                }}>
                  {step.badge}
                </span>
              </div>

              <h3 style={{
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '1.375rem',
                fontWeight: 500,
                color: 'var(--sage-green-dark)',
                marginBottom: '0.75rem',
                lineHeight: 1.3,
              }}>
                {step.title}
              </h3>

              <p style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.9rem',
                color: 'var(--on-surface-variant)',
                lineHeight: 1.7,
                marginBottom: '1.5rem',
                flex: 1,
              }}>
                {step.body}
              </p>

              <Link
                href={step.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: step.accent,
                  textDecoration: 'none',
                  letterSpacing: '0.03em',
                }}
                className="step-link"
              >
                {step.cta}
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .steps-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .steps-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .steps-grid {
            grid-template-columns: repeat(var(--step-cols, 4), 1fr);
          }
        }
        .step-card {
          padding: 2rem;
          border-radius: 1.25rem;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--outline-variant);
          transition: transform 0.25s;
        }
        .step-card:hover {
          transform: translateY(-6px);
        }
        .step-link:hover {
          opacity: 0.75;
        }
      `}</style>
    </section>
  )
}

function FeaturedPathways({ courses }: { courses: CourseCardData[] }) {
  const placeholders: CourseCardData[] = [
    {
      id: 'p-bloom',
      title: 'Bloom Again',
      subtitle: 'A complete postpartum wellness course built around what you\'re actually going through.',
      price: 39,
      is_free: false,
      thumbnail_url: null,
    },
    {
      id: 'p-hormone',
      title: 'Hormone Health 101',
      subtitle: 'Understand your cycle, your hormones, and what your body is trying to tell you.',
      price: 0,
      is_free: true,
      thumbnail_url: null,
    },
    {
      id: 'p-fourth',
      title: 'The Fourth Trimester',
      subtitle: 'What no one tells you about the first 12 weeks after birth.',
      price: 29,
      is_free: false,
      thumbnail_url: null,
    },
  ]

  const items = courses.length > 0 ? courses : placeholders
  const isPlaceholder = courses.length === 0

  return (
    <section style={{
      background: 'var(--warm-white)',
      padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 500,
            color: 'var(--sage-green-dark)',
            marginBottom: '0.75rem',
          }}>
            Featured Pathways
          </h2>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '1rem',
            color: 'var(--on-surface-variant)',
            maxWidth: '36rem',
            margin: '0 auto 1.5rem',
          }}>
            Each course is a doorway. Choose the one that speaks to where you are right now.
          </p>
          <div style={{ width: '4rem', height: '3px', background: 'var(--sage-green-tint)', margin: '0 auto' }} />
        </div>

        {/* Cards */}
        <div className="pathways-grid">
          {items.slice(0, 3).map((course, i) => {
            const href = isPlaceholder
              ? '/courses'
              : course.is_free
              ? `/free-course/${course.id}`
              : `/courses/${course.id}`

            const themes = [
              { bg: 'var(--surface-container)', imgBg: 'var(--sage-green-light)', fg: 'var(--sage-green-dark)', sub: 'var(--on-surface-variant)' },
              { bg: 'var(--sage-green-dark)',    imgBg: 'var(--sage-green-deep)',  fg: 'var(--soft-cream)',      sub: 'rgba(245,240,230,0.75)' },
              { bg: 'var(--rose-blush)',          imgBg: 'rgba(175,93,72,0.15)',   fg: 'var(--deep-earth)',      sub: 'var(--on-surface-variant)' },
            ]
            const t = themes[i] ?? themes[0]

            return (
              <div key={course.id} className="pathway-card" style={{ background: t.bg }}>
                {/* Thumbnail */}
                <div style={{
                  background: t.imgBg,
                  borderRadius: '0.75rem',
                  aspectRatio: '16 / 9',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{
                      fontFamily: 'var(--font-eb-garamond)',
                      fontSize: '3rem',
                      color: t.fg,
                      opacity: 0.25,
                    }}>L</span>
                  )}
                </div>

                {/* Tag */}
                <span style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  color: i === 1 ? 'var(--burnished-gold)' : 'var(--warm-terracotta)',
                  marginBottom: '0.5rem',
                }}>
                  {course.is_free ? 'Free Access' : 'Paid Course'}
                </span>

                <h3 style={{
                  fontFamily: 'var(--font-eb-garamond)',
                  fontSize: '1.375rem',
                  fontWeight: 500,
                  color: t.fg,
                  marginBottom: '0.625rem',
                  lineHeight: 1.3,
                }}>
                  {course.title}
                </h3>

                {course.subtitle && (
                  <p style={{
                    fontFamily: 'var(--font-hanken)',
                    fontSize: '0.875rem',
                    color: t.sub,
                    lineHeight: 1.65,
                    marginBottom: '1.5rem',
                    flex: 1,
                  }}>
                    {course.subtitle}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{
                    fontFamily: 'var(--font-eb-garamond)',
                    fontSize: '1.25rem',
                    color: t.fg,
                  }}>
                    {course.is_free ? 'Free' : `$${Number(course.price).toFixed(0)}`}
                  </span>
                  <Link
                    href={href}
                    style={{
                      fontFamily: 'var(--font-hanken)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      padding: '0.625rem 1.25rem',
                      borderRadius: '999px',
                      textDecoration: 'none',
                      background: i === 1 ? 'var(--sage-green-light)' : 'var(--sage-green-dark)',
                      color: i === 1 ? 'var(--sage-green-dark)' : '#fff',
                      transition: 'opacity 0.2s',
                    }}
                    className="pathway-btn"
                  >
                    {course.is_free ? 'Get Free Access' : 'Enroll Now'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* View all link */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link
            href="/courses"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--warm-terracotta)',
              textDecoration: 'none',
              letterSpacing: '0.05em',
            }}
          >
            View All Courses
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <style>{`
        .pathways-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 768px) {
          .pathways-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .pathway-card {
          padding: 1.75rem;
          border-radius: 1.25rem;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--outline-variant);
          transition: transform 0.25s;
        }
        .pathway-card:hover {
          transform: translateY(-5px);
        }
        .pathway-btn:hover {
          opacity: 0.85;
        }
      `}</style>
    </section>
  )
}

function QuoteSection() {
  return (
    <section style={{
      background: 'var(--sage-green-dark)',
      padding: 'clamp(4rem, 9vw, 7rem) clamp(1.5rem, 5vw, 3rem)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '44rem', margin: '0 auto' }}>
        <span style={{
          display: 'block',
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '5rem',
          color: 'var(--sage-green-tint)',
          opacity: 0.4,
          lineHeight: 1,
          marginBottom: '-1rem',
        }}>&ldquo;</span>
        <blockquote style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
          fontStyle: 'italic',
          fontWeight: 400,
          color: 'var(--sage-green-light)',
          lineHeight: 1.5,
          marginBottom: '1.5rem',
        }}>
          The bravest thing you can do is choose yourself, slowly, imperfectly, and every single day.
        </blockquote>
        <cite style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          color: 'var(--sage-green-tint)',
          fontStyle: 'normal',
        }}>
         , Lumora Women
        </cite>
      </div>
    </section>
  )
}

function Newsletter() {
  return (
    <section style={{
      background: 'var(--surface-container)',
      padding: 'clamp(3.5rem, 7vw, 6rem) 1.5rem',
    }}>
      <div style={{ maxWidth: '40rem', margin: '0 auto', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          color: 'var(--warm-terracotta)',
          background: 'var(--rose-blush)',
          padding: '0.375rem 1rem',
          borderRadius: '999px',
          marginBottom: '1.25rem',
        }}>
          Stay Connected
        </span>
        <h2 style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
          fontWeight: 500,
          color: 'var(--sage-green-dark)',
          marginBottom: '0.75rem',
        }}>
          Weekly Wellness, Delivered with Love
        </h2>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '1rem',
          color: 'var(--on-surface-variant)',
          lineHeight: 1.7,
          marginBottom: '2rem',
        }}>
          Seasonal rituals, course updates, and honest conversations about womanhood, straight to your inbox.
        </p>

        {/* Reuse EmailCaptureForm but wrap in a styled dark container */}
        <div style={{
          background: 'var(--sage-green-dark)',
          borderRadius: '1.5rem',
          padding: 'clamp(2rem, 5vw, 3rem)',
        }}>
          <EmailCaptureForm />
        </div>
      </div>
    </section>
  )
}

// ─── Page export ───────────────────────────────────────────────────────────────

export default async function StartHerePage() {
  const [courses, showShop] = await Promise.all([getFeaturedCourses(), getShowShop()])

  return (
    <div style={{ background: 'var(--warm-white)' }}>
      <NavbarWrapper />
      <main id="main-content">
        <Hero />
        <Steps showShop={showShop} />
        <FeaturedPathways courses={courses} />
        <QuoteSection />
        <Newsletter />
      </main>
      <FooterWrapper />
    </div>
  )
}
