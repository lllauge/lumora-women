import type { Metadata } from 'next'
import { NotebookPen } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { getPortalContext, getMessages, isCheckInDue } from '@/lib/coaching-engagement'
import CheckInForm from '@/components/coaching/CheckInForm'
import MessageComposer from '@/components/coaching/MessageComposer'

export const metadata: Metadata = {
  title: 'Coach | Lumora Women Coaching',
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

export default async function CoachingCoachPage() {
  const { client } = await getPortalContext()
  const [messages, due] = await Promise.all([
    getMessages(client.id),
    isCheckInDue(client.id),
  ])

  // Opening the thread marks Laura's replies as read for this client.
  const hasUnreadFromCoach = messages.some((m) => m.sender === 'coach' && !m.read_by_client_at)
  if (hasUnreadFromCoach) {
    const admin = await createAdminClient()
    await admin
      .from('coaching_messages')
      .update({ read_by_client_at: new Date().toISOString() })
      .eq('coaching_client_id', client.id)
      .eq('sender', 'coach')
      .is('read_by_client_at', null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 12rem)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div
          aria-hidden="true"
          style={{
            width: '2.75rem', height: '2.75rem', borderRadius: '50%', flexShrink: 0,
            background: 'var(--dark-card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--botanical-light)', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700,
          }}
        >
          L
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Coach Laura
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Replies within 24 hours · Mon–Fri
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <CheckInForm due={due} />
      </div>

      {/* Thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
        {messages.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: '1rem', border: '1px solid rgba(200,220,192,0.35)', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              This is your direct line to Laura. Questions about your plan, swaps,
              rough days — send anything, anytime.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const fromClient = message.sender === 'client'
            return (
              <div
                key={message.id}
                style={{
                  maxWidth: '85%',
                  alignSelf: fromClient ? 'flex-end' : 'flex-start',
                  background: fromClient ? 'var(--dark-card-bg)' : '#FFFFFF',
                  border: fromClient ? 'none' : '1px solid rgba(200,220,192,0.5)',
                  borderRadius: fromClient ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  padding: '0.625rem 0.875rem',
                }}
              >
                {message.is_check_in && (
                  <p style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                    color: fromClient ? 'var(--gold-start)' : 'var(--botanical-green)', marginBottom: '0.25rem',
                  }}>
                    <NotebookPen style={{ width: '0.75rem', height: '0.75rem' }} aria-hidden="true" />
                    CHECK-IN
                  </p>
                )}
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.9rem', lineHeight: 1.55,
                  color: fromClient ? 'var(--warm-white)' : 'var(--text-primary)',
                  whiteSpace: 'pre-line', overflowWrap: 'anywhere',
                }}>
                  {message.body}
                </p>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', textAlign: 'right', marginTop: '0.25rem',
                  color: fromClient ? 'rgba(200,220,192,0.75)' : 'var(--text-muted)',
                }}>
                  {fromClient ? 'You' : 'Laura'} · {formatTimestamp(message.created_at)}
                </p>
              </div>
            )
          })
        )}
      </div>

      <MessageComposer />
    </div>
  )
}
