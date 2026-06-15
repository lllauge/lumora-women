'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Check } from 'lucide-react'

// ─── Data ──────────────────────────────────────────────────────────────────────

const included = [
  '12 weeks of deep-dive, personalized wellness guidance',
  'Weekly 1:1 sessions with our lead wellness practitioner',
  'Custom hormone & cycle mapping protocol',
  'Private Voxer access for daily support between sessions',
  'Complete Lumora Women course library, unlimited access',
  'Personalized postpartum recovery blueprint',
  'Seasonal rituals and guided embodiment practices',
  'Lifetime alumni community membership',
]

const faqItems = [
  {
    q: 'Who is this program designed for?',
    a: 'This is for the woman who is ready to go all in on herself. You\'ve tried the free stuff, you\'ve explored courses, but you know you need personalized, high-touch support to make the shift that lasts. You\'re done with one-size-fits-all wellness.',
  },
  {
    q: 'What does a typical week look like?',
    a: 'Each week begins with a 60-minute 1:1 session, video call, voice, or hybrid depending on your preference. Between sessions, you have daily Voxer access for real-time support, questions, and accountability. You\'ll also receive weekly practice assignments tailored specifically to where you are.',
  },
  {
    q: 'How is this different from the online courses?',
    a: 'The courses give you the tools. This program gives you a guide who walks the path with you. Everything is customized, your protocol, your pace, your healing priorities. You\'re not following a pre-set curriculum; you\'re building your own.',
  },
  {
    q: 'Is there a payment plan?',
    a: 'Yes. We offer a 3-month payment plan for the full program. Details are shared on the next page after you click enroll. We want this to be accessible, reach out if you need a different arrangement.',
  },
  {
    q: 'What if I need to pause or reschedule?',
    a: 'Life happens. We ask for 24 hours notice for rescheduling and allow up to one pause within the 12 weeks. Our goal is for this to be sustainable, not another source of pressure.',
  },
  {
    q: 'Is there a guarantee?',
    a: 'We don\'t offer refunds after the program begins due to the personalized, time-intensive nature of our work together. That said, we stand behind the quality of our support completely. If something isn\'t working, we adjust, we\'re in this together.',
  },
]

// ─── FAQ Accordion ─────────────────────────────────────────────────────────────

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(200, 220, 192, 0.2)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--botanical-light)',
          lineHeight: 1.45,
        }}>
          {q}
        </span>
        <ChevronDown
          size={20}
          strokeWidth={2}
          style={{
            color: 'var(--botanical-light)',
            flexShrink: 0,
            transition: 'transform 0.25s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      <div style={{
        maxHeight: open ? '800px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.9375rem',
          color: 'rgba(200, 220, 192, 0.85)',
          lineHeight: 1.75,
          paddingBottom: '1.25rem',
        }}>
          {a}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkWithMePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={{ background: 'var(--nav-bg)', minHeight: '100vh' }}>

      {/* ── Logo Header ── */}
      <header style={{
        padding: '2rem 1.5rem',
        display: 'flex',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(200, 220, 192, 0.15)',
      }}>
        <Link href="/" className="gold-text" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 700,
          textDecoration: 'none',
          letterSpacing: '0.02em',
        }}>
          Lumora Women
        </Link>
      </header>

      <main id="main-content">

        {/* ── Hero ── */}
        <section style={{
          padding: 'clamp(4rem, 9vw, 7rem) clamp(1.5rem, 5vw, 3rem)',
          textAlign: 'center',
          maxWidth: '52rem',
          margin: '0 auto',
        }}>
          <span style={{
              display: 'inline-block',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: '#F0D060',
              background: 'rgba(200, 152, 10, 0.18)',
              padding: '0.375rem 1rem',
              borderRadius: '999px',
              marginBottom: '1.5rem',
            }}>
            Private 1:1 Mentorship
          </span>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.15,
            marginBottom: '1.5rem',
          }}>
            The Most Intimate Path to Your Transformation
          </h1>

          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(1rem, 2.5vw, 1.1875rem)',
            color: 'rgba(200, 220, 192, 0.85)',
            lineHeight: 1.8,
            marginBottom: '2.5rem',
            maxWidth: '40rem',
            margin: '0 auto 2.5rem',
          }}>
            A 12-week private wellness mentorship designed for the woman who is done with
            generic advice and ready for a healing experience built entirely around her.
          </p>

          <Link
            href="/contact"
            className="btn-primary"
            style={{ display: 'inline-block', borderRadius: '999px', padding: '1.125rem 3rem', fontSize: '1.0625rem' }}
          >
            Apply for Private Mentorship
          </Link>

          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8125rem',
            color: 'rgba(200, 220, 192, 0.6)',
            marginTop: '1rem',
          }}>
            Limited spots available each quarter
          </p>
        </section>

        {/* ── Divider ── */}
        <div style={{
          width: '4rem',
          height: '2px',
          background: 'rgba(200, 220, 192, 0.3)',
          margin: '0 auto',
        }} />

        {/* ── What's Included ── */}
        <section style={{
          padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
          maxWidth: '48rem',
          margin: '0 auto',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--botanical-light)',
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Everything That&apos;s Included
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {included.map((item) => (
              <div key={item} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1.25rem 1.5rem',
                borderRadius: '0.875rem',
                border: '1px solid rgba(200, 220, 192, 0.12)',
              }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(74, 122, 64, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.125rem',
                }}>
                  <Check size={13} strokeWidth={3} style={{ color: 'var(--botanical-light)' }} />
                </div>
                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '1rem',
                  color: 'rgba(200, 220, 192, 0.9)',
                  lineHeight: 1.55,
                }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── For You If ── */}
        <section style={{
          background: 'rgba(0,0,0,0.15)',
          padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '44rem', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--botanical-light)',
              marginBottom: '2.5rem',
            }}>
              This Is For You If…
            </h2>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                'You\'re navigating postpartum challenges that feel bigger than a course can solve.',
                'You want someone in your corner who truly understands the feminine body and spirit.',
                'You\'ve done all the things and still don\'t feel like yourself.',
                'You\'re ready to invest in a healing experience, not just information.',
                'You want a guide, not just content.',
              ].map((line) => (
                <div key={line} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <span className="gold-text" style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: '0.1rem' }}>✦</span>
                  <p style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '1rem',
                    color: 'rgba(200, 220, 192, 0.9)',
                    lineHeight: 1.65,
                  }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Mid CTA ── */}
        <section style={{
          padding: 'clamp(3rem, 6vw, 5rem) 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.375rem, 3vw, 1.875rem)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--botanical-light)',
              lineHeight: 1.5,
              marginBottom: '2rem',
            }}>
              &ldquo;You don&apos;t have to figure this out alone, and you don&apos;t have to rush it. Let&apos;s do this properly.&rdquo;
            </p>
            <Link
              href="/contact"
              className="btn-primary"
              style={{ display: 'inline-block', borderRadius: '999px', padding: '1rem 2.5rem', fontSize: '1rem' }}
            >
              Secure Your Spot
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{
          background: 'rgba(0,0,0,0.15)',
          padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '44rem', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
              fontWeight: 700,
              color: 'var(--botanical-light)',
              textAlign: 'center',
              marginBottom: '2.5rem',
            }}>
              Questions You Might Have
            </h2>
            <div>
              {faqItems.map((item, i) => (
                <FaqItem
                  key={i}
                  q={item.q}
                  a={item.a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section style={{
          padding: 'clamp(4rem, 9vw, 7rem) 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}>
              Ready to Begin?
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.0625rem',
              color: 'rgba(200, 220, 192, 0.8)',
              lineHeight: 1.7,
              marginBottom: '2.5rem',
            }}>
              Spots for this quarter are limited. If this is calling to you,
              honor that feeling and take the next step.
            </p>
            <Link
              href="/contact"
              className="btn-primary"
              style={{ display: 'inline-block', borderRadius: '999px', padding: '1.125rem 3rem', fontSize: '1.0625rem' }}
            >
              Apply Now
            </Link>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              color: 'rgba(200, 220, 192, 0.5)',
              marginTop: '1rem',
            }}>
              Questions first?{' '}
              <Link
                href="/contact"
                style={{ color: 'var(--botanical-light)', textDecoration: 'underline' }}
              >
                Send us a message
              </Link>
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(200, 220, 192, 0.15)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.8125rem',
          color: 'rgba(200, 220, 192, 0.45)',
        }}>
          © {new Date().getFullYear()} Lumora Women · All rights reserved ·{' '}
          <Link href="/privacy-policy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy</Link>
          {' · '}
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms</Link>
        </p>
      </footer>
    </div>
  )
}
