'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

// ─── Data ──────────────────────────────────────────────────────────────────────

const sections = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    items: [
      {
        q: 'Where do I begin if I\'m brand new to Lumora Women?',
        a: 'Start with our free foundational course — it\'s designed for exactly where you are right now. Head to the Start Here page for a guided roadmap that walks you through every step, from free course to community to deeper programs.',
      },
      {
        q: 'Do I need to create an account to access anything?',
        a: 'Our free resources and blog are open to everyone. To enroll in courses (free or paid), you\'ll create a simple account. It takes less than a minute and you\'ll have instant access.',
      },
      {
        q: 'Is Lumora Women right for me if I\'m not postpartum?',
        a: 'Absolutely. While we specialize in postpartum wellness, our community and courses speak to all women navigating hormonal shifts, burnout, disconnection, or simply wanting to come home to themselves. Wherever you are in your journey, you belong here.',
      },
      {
        q: 'What makes Lumora Women different from other wellness programs?',
        a: 'We are built from lived experience, not a marketing playbook. Every course, every piece of content, every community conversation is designed to honor the actual rhythms of the feminine body and spirit — not the productivity culture that tells you to push through.',
      },
    ],
  },
  {
    id: 'courses',
    label: 'Courses & Programs',
    items: [
      {
        q: 'How do the online courses work?',
        a: 'All courses are self-paced and available immediately after enrollment. You\'ll have access to video lessons, guided practices, and downloadable resources. Learn on your schedule — whether that\'s during nap time, early mornings, or late nights.',
      },
      {
        q: 'Do the paid courses ever go on sale?',
        a: 'Yes! We run seasonal enrollment windows and occasional community-only discounts. Join our email list or the community to be the first to know.',
      },
      {
        q: 'How long do I have access to a course after purchasing?',
        a: 'You have lifetime access to all courses you enroll in. Come back anytime — whenever life allows.',
      },
      {
        q: 'Can I get a refund if a course isn\'t the right fit?',
        a: 'We offer a 7-day satisfaction window on all paid courses. If the course isn\'t what you expected, reach out to us within 7 days of purchase and we\'ll make it right.',
      },
      {
        q: 'Are the courses medically approved?',
        a: 'Our courses are wellness and educational in nature. They are not a substitute for medical advice, diagnosis, or treatment. Always consult your healthcare provider for medical decisions, especially postpartum.',
      },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    items: [
      {
        q: 'What is the Lumora Women community?',
        a: 'The Inner Circle is our private online community — a safe, nurturing space for members to share, ask questions, do group challenges, and support one another through their wellness journeys. It\'s completely free to join.',
      },
      {
        q: 'Is the community moderated?',
        a: 'Yes. We take the safety and warmth of our space seriously. Our community guidelines are rooted in respect, compassion, and zero tolerance for judgment or negativity. Members who violate these values are removed.',
      },
      {
        q: 'Can I join the community without purchasing a course?',
        a: 'No. The community is exclusive to members of The Lumora Method. Once you enroll, you get access as part of the program.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account & Technical',
    items: [
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'Click "Forgot Password" on the login page and we\'ll send a reset link to your email immediately. If you don\'t see it, check your spam folder.',
      },
      {
        q: 'Can I access courses on my phone or tablet?',
        a: 'Yes — our platform is fully optimized for mobile and tablet. You can watch lessons, read resources, and engage with the community from any device.',
      },
      {
        q: 'How do I update my email or account information?',
        a: 'Log in and visit your dashboard settings to update your email, name, or password. If you run into any issues, contact us and we\'ll sort it out quickly.',
      },
      {
        q: 'What if I\'m having a technical issue with a course?',
        a: 'We\'re here to help. Contact us through the Contact page and describe what you\'re experiencing. We typically respond within 24 hours on business days.',
      },
    ],
  },
]

// ─── Accordion Item ────────────────────────────────────────────────────────────

function AccordionItem({
  q,
  a,
  open,
  onToggle,
  triggerId,
  panelId,
}: {
  q: string
  a: string
  open: boolean
  onToggle: () => void
  triggerId: string
  panelId: string
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--outline-variant)' }}>
      <h3 style={{ margin: 0 }}>
        <button
          id={triggerId}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
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
            minHeight: '44px',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--deep-earth)',
            lineHeight: 1.45,
          }}>
            {q}
          </span>
          <ChevronDown
            size={20}
            strokeWidth={2}
            aria-hidden="true"
            style={{
              color: 'var(--sage-green-dark)',
              flexShrink: 0,
              transition: 'transform 0.25s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        style={{
          paddingBottom: open ? '1.25rem' : '0',
        }}
      >
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.9375rem',
          color: 'var(--on-surface-variant)',
          lineHeight: 1.75,
        }}>
          {a}
        </p>
      </div>
    </div>
  )
}

// ─── Section Accordion ─────────────────────────────────────────────────────────

function FaqSection({
  section,
}: {
  section: (typeof sections)[number]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div style={{
      background: '#fff',
      borderRadius: '1.25rem',
      border: '1px solid var(--outline-variant)',
      boxShadow: '0 4px 16px rgba(21,51,40,0.05)',
      padding: '0 2rem',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--sage-green-dark)',
        padding: '1.5rem 0 0.5rem',
        borderBottom: '2px solid var(--sage-green-light)',
        marginBottom: '0.25rem',
        marginTop: 0,
      }}>
        {section.label}
      </h2>

      {section.items.map((item, i) => {
        const triggerId = `faq-${section.id}-trigger-${i}`
        const panelId = `faq-${section.id}-panel-${i}`
        return (
          <AccordionItem
            key={i}
            q={item.q}
            a={item.a}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            triggerId={triggerId}
            panelId={panelId}
          />
        )
      })}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function FaqContent() {
  return (
    <main id="main-content" style={{ background: 'var(--warm-white)' }}>

      {/* ── Hero ── */}
      <section style={{
        background: 'var(--surface-container)',
        padding: 'clamp(4rem, 9vw, 7rem) clamp(1.5rem, 5vw, 3rem)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '44rem', margin: '0 auto' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: 'var(--warm-terracotta)',
              background: 'var(--rose-blush)',
              padding: '0.375rem 1rem',
              borderRadius: '999px',
              marginBottom: '1.5rem',
            }}>
            Questions &amp; Answers
          </span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: 'var(--sage-green-dark)',
            lineHeight: 1.2,
            marginBottom: '1.25rem',
          }}>
            We&apos;ve Got Answers
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1.0625rem',
            color: 'var(--on-surface-variant)',
            lineHeight: 1.75,
          }}>
            If you can&apos;t find what you&apos;re looking for, we&apos;re always just a message away.
          </p>
        </div>
      </section>

      {/* ── Accordion Sections ── */}
      <section style={{
        background: 'var(--warm-white)',
        padding: 'clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3rem)',
      }}>
        <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
          {sections.map((section) => (
            <FaqSection key={section.id} section={section} />
          ))}
        </div>
      </section>

      {/* ── Still Have Questions CTA ── */}
      <section style={{
        background: 'var(--sage-green-dark)',
        padding: 'clamp(3.5rem, 7vw, 5rem) 1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
            fontWeight: 700,
            color: 'var(--sage-green-light)',
            marginBottom: '0.75rem',
          }}>
            Still Have Questions?
          </h2>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            color: 'rgba(209, 230, 201, 0.85)',
            lineHeight: 1.7,
            marginBottom: '2rem',
          }}>
            We&apos;re real humans who genuinely care. Drop us a message and we&apos;ll get back to you within 24 hours.
          </p>
          <Link
            href="/contact"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              fontWeight: 700,
              padding: '1rem 2.5rem',
              borderRadius: '999px',
              background: 'var(--sage-green-light)',
              color: 'var(--sage-green-dark)',
              textDecoration: 'none',
              letterSpacing: '0.03em',
              minHeight: '44px',
              minWidth: '44px',
            }}
          >
            Contact Us
          </Link>
        </div>
      </section>
    </main>
  )
}
