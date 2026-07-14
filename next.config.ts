import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production'

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://www.google.com https://www.gstatic.com https://js.stripe.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://www.google.com https://www.gstatic.com https://*.r2.dev https://*.cloudflare.com https://customer-*.cloudflarestream.com",
      "font-src 'self' data:",
      "frame-src https://www.google.com https://recaptcha.google.com https://js.stripe.com https://*.stripe.com https://customer-*.cloudflarestream.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google.com https://recaptcha.google.com https://api.stripe.com https://upload.imagedelivery.net https://customer-*.cloudflarestream.com",
      // *.b-cdn.net: YMove exercise demo videos redirect to Bunny CDN.
      "media-src 'self' https://*.r2.dev https://customer-*.cloudflarestream.com https://*.b-cdn.net blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(isProduction ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-site',
  },
  {
    key: 'Origin-Agent-Cluster',
    value: '?1',
  },
]

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Reduced from 2gb — only allow what's needed for video uploads
      bodySizeLimit: '256mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.cloudflare.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
