'use client'

import { useState } from 'react'
import Link from 'next/link'
import { subscribeToNewsletter } from '@/app/actions/subscribe'
import { Users, MessageCircle, Heart, Star, Check } from 'lucide-react'

// ─── Email Capture Form ────────────────────────────────────────────────────────

function CommunitySignupForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const result = await subscribeToNewsletter(formData)

    if (result.error) {
      setErrorMsg(result.error)
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--section-tint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <Check size={24} strokeWidth={2.5} style={{ color: 'var(--botanical-green)' }} />
        </div>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
        }}>
          Welcome to the circle.
        </p>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
        }}>
          We&apos;re so glad you&apos;re here. Check your inbox for a warm welcome from us.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div className="community-form-row">
        <input
          name="first_name"
          type="text"
          placeholder="First name"
          required
          className="community-input"
        />
        <input
          name="email"
          type="email"
          placeholder="Your email address"
          required
          className="community-input"
        />
      </div>
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary community-submit-btn"
        >
          {status === 'loading' ? 'Joining…' : 'Join the Inner Circle'}
        </button>
      </div>
      {status === 'error' && (
        <p style={{
          marginTop: '0.75rem',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.8125rem',
          color: '#c0392b',
          textAlign: 'center',
        }}>
          {errorMsg}
        </p>
      )}
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        marginTop: '1rem',
        fontStyle: 'italic',
        opacity: 0.75,
      }}>
        No spam. Only soul. Unsubscribe anytime.
      </p>
    </form>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CommunityContent() {
  const perks = [
    {
      icon: <Users size={24} strokeWidth={1.5} />,
      title: 'A Sisterhood That Gets It',
      body: 'Connect with women navigating the same seasons — postpartum, hormones, burnout, and beyond. No judgment. Just real talk.',
    },
    {
      icon: <MessageCircle size={24} strokeWidth={1.5} />,
      title: 'Honest Conversations',
      body: 'Ask the questions you\'re afraid to ask anywhere else. Our community is a judgment-free zone built on radical honesty and deep compassion.',
    },
    {
      icon: <Heart size={24} strokeWidth={1.5} />,
      title: 'Shared Practices',
      body: 'Weekly rituals, guided reflections, and seasonal wellness challenges to do together — because growth is sweeter when it\'s shared.',
    },
    {
      icon: <Star size={24} strokeWidth={1.5} />,
      title: 'Early Access & Perks',
      body: 'Community members get first access to new courses, special pricing, and exclusive content from our founder and expert contributors.',
    },
  ]

  const testimonials = [
    {
      quote: 'Finding this community was the turning point in my postpartum journey. I finally felt seen.',
      name: 'Sarah M.',
      detail: 'Member since 2024',
    },
    {
      quote: 'I didn\'t realize how much I needed a safe space until I found one. This community is truly special.',
      name: 'Rachel K.',
      detail: 'Postpartum Wellness Member',
    },
    {
      quote: 'The weekly rituals we do together have completely shifted how I approach my own healing.',
      name: 'Amara T.',
      detail: 'Inner Circle Member',
    },
  ]

  return (
    <main id="main-content" style={{ background: 'var(--page-bg)' }}>

      {/* ── Hero ── */}
      <section style={{
        background: 'var(--nav-bg)',
        padding: 'clamp(4.5rem, 10vw, 8rem) clamp(1.5rem, 5vw, 3rem)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorations */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'rgba(74, 122, 64, 0.15)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'rgba(200, 152, 10, 0.1)',
          filter: 'blur(50px)',
        }} />

        <div style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative' }}>
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
            Free to Join
          </span>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.15,
            marginBottom: '1.25rem',
          }}>
            You Were Never Meant to Heal Alone
          </h1>

          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
            color: 'rgba(200, 220, 192, 0.8)',
            lineHeight: 1.75,
            marginBottom: '2.5rem',
            maxWidth: '38rem',
            margin: '0 auto 2.5rem',
          }}>
            The Lumora Women Inner Circle is a private, nurturing community where
            real women gather to support, celebrate, and lift each other through every season.
          </p>

          <a href="#join" className="btn-primary" style={{ borderRadius: '999px', padding: '1rem 2.5rem', fontSize: '1rem' }}>
            Join for Free
          </a>
        </div>
      </section>

      {/* ── Perks / Why Join ── */}
      <section style={{
        background: '#FFFFFF',
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
              What You Gain by Joining
            </h2>
            <div style={{ width: '4rem', height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)', margin: '0 auto' }} />
          </div>

          <div className="perks-grid">
            {perks.map((perk) => (
              <div key={perk.title} className="perk-card">
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '1rem',
                  background: 'var(--section-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--botanical-green)',
                  marginBottom: '1.25rem',
                  flexShrink: 0,
                }}>
                  {perk.icon}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.625rem',
                }}>
                  {perk.title}
                </h3>
                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                }}>
                  {perk.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{
        background: 'var(--section-sand)',
        padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
      }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Words from the Circle
            </h2>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((t) => (
              <div key={t.name} style={{
                background: '#fff',
                padding: '2rem',
                borderRadius: '1.25rem',
                border: '1px solid rgba(200,220,192,0.35)',
                boxShadow: '0 4px 16px rgba(26,40,24,0.06)',
              }}>
                <span style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontSize: '3.5rem',
                  lineHeight: 1,
                  marginBottom: '-0.5rem',
                  opacity: 0.6,
                  background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>&ldquo;</span>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.125rem',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  lineHeight: 1.65,
                  marginBottom: '1.25rem',
                }}>
                  {t.quote}
                </p>
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
            ))}
          </div>
        </div>
      </section>

      {/* ── Join / Email Capture ── */}
      <section
        id="join"
        style={{
          background: 'var(--section-tint)',
          padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
        }}
      >
        <div style={{ maxWidth: '44rem', margin: '0 auto', textAlign: 'center' }}>
          <span style={{
            display: 'inline-block',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            color: 'var(--botanical-green)',
            background: 'rgba(74, 122, 64, 0.12)',
            padding: '0.375rem 1rem',
            borderRadius: '999px',
            marginBottom: '1.25rem',
          }}>
            Join Today — It&apos;s Free
          </span>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
          }}>
            Step Into the Circle
          </h2>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: '2rem',
          }}>
            Enter your name and email below to claim your spot in the Lumora Women community.
            No cost. No catch. Just sisterhood.
          </p>

          <div style={{
            background: '#fff',
            borderRadius: '1.5rem',
            padding: 'clamp(2rem, 5vw, 3rem)',
            border: '1px solid rgba(200,220,192,0.35)',
            boxShadow: '0 4px 24px rgba(26,40,24,0.07)',
          }}>
            <CommunitySignupForm />
          </div>

          {/* Already a course member */}
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            marginTop: '1.5rem',
          }}>
            Already enrolled in a course?{' '}
            <Link
              href="/courses"
              className="gold-text"
              style={{ textDecoration: 'none', fontWeight: 600 }}
            >
              Go to your courses →
            </Link>
          </p>
        </div>
      </section>

      <style>{`
        .perks-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .perks-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .perks-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .perk-card {
          background: var(--page-bg);
          padding: 2rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(200,220,192,0.35);
          transition: transform 0.25s;
        }
        .perk-card:hover {
          transform: translateY(-5px);
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 768px) {
          .testimonials-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .community-form-row {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        @media (min-width: 480px) {
          .community-form-row {
            flex-direction: row;
          }
        }
        .community-input {
          flex: 1;
          padding: 0.875rem 1.25rem;
          border-radius: 999px;
          border: 1px solid rgba(200,220,192,0.4);
          background: var(--page-bg);
          font-family: var(--font-sans);
          font-size: 0.9375rem;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
        }
        .community-input:focus {
          border-color: var(--botanical-green);
        }
        .community-input::placeholder {
          color: var(--text-muted);
          opacity: 0.7;
        }
        .community-submit-btn {
          padding: 0.875rem 2.5rem !important;
          border-radius: 999px !important;
        }
      `}</style>
    </main>
  )
}
