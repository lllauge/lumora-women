const ADMIN_MFA_COOKIE = 'admin_mfa'
const ADMIN_TOTP_PENDING_COOKIE = 'admin_totp_pending'

export const adminSessionCookies = {
  mfa: ADMIN_MFA_COOKIE,
  pending: ADMIN_TOTP_PENDING_COOKIE,
  legacyMfa: 'totp_verified',
  legacyPending: 'totp_pending',
  loginAt: 'admin_login_at',
} as const
