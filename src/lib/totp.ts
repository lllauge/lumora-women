import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

const APP_NAME = 'Lumora Women Admin'

/** Generate a new TOTP secret for a user. */
export function generateTotpSecret() {
  const secret = speakeasy.generateSecret({
    name: APP_NAME,
    length: 20,
  })
  return {
    base32: secret.base32,
    otpauthUrl: secret.otpauth_url ?? '',
  }
}

/** Convert an otpauth URL to a base64 PNG QR code data URL. */
export async function generateQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl)
}

/** Verify a TOTP token against a stored base32 secret. */
export function verifyTotp(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // allow 1 step drift (±30 seconds)
  })
}
