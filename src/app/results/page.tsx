import type { Metadata } from 'next'
import Link from 'next/link'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'

export const metadata: Metadata = {
  title: 'What to Expect',
  description: 'The transformation Lumora Women coaching is designed to guide you toward — grounded in science, tailored to your body, and built on real support.',
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const stats = [
  { value: '1-on-1', label: 'Private Coaching' },
  { value: '100%',   label: 'Tailored to Your Body' },
  { value: '0',      label: 'Gimmicks or Quick Fixes' },
  { value: 'Free',   label: 'Course to Get Started' },
]

const beforeAfter = [
  {
    before: 'Exhausted but unable to sleep. Running on fumes every single day.',
    after: 'Sleeping through the night and waking with energy to spare.',
  },
  {
    before: 'Feeling like a stranger in your own body after birth.',
    after: 'Deep reconnection with your physical and emotional self.',
  },
  {
    before: 'Anxious, overwhelmed, and isolating without realizing it.',
    after: 'Grounded, supported, and part of a community that gets it.',
  },
  {
    before: 'Consuming wellness content but still feeling lost.',
    after: 'Clear, guided practices that fit into real life.',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  return (
    <div style={{ background: 'var(--page-bg)' }}>
      <NavbarWrapper />

      <main id="main-content">
        {/* ── Hero ── */}
        <section style={{
          background: 'var(--section-tint)',
          padding: 'clamp(4rem, 9vw, 7rem) clamp(1.5rem, 5vw, 3rem)',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '44rem', margin: '0 auto' }}>
            <span style={{
              display: 'inline-block',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--botanical-green)',
              background: 'rgba(74,122,64,0.12)',
              padding: '0.375rem 1rem',
              borderRadius: '999px',
              marginBottom: '1.5rem',
            }}>
              Your Story Starts Here
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: '1.25rem',
            }}>
              What Becomes Possible With Real Support
            </h1>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.0625rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
            }}>
              Every woman who walks through Lumora is writing her own story. Here is the
              transformation we help you move toward, and how we get there together.
            </p>
          </div>
        </section>

        {/* ── Stats ── */}
        <section style={{
          background: 'var(--nav-bg)',
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            <div className="results-stats-grid">
              {stats.map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <span
                    className="gold-text"
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {s.value}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(200, 220, 192, 0.85)',
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Before & After ── */}
        <section style={{
          background: 'var(--page-bg)',
          padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}>
                The Shift We Coach You Toward
              </h2>
              <div style={{ width: '4rem', height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)', margin: '0 auto' }} />
            </div>

            <div className="before-after-grid">
              {beforeAfter.map((item, i) => (
                <div key={i} className="before-after-card">
                  {/* Before */}
                  <div style={{
                    background: 'var(--section-tint)',
                    borderRadius: '0.75rem',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '0.75rem',
                    position: 'relative',
                  }}>
                    <span style={{
                      display: 'block',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'var(--botanical-green)',
                      marginBottom: '0.5rem',
                    }}>
                      Where You Are
                    </span>
                    <p style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.65,
                    }}>
                      {item.before}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div style={{
                    textAlign: 'center',
                    padding: '0.375rem 0',
                    color: 'var(--botanical-green)',
                    fontSize: '1.25rem',
                  }}>
                    ↓
                  </div>

                  {/* After */}
                  <div style={{
                    background: 'var(--pale-botanical)',
                    borderRadius: '0.75rem',
                    padding: '1.25rem 1.5rem',
                    marginTop: '0.75rem',
                  }}>
                    <span style={{
                      display: 'block',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'var(--botanical-green)',
                      marginBottom: '0.5rem',
                    }}>
                      Where You&apos;re Going
                    </span>
                    <p style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.65,
                    }}>
                      {item.after}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Founding Stories ── */}
        <section style={{
          background: 'var(--section-tint)',
          padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '44rem', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '0.75rem',
            }}>
              Your Story Could Be Here First
            </h2>
            <div style={{ width: '4rem', height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)', margin: '0 auto 2rem' }} />
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.0625rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
              marginBottom: '1.25rem',
            }}>
              Lumora&apos;s coaching practice is intentionally small. Every client works
              directly with her coach, and no two programs look the same. As the first
              women complete their journeys, their stories will live here, shared with
              their permission and in their own words.
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              fontStyle: 'italic',
              color: 'var(--text-primary)',
              lineHeight: 1.7,
            }}>
              Until then, we&apos;d rather show you this space empty than fill it with
              borrowed words.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{
          background: 'var(--nav-bg)',
          padding: 'clamp(3.5rem, 7vw, 6rem) 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '1rem',
            }}>
              Your story starts here.
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.0625rem',
              color: 'rgba(200, 220, 192, 0.8)',
              lineHeight: 1.7,
              marginBottom: '2.5rem',
            }}>
              Begin with our free foundational course, no credit card, no commitment,
              just you taking the first step toward yourself.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/free-course"
                className="btn-primary"
                style={{ display: 'inline-block', borderRadius: '999px', padding: '1rem 2.5rem', fontSize: '1rem' }}
              >
                Get the Free Course
              </Link>
              <Link
                href="/courses"
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  padding: '1rem 2.5rem',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: 'var(--botanical-light)',
                  textDecoration: 'none',
                  letterSpacing: '0.03em',
                  border: '1px solid rgba(200,220,192,0.4)',
                }}
              >
                Browse All Courses
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterWrapper />

      <style>{`
        .results-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }
        @media (min-width: 768px) {
          .results-stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .before-after-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .before-after-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .before-after-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .before-after-card {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  )
}
