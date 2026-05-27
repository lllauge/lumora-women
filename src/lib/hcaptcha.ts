/**
 * Verify an hCaptcha response token on the server side.
 * Returns true if verification passes or if hCaptcha is not configured
 * (so the app works in development without hCaptcha credentials).
 */
export async function verifyHcaptcha(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY
  if (!secret) {
    // hCaptcha not configured — skip verification in development
    return true
  }

  if (!token) return false

  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })

    const data = await res.json() as { success: boolean; 'error-codes'?: string[] }
    return data.success === true
  } catch {
    // Fail open so a hCaptcha outage doesn't block legitimate users
    return true
  }
}
