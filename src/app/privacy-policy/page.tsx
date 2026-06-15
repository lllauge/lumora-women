import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'

export const metadata: Metadata = {
  title: 'Privacy Policy | Lumora Women',
  description: 'Lumora Women Privacy Policy, how we collect, use, and protect your information.',
}

const sections = [
  {
    title: 'Information We Collect',
    body: `When you create an account, enroll in a course, or subscribe to our newsletter, we collect your name, email address, and payment information (processed securely by our payment provider). We may also collect usage data such as which pages you visit and how you interact with our courses.`,
  },
  {
    title: 'How We Use Your Information',
    body: `We use your information to provide and improve our services, communicate course updates and wellness content, process payments, and send newsletters you have subscribed to. We do not sell your personal information to third parties.`,
  },
  {
    title: 'Cookies and Tracking',
    body: `We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyze how our platform is used. You can control cookie settings through your browser preferences. Disabling cookies may affect some features of our platform.`,
  },
  {
    title: 'Data Security',
    body: `We implement industry-standard security measures to protect your personal information. All data is transmitted over HTTPS. Payment information is processed by PCI-compliant payment processors and we never store raw card details on our servers.`,
  },
  {
    title: 'Third-Party Services',
    body: `We use trusted third-party services to operate our platform, including Supabase (database), Cloudflare (media hosting), and payment processors. These services have their own privacy policies and are required to protect your data in accordance with applicable laws.`,
  },
  {
    title: 'Your Rights',
    body: `You have the right to access, update, or delete your personal information at any time. To make a request, contact us at the email below. For users in the European Economic Area or California, additional rights may apply under GDPR and CCPA respectively.`,
  },
  {
    title: 'Age Requirement',
    body: `Lumora Women is intended for users 18 years of age and older. Our platform sells courses and services which constitute legal contracts, and minors cannot enter into contracts. We do not knowingly collect personal information from anyone under 18. If we discover or are notified that an account belongs to someone under 18, we will delete that account and all associated personal information immediately. If you believe a person under 18 has created an account, please contact us at hello@lumorawomen.com.`,
  },
  {
    title: 'Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a prominent notice on our website. Your continued use of our services after changes are posted constitutes acceptance of the updated policy.`,
  },
  {
    title: 'Contact',
    body: `For questions or concerns about this Privacy Policy or how we handle your data, please email us at hello@lumorawomen.com.`,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: 'var(--warm-white)' }}>
      <NavbarWrapper />

      <main id="main-content">
        {/* Hero */}
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
            Privacy Policy
          </h1>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.9rem',
            color: 'var(--on-surface-variant)',
          }}>
            Last updated: January 2025
          </p>
        </section>

        {/* Content */}
        <section style={{
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 3rem)',
        }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            <p style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '1rem',
              color: 'var(--on-surface-variant)',
              lineHeight: 1.8,
              marginBottom: '2.5rem',
            }}>
              At Lumora Women, your privacy matters deeply to us. This Privacy Policy explains how we
              collect, use, and protect the information you share with us when you use our website,
              courses, and community.
            </p>

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
