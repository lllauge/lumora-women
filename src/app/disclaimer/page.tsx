import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'

export const metadata: Metadata = {
  title: 'Disclaimer | Lumora Women',
  description: 'Important disclaimer regarding Lumora Women content, courses, and wellness information.',
}

const sections = [
  {
    title: 'Not Medical Advice',
    body: `The content provided by Lumora Women, including courses, blog posts, community discussions, and all other materials, is for educational and informational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician, midwife, therapist, or other qualified health provider with any questions you may have regarding a medical condition.`,
  },
  {
    title: 'Postpartum and Maternal Health',
    body: `While our content is designed to support postpartum wellbeing, it is not a replacement for clinical postpartum care. If you are experiencing symptoms of postpartum depression, postpartum anxiety, or any other mental or physical health concern, please reach out to a qualified healthcare professional immediately. The information on this platform does not substitute for a clinical assessment.`,
  },
  {
    title: 'Individual Results',
    body: `Testimonials and success stories shared on this platform represent individual experiences and are not guarantees of results. Every woman's healing journey is unique. Wellness outcomes depend on many individual factors including health history, consistency of practice, and access to support. We make no representation that any specific outcome will be achieved by using our services.`,
  },
  {
    title: 'Affiliate and Financial Disclaimer',
    body: `Some links on our platform may be affiliate links, meaning we may earn a small commission if you make a purchase at no additional cost to you. We only recommend products and services we genuinely believe in. This does not constitute financial advice. Any mention of pricing, cost savings, or financial benefit is for illustrative purposes only.`,
  },
  {
    title: 'Content Accuracy',
    body: `While we make every effort to ensure our content is accurate, evidence-based, and up to date, wellness research evolves rapidly. We encourage you to cross-reference information with current medical guidelines and to consult a qualified professional before making health decisions. Lumora Women is not responsible for errors, omissions, or outdated information.`,
  },
  {
    title: 'External Links',
    body: `Our platform may contain links to external websites or resources. These links are provided for convenience and informational purposes. Lumora Women does not endorse and is not responsible for the content, accuracy, or privacy practices of any external sites.`,
  },
  {
    title: 'Questions',
    body: `If you have any questions about this disclaimer or the nature of our content, please contact us at hello@lumorawomen.com before engaging with our services.`,
  },
]

export default function DisclaimerPage() {
  return (
    <div style={{ background: 'var(--warm-white)' }}>
      <NavbarWrapper />

      <main id="main-content">
        <section style={{
          background: 'var(--surface-container)',
          padding: 'clamp(3.5rem, 7vw, 5.5rem) clamp(1.5rem, 5vw, 3rem)',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 500,
            color: 'var(--sage-green-dark)',
            marginBottom: '0.75rem',
          }}>
            Disclaimer
          </h1>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.9rem',
            color: 'var(--on-surface-variant)',
          }}>
            Last updated: January 2025
          </p>
        </section>

        <section style={{
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            <div style={{
              background: 'var(--rose-blush)',
              border: '1px solid rgba(175, 93, 72, 0.2)',
              borderRadius: '1rem',
              padding: '1.25rem 1.5rem',
              marginBottom: '2.5rem',
            }}>
              <p style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.9375rem',
                color: 'var(--warm-terracotta-deep, var(--deep-earth))',
                lineHeight: 1.7,
                fontWeight: 500,
              }}>
                ⚠️ <strong>Important:</strong> The content on this platform is for educational purposes only.
                It is not medical advice. If you are experiencing a health emergency or mental health crisis,
                please contact emergency services or a qualified healthcare professional immediately.
              </p>
            </div>

            {sections.map((s) => (
              <div key={s.title} style={{ marginBottom: '2.5rem' }}>
                <h2 style={{
                  fontFamily: 'var(--font-eb-garamond)',
                  fontSize: '1.375rem',
                  fontWeight: 500,
                  color: 'var(--sage-green-dark)',
                  marginBottom: '0.75rem',
                }}>
                  {s.title}
                </h2>
                <p style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.9375rem',
                  color: 'var(--on-surface-variant)',
                  lineHeight: 1.8,
                }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <FooterWrapper />
    </div>
  )
}
