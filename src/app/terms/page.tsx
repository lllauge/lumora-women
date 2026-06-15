import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'

export const metadata: Metadata = {
  title: 'Terms of Service | Lumora Women',
  description: 'Lumora Women Terms of Service, please read before using our platform.',
}

const sections = [
  {
    title: 'Eligibility',
    body: `You must be at least 18 years of age to use the Lumora Women platform. Our platform sells courses and services which constitute legal contracts. By creating an account or making a purchase, you confirm that you are 18 years of age or older. If we discover that an account belongs to someone under 18, we will terminate that account immediately. Users under 18 are not permitted to use our Services.`,
  },
  {
    title: 'Acceptance of Terms',
    body: `By accessing or using the Lumora Women website, courses, or community (collectively, "Services"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our Services.`,
  },
  {
    title: 'Use of Services',
    body: `You agree to use our Services only for lawful purposes and in a manner that respects other users. You may not share your account credentials, reproduce course content, or use our platform for any commercial purpose without written permission. You are responsible for maintaining the confidentiality of your login information.`,
  },
  {
    title: 'Course Access and Enrollment',
    body: `Upon purchase of a paid course, you receive a personal, non-transferable license to access that course content for personal use. Course content, including videos, downloads, and written materials, is protected by copyright and may not be shared, resold, or redistributed without written consent from Lumora Women.`,
  },
  {
    title: 'Payments and Refunds',
    body: `All prices are listed in USD. By purchasing a course, you authorize us to charge your selected payment method. We offer a 7-day satisfaction window on paid courses. Refund requests submitted within 7 days of purchase will be honored without question. Requests after this period are evaluated on a case-by-case basis.`,
  },
  {
    title: 'Community Guidelines',
    body: `Our community is a safe, inclusive space. You agree not to post content that is hateful, abusive, misleading, or violates the privacy of others. We reserve the right to remove any content and revoke community access for violations of our guidelines, at our sole discretion.`,
  },
  {
    title: 'Intellectual Property',
    body: `All content on the Lumora Women platform, including text, images, videos, course materials, and branding, is the intellectual property of Lumora Women and protected under applicable copyright law. Unauthorized reproduction or distribution is prohibited and may result in legal action.`,
  },
  {
    title: 'Disclaimer of Warranties',
    body: `Our Services are provided "as is" without any warranties, express or implied. While we strive to maintain a high-quality, reliable platform, we cannot guarantee that the Services will be uninterrupted or error-free. Lumora Women content is educational in nature and is not a substitute for professional medical, psychological, or financial advice.`,
  },
  {
    title: 'Limitation of Liability',
    body: `To the fullest extent permitted by law, Lumora Women shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our Services. Our total liability shall not exceed the amount you paid to us in the 3 months preceding the claim.`,
  },
  {
    title: 'Changes to Terms',
    body: `We reserve the right to modify these Terms at any time. We will notify you of material changes via email or a notice on our website. Continued use of our Services after such changes constitutes your acceptance of the new Terms.`,
  },
  {
    title: 'Contact',
    body: `Questions about these Terms? Contact us at hello@lumorawomen.com.`,
  },
]

export default function TermsPage() {
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
            Terms of Service
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
            <p style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '1rem',
              color: 'var(--on-surface-variant)',
              lineHeight: 1.8,
              marginBottom: '2.5rem',
            }}>
              These Terms of Service govern your use of the Lumora Women platform. Please read them
              carefully. By using our website and services, you agree to these terms.
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
