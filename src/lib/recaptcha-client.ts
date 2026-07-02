'use client'

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''
let scriptPromise: Promise<void> | null = null

declare global {
  interface Window {
    grecaptcha?: {
      enterprise: {
        ready(callback: () => void): void
        execute(siteKey: string, options: { action: string }): Promise<string>
      }
    }
  }
}

function loadRecaptcha() {
  if (!SITE_KEY) return Promise.resolve()
  if (window.grecaptcha?.enterprise) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-lumora-recaptcha="true"]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(SITE_KEY)}`
    script.async = true
    script.defer = true
    script.dataset.lumoraRecaptcha = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('reCAPTCHA failed to load.'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function executeRecaptcha(action: string) {
  if (!SITE_KEY) return null
  await loadRecaptcha()
  const recaptcha = window.grecaptcha?.enterprise
  if (!recaptcha) throw new Error('Security verification is unavailable.')

  await new Promise<void>((resolve) => recaptcha.ready(resolve))
  return recaptcha.execute(SITE_KEY, { action })
}
