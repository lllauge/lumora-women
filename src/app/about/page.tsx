import type { Metadata } from 'next'
import Link from 'next/link'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'

export const metadata: Metadata = {
  title: 'About the Founder | Lumora Women',
  description: 'Learn about the woman behind Lumora Women — a sanctuary built from necessity, not a business plan.',
}

const values = [
  {
    icon: '🌿',
    title: 'Radical Presence',
    body: 'We believe that the most valuable gift you can give yourself is the full attention of your present moment, free from judgment.',
  },
  {
    icon: '🤍',
    title: 'Sacred Connection',
    body: 'Community is our bedrock. We heal faster and more deeply when we are witnessed and supported by like-minded sisters.',
  },
  {
    icon: '🌙',
    title: 'Cyclical Living',
    body: 'Respecting the seasons of our bodies and nature allows us to work with our energy rather than constantly fighting against it.',
  },
]

const whoFor = [
  {
    title: 'The Weary Visionary',
    body: "You've achieved much but feel a disconnect from your inner joy and physical vitality.",
  },
  {
    title: 'The Seeker of Depth',
    body: 'You are tired of superficial self-care and crave practices that touch the soul.',
  },
  {
    title: 'The Community-Driven Soul',
    body: 'You know that your growth is amplified when shared in a safe, nurturing environment.',
  },
]

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--page-bg)' }}>
      <NavbarWrapper />

      <main id="main-content">
      {/* ── Hero ── */}
      <section className="about-hero">
        {/* Text side */}
        <div style={{
          background: 'var(--page-bg)',
          padding: 'clamp(3rem, 8vw, 6rem) clamp(1.5rem, 5vw, 5rem)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            color: 'var(--botanical-green)',
            display: 'block',
            marginBottom: '1.25rem',
            background: 'var(--section-tint)',
            alignSelf: 'flex-start',
            padding: '0.375rem 0.875rem',
            borderRadius: '999px',
          }}>
            For Women Who Are Ready
          </span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            maxWidth: '24rem',
          }}>
            I have been exactly where you are right now
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1.0625rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            maxWidth: '32rem',
          }}>
            Lumora wasn&apos;t born from a business plan, but from a necessity for healing.
            I&apos;ve walked the path of burnout and disconnection, only to rediscover
            the sanctuary that exists within every woman.
          </p>
        </div>

        {/* Image side */}
        <div style={{
          background: 'var(--pale-botanical)',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '2px dashed var(--botanical-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.5,
          }}>
            <span style={{ fontSize: '1.5rem' }}>📷</span>
          </div>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8125rem',
            color: 'var(--botanical-green)',
            opacity: 0.7,
            letterSpacing: '0.05em',
          }}>
            Your photo here
          </p>
        </div>
      </section>

      {/* ── Founder Story ── */}
      <section style={{
        background: 'var(--section-tint)',
        padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            A Journey Back to Self
          </h2>

          <div className="story-grid">
            {/* Story text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '1rem',
                color: 'var(--text-primary)',
                lineHeight: 1.85,
              }}>
                Ten years ago, my life looked perfect on paper, but I felt utterly hollow.
                I was navigating high-stakes environments while completely ignoring the quiet
                wisdom of my own body and spirit. I realized that the modern world wasn&apos;t
                built to sustain the feminine rhythm.
              </p>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '1rem',
                color: 'var(--text-primary)',
                lineHeight: 1.85,
              }}>
                I traveled, I studied, and I listened. I found that wellness isn&apos;t about
                fixing ourselves — it&apos;s about remembering who we are when we&apos;re not
                trying to meet everyone else&apos;s expectations. This is the heart of Lumora.
              </p>
            </div>

            {/* Pull quote */}
            <blockquote style={{
              position: 'relative',
              padding: '2rem 2rem 2rem 2.5rem',
              borderLeft: '4px solid var(--gold-dark)',
              background: 'rgba(200, 220, 192, 0.12)',
              borderRadius: '0 0.75rem 0.75rem 0',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '5rem',
                position: 'absolute',
                top: '-1rem',
                left: '1rem',
                lineHeight: 1,
                opacity: 0.6,
                background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>&ldquo;</span>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                marginTop: '1rem',
              }}>
                True wellness begins the moment you decide to stop performing and start
                listening to your own silence.
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section style={{
        background: 'var(--section-sand)',
        padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
      }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '1rem',
            }}>
              What Lumora Women Stands For
            </h2>
            <div style={{ width: '4rem', height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)', margin: '0 auto' }} />
          </div>

          <div className="values-grid">
            {values.map((v) => (
              <div key={v.title} className="value-card">
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>{v.icon}</span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                }}>
                  {v.title}
                </h3>
                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                }}>
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who This Is For ── */}
      <section style={{
        background: 'var(--page-bg)',
        padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
      }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto' }} className="who-grid">
          {/* Image */}
          <div style={{
            background: 'var(--pale-botanical)',
            borderRadius: '1.25rem',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '6rem',
              fontWeight: 700,
              color: 'var(--botanical-green)',
              opacity: 0.2,
            }}>L</span>
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '2rem',
            }}>
              Who This Is For
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {whoFor.map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: '50%',
                    background: 'var(--section-tint)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '0.125rem',
                  }}>
                    <span style={{ color: 'var(--botanical-green)', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
                  </div>
                  <div>
                    <h3 style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem',
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
            Ready to reclaim your radiance?
          </h2>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1.0625rem',
            color: 'rgba(200, 220, 192, 0.8)',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
          }}>
            Begin your journey with our free foundational course — a gift to every
            woman ready to come home to herself.
          </p>
          <Link
            href="/free-course"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              borderRadius: '999px',
              padding: '1rem 2.5rem',
              fontSize: '1rem',
            }}
          >
            Begin Your Journey Today
          </Link>
        </div>
      </section>

      </main>

      <FooterWrapper />

      <style>{`
        .about-hero {
          display: grid;
          grid-template-columns: 1fr;
          min-height: 560px;
        }
        @media (min-width: 768px) {
          .about-hero {
            grid-template-columns: 1fr 1fr;
            min-height: 620px;
          }
        }
        .story-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 768px) {
          .story-grid {
            grid-template-columns: 7fr 5fr;
            gap: 3rem;
          }
        }
        .values-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .values-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .values-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .who-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          align-items: center;
        }
        @media (min-width: 768px) {
          .who-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .value-card {
          background: #fff;
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: 0 4px 16px rgba(22,40,20,0.06);
          border: 1px solid rgba(200,220,192,0.35);
          transition: transform 0.25s;
        }
        .value-card:hover {
          transform: translateY(-6px);
        }
      `}</style>
    </div>
  )
}
