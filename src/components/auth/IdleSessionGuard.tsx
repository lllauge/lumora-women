'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { SessionArea } from '@/lib/session-activity'

const IDLE_MS: Record<SessionArea, number> = {
  admin: 30 * 60 * 1000,
  client: 60 * 60 * 1000,
}
const WARNING_MS = 2 * 60 * 1000
const HEARTBEAT_THROTTLE_MS = 30 * 1000

function sessionArea(pathname: string): SessionArea | null {
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) return 'admin'
  if (
    pathname.startsWith('/dashboard')
    || pathname.startsWith('/lesson')
    || pathname.startsWith('/coaching/onboarding')
    || pathname.startsWith('/coaching/today')
    || pathname.startsWith('/coaching/plan')
    || pathname.startsWith('/coaching/progress')
    || pathname.startsWith('/coaching/coach')
  ) return 'client'
  return null
}

export default function IdleSessionGuard() {
  const pathname = usePathname()
  const area = sessionArea(pathname)
  const lastActivityRef = useRef(0)
  const lastHeartbeatRef = useRef(0)
  const signingOutRef = useRef(false)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)

  const signOutForInactivity = useCallback((activeArea: SessionArea) => {
    if (signingOutRef.current) return
    signingOutRef.current = true
    window.location.assign(`/api/auth/idle-signout?area=${activeArea}`)
  }, [])

  const recordActivity = useCallback(async (activeArea: SessionArea, forceHeartbeat = false) => {
    const now = Date.now()
    if (now - lastActivityRef.current > IDLE_MS[activeArea]) {
      signOutForInactivity(activeArea)
      return
    }
    lastActivityRef.current = now
    localStorage.setItem(`lumora_last_activity_${activeArea}`, String(now))
    setSecondsRemaining(null)

    if (!forceHeartbeat && now - lastHeartbeatRef.current < HEARTBEAT_THROTTLE_MS) return
    lastHeartbeatRef.current = now
    const response = await fetch('/api/auth/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: activeArea }),
      credentials: 'same-origin',
    }).catch(() => null)
    if (response?.status === 401 || response?.status === 403) {
      signOutForInactivity(activeArea)
    }
  }, [signOutForInactivity])

  useEffect(() => {
    if (!area) return

    const storageKey = `lumora_last_activity_${area}`
    const stored = Number(localStorage.getItem(storageKey))
    lastActivityRef.current = Number.isFinite(stored) && stored > 0 ? stored : Date.now()
    if (Date.now() - lastActivityRef.current > IDLE_MS[area]) {
      signOutForInactivity(area)
      return
    }
    void recordActivity(area, true)

    const onActivity = () => { void recordActivity(area) }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void recordActivity(area, true)
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return
      const value = Number(event.newValue)
      if (Number.isFinite(value) && value > lastActivityRef.current) {
        lastActivityRef.current = value
        setSecondsRemaining(null)
      }
    }
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'focus']
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('storage', onStorage)

    const timer = window.setInterval(() => {
      const remaining = IDLE_MS[area] - (Date.now() - lastActivityRef.current)
      if (remaining <= 0) {
        signOutForInactivity(area)
      } else if (remaining <= WARNING_MS) {
        setSecondsRemaining(Math.ceil(remaining / 1000))
      } else {
        setSecondsRemaining(null)
      }
    }, 15_000)

    return () => {
      window.clearInterval(timer)
      events.forEach((event) => window.removeEventListener(event, onActivity))
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('storage', onStorage)
    }
  }, [area, recordActivity, signOutForInactivity])

  if (!area || secondsRemaining === null) return null

  const minutes = Math.max(1, Math.ceil(secondsRemaining / 60))
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', left: '50%', bottom: '1rem', zIndex: 10000,
        transform: 'translateX(-50%)', width: 'min(92vw, 32rem)',
        padding: '0.875rem 1rem', borderRadius: '0.75rem',
        background: '#FFF7E6', border: '1px solid #D7A91E',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        color: '#382D0A', fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
      }}
    >
      <strong>You’ll be signed out in about {minutes} minute{minutes === 1 ? '' : 's'}.</strong>{' '}
      <button
        type="button"
        onClick={() => void recordActivity(area, true)}
        style={{
          border: 0, padding: 0, background: 'transparent', color: '#3F6936',
          font: 'inherit', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer',
        }}
      >
        Stay signed in
      </button>
    </div>
  )
}
