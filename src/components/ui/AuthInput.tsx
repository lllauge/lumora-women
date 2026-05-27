import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const AuthInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, id, required, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
    const errorId = `${inputId}-error`
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
          {required && (
            <span aria-hidden="true" style={{ color: '#DC2626', marginLeft: '0.25rem' }}>*</span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-required={required ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: error ? '1.5px solid #DC2626' : '1.5px solid var(--outline-variant)',
            background: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            color: 'var(--deep-earth)',
            transition: 'border-color 0.15s',
            minHeight: '44px',
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
          <p
            id={errorId}
            role="alert"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: '#DC2626', marginTop: '0.375rem' }}
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)
AuthInput.displayName = 'AuthInput'
export default AuthInput
