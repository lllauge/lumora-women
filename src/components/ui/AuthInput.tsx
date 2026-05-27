import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const AuthInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--deep-earth)',
            marginBottom: '0.375rem',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: error ? '1.5px solid #DC2626' : '1.5px solid var(--outline-variant)',
            background: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9375rem',
            color: 'var(--deep-earth)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--sage-green-deep)'
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#DC2626' : 'var(--outline-variant)'
            props.onBlur?.(e)
          }}
          {...props}
        />
        {error && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: '#DC2626', marginTop: '0.375rem' }}>
            {error}
          </p>
        )}
      </div>
    )
  }
)
AuthInput.displayName = 'AuthInput'
export default AuthInput
