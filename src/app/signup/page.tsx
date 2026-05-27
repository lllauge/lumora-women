'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '@/components/layout/AuthCard'
import AuthInput from '@/components/ui/AuthInput'

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required.'
    if (!form.lastName.trim())  e.lastName  = 'Last name is required.'
    if (!form.email.includes('@')) e.email = 'Enter a valid email address.'
    if (form.password.length < 8)  e.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    setServerError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { first_name: form.firstName, last_name: form.lastName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setServerError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <AuthCard
      title="Create Your Free Account"
      subtitle="Join thousands of women on the journey back to themselves."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <AuthInput label="First Name"  value={form.firstName} onChange={set('firstName')} error={errors.firstName} placeholder="Jane" />
          <AuthInput label="Last Name"   value={form.lastName}  onChange={set('lastName')}  error={errors.lastName}  placeholder="Doe" />
        </div>
        <AuthInput label="Email Address" type="email"    value={form.email}    onChange={set('email')}    error={errors.email}    placeholder="jane@example.com" />
        <AuthInput label="Password"      type="password" value={form.password} onChange={set('password')} error={errors.password} placeholder="At least 8 characters" />
        <AuthInput label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} placeholder="Repeat your password" />

        {serverError && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{ background: '#FEF2F2', color: '#B91C1C', fontFamily: 'var(--font-sans)', border: '1px solid #FECACA' }}
          >
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
          style={{ borderRadius: '0.5rem', padding: '0.875rem' }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'var(--outline-variant)' }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--outline-variant)' }} />
      </div>

      <p
        className="text-center"
        style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}
      >
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--warm-terracotta)', fontWeight: 600 }}>
          Log in
        </Link>
      </p>

      <p
        className="text-center mt-4"
        style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}
      >
        By creating an account you agree to our{' '}
        <Link href="/terms" style={{ textDecoration: 'underline' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy-policy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>
    </AuthCard>
  )
}
