'use server'

export type TotpResult = { error?: string }

/** Legacy custom-TOTP action. Native Supabase MFA is now the only supported path. */
export async function saveTotpSecret(formData?: FormData): Promise<TotpResult> {
  void formData
  return {
    error: 'This setup page has been retired. Use the secure account verification flow.',
  }
}

export async function disableTotp(): Promise<TotpResult> {
  return {
    error: 'Two-step authentication is required and cannot be disabled.',
  }
}
