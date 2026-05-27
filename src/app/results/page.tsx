import type { Metadata } from 'next'
import Link from 'next/link'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'

export const metadata: Metadata = {
  title: 'Results & Stories | Lumora Women',
  description: 'Real women. Real results. See how Lumora Women has helped hundreds of women reclaim their health, energy, and inner peace.',
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const stats = [
  { value: '500+', label: 'Women Enrolled' },
  { value: '96%',  label: 'Report Feeling More Grounded' },
  { value: '4.9★', label: 'Average Course Rating' },
  { value: '12+',  label: 'Countries Represented' },
]

const testimonials = [
  {
    quote: 'I came to Lumora completely depleted after my second baby. Three months later, I feel like myself again — more than I have in years. The postpartum course gave me language for what I was experiencing and tools I actually use every day.',
    name: 'Camille R.',
    detail: 'Postpartum Recovery, Los Angeles',
    initials: 'CR',
  },
  {
    quote: 'I\'d tried so many wellness programs that felt performative and exhausting. Lumora was the first that actually felt like a rest. The community especially — I didn\'t know I needed that kind of witnessed support until I had it.',
    name: 'Sarah M.',
    detail: 'Inner Circle Member, Chicago',
    initials: 'SM',
  },
  {
    quote: 'The hormone health course completely changed how I relate to my cycle. I stopped fighting my body and started listening to it. My energy is more consistent, my mood more stable. It feels like a miracle but it\'s really just education.',
    name: 'Amara T.',
    detail: 'Hormone Health Course, Atlanta',
    initials: 'AT',
  },
  {
    quote: 'I\'m a busy professional and I was skeptical about online wellness programs. But the self-paced format and the depth of content won me over immediately. I do 20 minutes a morning now and it\'s the most important part of my day.',
    name: 'Rachel K.',
    detail: 'Mindfulness & Movement, New York',
    initials: 'RK',
  },
  {
    quote: 'What sets Lumora apart is the authenticity. You can tell this was built by a woman who actually went through it — not a wellness brand trying to sell you something. I trust this content with my healing.',
    name: 'Jessica P.',
    detail: 'Foundations Member, Toronto',
    initials: 'JP',
  },
  {
    quote: 'Six months into my Lumora journey and I\'ve lost the postpartum anxiety I thought would be with me forever. I finally have the tools and the community to support real, lasting change.',
    name: 'Maria L.',
    detail: 'Postpartum Wellness, Miami',
    initials: 'ML',
  },
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

      <main>
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
              Real Women. Real Results.
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: '1.25rem',
            }}>
              Stories That Remind You What&apos;s Possible
            </h1>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.0625rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
            }}>
              Every woman who walks through Lumora carries her own story. These are some of theirs.
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
                The Shift Women Experience
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
                      Before
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
                      After
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

        {/* ── Testimonials Grid ── */}
        <section style={{
          background: 'var(--section-tint)',
          padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}>
                Hear From Our Community
              </h2>
              <div style={{ width: '4rem', height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)', margin: '0 auto' }} />
            </div>

            <div className="testimonials-masonry">
              {testimonials.map((t) => (
                <div key={t.name} style={{
                  background: '#fff',
                  padding: '2rem',
                  borderRadius: '1.25rem',
                  border: '1px solid rgba(200,220,192,0.35)',
                  boxShadow: '0 4px 16px rgba(26,40,24,0.05)',
                  breakInside: 'avoid',
                  marginBottom: '1.5rem',
                }}>
                  <span style={{
                    display: 'block',
                    fontFamily: 'var(--font-display)',
                    fontSize: '3.5rem',
                    lineHeight: 1,
                    marginBottom: '-0.5rem',
                    opacity: 0.5,
                    background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>&ldquo;</span>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.0625rem',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    lineHeight: 1.7,
                    marginBottom: '1.5rem',
                  }}>
                    {t.quote}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--pale-botanical)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--botanical-green)',
                      }}>
                        {t.initials}
                      </span>
                    </div>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}>
                        {t.name}
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}>
                        {t.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              Begin with our free foundational course — no credit card, no commitment,
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
        .testimonials-masonry {
          columns: 1;
          gap: 1.5rem;
        }
        @media (min-width: 768px) {
          .testimonials-masonry {
            columns: 2;
          }
        }
        @media (min-width: 1024px) {
          .testimonials-masonry {
            columns: 3;
          }
        }
      `}</style>
    </div>
  )
}
