'use client'

import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Mail, MessageSquare, Clock, Check } from 'lucide-react'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ''

function ContactForm() {
  const captchaRef = useRef<HCaptcha>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg('')

    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setErrorMsg('Please complete the CAPTCHA verification.')
      setStatus('error')
      return
    }

    setStatus('loading')

    const formData = new FormData(e.currentTarget)
    const payload = {
      name:          formData.get('name'),
      email:         formData.get('email'),
      subject:       formData.get('subject'),
      message:       formData.get('message'),
      hcaptchaToken: captchaToken,
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        captchaRef.current?.resetCaptcha()
        setCaptchaToken(null)
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('Something went wrong. Please try again or email us directly.')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--sage-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={28} strokeWidth={2.5} style={{ color: 'var(--sage-green-dark)' }} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.75rem', fontWeight: 500, color: 'var(--sage-green-dark)' }}>
          Message received.
        </h3>
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '1rem', color: 'var(--on-surface-variant)', lineHeight: 1.7, maxWidth: '26rem' }}>
          Thank you for reaching out. We&apos;ll get back to you within 24 hours on business days.
          In the meantime, take a deep breath — you&apos;re in good hands.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="contact-row">
        <div style={{ flex: 1 }}>
          <label className="contact-label">Your Name</label>
          <input name="name" type="text" placeholder="First and last name" required maxLength={100} className="contact-input" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="contact-label">Email Address</label>
          <input name="email" type="email" placeholder="you@example.com" required maxLength={254} className="contact-input" />
        </div>
      </div>

      <div>
        <label className="contact-label">Subject</label>
        <select name="subject" required className="contact-input" defaultValue="">
          <option value="" disabled>Select a topic…</option>
          <option value="course-support">Course Support</option>
          <option value="account">Account / Login Help</option>
          <option value="community">Community Question</option>
          <option value="refund">Refund Request</option>
          <option value="partnerships">Partnerships & Collaborations</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="contact-label">Your Message</label>
        <textarea name="message" placeholder="Tell us what's on your mind…" required rows={5} maxLength={5000} className="contact-input" style={{ resize: 'vertical', minHeight: '120px' }} />
      </div>

      {/* hCaptcha */}
      {HCAPTCHA_SITE_KEY && (
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
        />
      )}

      <button type="submit" disabled={status === 'loading'} className="contact-submit">
        {status === 'loading' ? 'Sending…' : 'Send Message'}
      </button>

      {status === 'error' && errorMsg && (
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: '#c0392b', textAlign: 'center' }}>
          {errorMsg}
        </p>
      )}
    </form>
  )
}

export default function ContactContent() {
  const quickLinks = [
    { icon: <MessageSquare size={22} strokeWidth={1.5} />, title: 'Course Support', body: 'Having trouble with a course or lesson? We\'ll get you sorted.' },
    { icon: <Mail size={22} strokeWidth={1.5} />, title: 'General Questions', body: 'Curious about Lumora Women, our programs, or how to get started?' },
    { icon: <Clock size={22} strokeWidth={1.5} />, title: '24-Hour Response', body: 'We respond to all messages within one business day. We promise.' },
  ]

  return (
    <main id="main-content" style={{ background: 'var(--warm-white)' }}>
      <section style={{ background: 'var(--surface-container)', padding: 'clamp(4rem, 9vw, 6.5rem) clamp(1.5rem, 5vw, 3rem)', textAlign: 'center' }}>
        <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
          <span style={{ display: 'inline-block', fontFamily: 'var(--font-hanken)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--warm-terracotta)', background: 'var(--rose-blush)', padding: '0.375rem 1rem', borderRadius: '999px', marginBottom: '1.5rem' }}>
            We&apos;re Here for You
          </span>
          <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 500, color: 'var(--sage-green-dark)', lineHeight: 1.2, marginBottom: '1.25rem' }}>
            Let&apos;s Talk
          </h1>
          <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '1.0625rem', color: 'var(--on-surface-variant)', lineHeight: 1.75 }}>
            Whether you have a question about a course, need account help, or just want to say hello — we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section style={{ background: 'var(--warm-white)', padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 3rem)' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
          <div className="contact-info-grid">
            {quickLinks.map((item) => (
              <div key={item.title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--surface-container)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--outline-variant)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '0.75rem', background: 'var(--sage-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage-green-dark)', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-hanken)', fontSize: '1rem', fontWeight: 700, color: 'var(--deep-earth)', marginBottom: '0.375rem' }}>{item.title}</h3>
                  <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--surface-container-low)', padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)' }}>
        <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '1.5rem', padding: 'clamp(2rem, 5vw, 3rem)', border: '1px solid var(--outline-variant)', boxShadow: '0 4px 24px rgba(21,51,40,0.06)' }}>
            <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500, color: 'var(--sage-green-dark)', marginBottom: '0.5rem' }}>
              Send Us a Message
            </h2>
            <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.9rem', color: 'var(--on-surface-variant)', marginBottom: '2rem', lineHeight: 1.6 }}>
              Fill out the form below and we&apos;ll get back to you as soon as possible.
            </p>
            <ContactForm />
          </div>
        </div>
      </section>

      <style>{`
        .contact-row { display: flex; flex-direction: column; gap: 1.25rem; }
        @media (min-width: 640px) { .contact-row { flex-direction: row; } }
        .contact-label { display: block; font-family: var(--font-hanken); font-size: 0.8125rem; font-weight: 600; color: var(--deep-earth); margin-bottom: 0.4rem; letter-spacing: 0.02em; }
        .contact-input { width: 100%; padding: 0.8125rem 1.125rem; border-radius: 0.75rem; border: 1px solid var(--outline-variant); background: var(--surface-container-low); font-family: var(--font-hanken); font-size: 0.9375rem; color: var(--deep-earth); outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .contact-input:focus { border-color: var(--sage-green-tint); box-shadow: 0 0 0 3px rgba(184, 204, 183, 0.25); }
        .contact-input::placeholder { color: var(--on-surface-variant); opacity: 0.6; }
        .contact-submit { width: 100%; padding: 1rem 2rem; border-radius: 0.75rem; background: var(--sage-green-dark); color: #fff; font-family: var(--font-hanken); font-size: 1rem; font-weight: 700; letter-spacing: 0.04em; border: none; cursor: pointer; transition: transform 0.2s, opacity 0.2s; margin-top: 0.5rem; }
        .contact-submit:hover { transform: scale(1.01); opacity: 0.92; }
        .contact-submit:active { transform: scale(0.98); }
        .contact-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .contact-info-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        @media (min-width: 640px) { .contact-info-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </main>
  )
}
