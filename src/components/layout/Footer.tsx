import Link from 'next/link'

const baseExploreLinks = [
  { label: 'Courses', href: '/courses' },
  { label: 'Real Talk', href: '/blog' },
  { label: 'Start Here', href: '/start-here' },
  { label: 'Community', href: '/community' },
  { label: 'About Us', href: '/about' },
  { label: 'Shop', href: '/shop' },
]

const supportLinks = [
  { label: 'Contact Us', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Results & Stories', href: '/results' },
  { label: 'Work With Me', href: '/work-with-me' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Disclaimer', href: '/disclaimer' },
]

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="footer-link">
        {label}
      </Link>
    </li>
  )
}

export default function Footer({ showShop = false }: { showShop?: boolean }) {
  const exploreLinks = showShop ? baseExploreLinks : baseExploreLinks.filter((l) => l.href !== '/shop')
  return (
    <footer className="lumora-footer">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Column 1 — Brand */}
          <div className="lg:col-span-1">
            <Link href="/" aria-label="Lumora Women — home">
              <span className="footer-logo" aria-hidden="true">Lumora</span>
            </Link>
            <p className="footer-description">
              Motherhood changes you completely. We help you bloom into who you become next.
            </p>
            <ul className="flex gap-4 mt-6 list-none p-0 m-0" aria-label="Lumora Women on social media">
              <li>
                <a
                  href="https://instagram.com/lumorawomen"
                  aria-label="Visit Lumora Women on Instagram"
                  className="footer-link"
                  style={{ display: 'inline-flex' }}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {/* Instagram icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com/@lumorawomen"
                  aria-label="Visit Lumora Women on TikTok"
                  className="footer-link"
                  style={{ display: 'inline-flex' }}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {/* TikTok icon — lucide doesn't include it, using SVG */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://youtube.com/@lumorawomen"
                  aria-label="Visit Lumora Women on YouTube"
                  className="footer-link"
                  style={{ display: 'inline-flex' }}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {/* YouTube icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
                  </svg>
                </a>
              </li>
            </ul>
            <p className="footer-email">hello@lumorawomen.com</p>
          </div>

          {/* Column 2 — Explore */}
          <div>
            <h2 className="footer-col-heading">Explore</h2>
            <ul className="space-y-3">
              {exploreLinks.map((l) => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Column 3 — Support */}
          <div>
            <h2 className="footer-col-heading">Support</h2>
            <ul className="space-y-3">
              {supportLinks.map((l) => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Column 4 — Legal */}
          <div>
            <h2 className="footer-col-heading">Legal</h2>
            <ul className="space-y-3">
              {legalLinks.map((l) => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom-bar">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Lumora Women. All rights reserved.
          </p>
          <p className="footer-copy text-center" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(200,220,192,0.65)' }}>
            Lumora Women is intended for users 18 years of age and older.
          </p>
          <p className="footer-copy text-center">
            For educational purposes only · Consult your healthcare provider
          </p>
        </div>
      </div>
    </footer>
  )
}
