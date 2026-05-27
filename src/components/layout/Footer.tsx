import Link from 'next/link'
import { Globe, Heart, Brain } from 'lucide-react'

const baseExploreLinks = [
  { label: 'Courses', href: '/courses' },
  { label: 'Journal', href: '/blog' },
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
            <Link href="/">
              <span className="footer-logo">Lumora</span>
            </Link>
            <p className="footer-description">
              An intimate wellness sanctuary for the intentional woman. Practical education for postpartum recovery, hormone health, and every season of womanhood.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" aria-label="Website" className="footer-link" style={{ display: 'inline-flex' }}>
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Community" className="footer-link" style={{ display: 'inline-flex' }}>
                <Heart className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Resources" className="footer-link" style={{ display: 'inline-flex' }}>
                <Brain className="w-5 h-5" />
              </a>
            </div>
            <p className="footer-email">hello@lumorawomen.com</p>
          </div>

          {/* Column 2 — Explore */}
          <div>
            <h4 className="footer-col-heading">Explore</h4>
            <ul className="space-y-3">
              {exploreLinks.map((l) => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Column 3 — Support */}
          <div>
            <h4 className="footer-col-heading">Support</h4>
            <ul className="space-y-3">
              {supportLinks.map((l) => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Column 4 — Legal */}
          <div>
            <h4 className="footer-col-heading">Legal</h4>
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
          <p className="footer-copy text-center">
            For educational purposes only · Consult your healthcare provider
          </p>
        </div>
      </div>
    </footer>
  )
}
