import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, NotebookPen } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import AdminReplyComposer from '@/components/admin/AdminReplyComposer'

export const metadata: Metadata = {
  title: 'Coaching Messages',
  robots: { index: false, follow: false },
}

type MessageRow = {
  id: string
  coaching_client_id: string
  sender: 'client' | 'coach'
  body: string
  is_check_in: boolean
  read_by_coach_at: string | null
  created_at: string
}

type ClientRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

function clientName(client: ClientRow) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || client.email
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: selectedId } = await searchParams
  const admin = await createAdminClient()

  const [{ data: clientRows }, { data: messageRows }] = await Promise.all([
    admin
      .from('coaching_clients')
      .select('id, email, first_name, last_name')
      .order('created_at', { ascending: false }),
    admin
      .from('coaching_messages')
      .select('id, coaching_client_id, sender, body, is_check_in, read_by_coach_at, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const clients = (clientRows ?? []) as ClientRow[]
  const messages = (messageRows ?? []) as MessageRow[]

  const summaries = clients.map((client) => {
    const clientMessages = messages.filter((m) => m.coaching_client_id === client.id)
    return {
      client,
      lastMessage: clientMessages[0] ?? null,
      unread: clientMessages.filter((m) => m.sender === 'client' && !m.read_by_coach_at).length,
    }
  }).sort((a, b) => {
    const aTime = a.lastMessage?.created_at ?? ''
    const bTime = b.lastMessage?.created_at ?? ''
    return bTime.localeCompare(aTime)
  })

  const selected = clients.find((c) => c.id === selectedId) ?? null
  const thread = selected
    ? messages.filter((m) => m.coaching_client_id === selected.id).reverse()
    : []

  // Opening a thread marks its client messages as read.
  if (selected && thread.some((m) => m.sender === 'client' && !m.read_by_coach_at)) {
    await admin
      .from('coaching_messages')
      .update({ read_by_coach_at: new Date().toISOString() })
      .eq('coaching_client_id', selected.id)
      .eq('sender', 'client')
      .is('read_by_coach_at', null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '2rem', fontWeight: 600, color: 'var(--admin-on-surface)' }}>
          Messages
        </h1>
        <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
          Direct messages and weekly check-ins from your coaching clients.
        </p>
      </div>

      <div className="admin-msg-grid" data-thread-open={selected ? 'true' : 'false'}>

        {/* Client list */}
        <div className="admin-card admin-msg-list overflow-hidden" style={{ borderRadius: '0.75rem' }}>
          {summaries.length === 0 ? (
            <p className="px-5 py-10 text-center" style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
              No coaching clients yet.
            </p>
          ) : (
            summaries.map(({ client, lastMessage, unread }, i) => {
              const active = client.id === selected?.id
              return (
                <Link
                  key={client.id}
                  href={`/admin/messages?client=${client.id}`}
                  style={{
                    display: 'block', padding: '0.875rem 1.125rem', textDecoration: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--admin-outline-variant)',
                    background: active ? 'var(--section-tint)' : 'transparent',
                    borderLeft: active ? '3px solid var(--botanical-green)' : '3px solid transparent',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.9rem', fontWeight: unread > 0 ? 700 : 600, color: 'var(--admin-on-surface)' }}>
                      {clientName(client)}
                    </span>
                    {unread > 0 && (
                      <span
                        aria-label={`${unread} unread`}
                        style={{
                          background: 'var(--gold-dark)', color: '#1A2818',
                          fontFamily: 'var(--font-hanken)', fontSize: '0.6875rem', fontWeight: 700,
                          borderRadius: '999px', padding: '0.0625rem 0.4375rem', flexShrink: 0,
                        }}
                      >
                        {unread}
                      </span>
                    )}
                  </span>
                  <span style={{
                    display: 'block', fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem',
                    color: 'var(--admin-on-surface-variant)', marginTop: '0.125rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {lastMessage
                      ? `${lastMessage.sender === 'coach' ? 'You: ' : ''}${lastMessage.is_check_in ? 'Check-in · ' : ''}${lastMessage.body}`
                      : 'No messages yet'}
                  </span>
                </Link>
              )
            })
          )}
        </div>

        {/* Thread */}
        <div className="admin-card admin-msg-thread overflow-hidden" style={{ borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', textAlign: 'center' }}>
                Select a client to read and reply to her messages.
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--admin-outline-variant)' }}>
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                  <Link
                    href="/admin/messages"
                    className="admin-msg-back items-center"
                    aria-label="Back to client list"
                    style={{ color: 'var(--admin-on-surface-variant)' }}
                  >
                    <ArrowLeft size={18} />
                  </Link>
                  <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--admin-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {clientName(selected)}
                  </h2>
                </div>
                <Link
                  href={`/admin/coaching/${selected.id}`}
                  style={{
                    fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--botanical-green)', textDecoration: 'none', flexShrink: 0,
                    border: '1px solid var(--admin-outline-variant)', borderRadius: '0.5rem', padding: '0.375rem 0.75rem',
                  }}
                >
                  View plan & progress
                </Link>
              </div>

              <div className="flex-1 px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', overflowY: 'auto' }}>
                {thread.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: 'var(--admin-on-surface-variant)', textAlign: 'center', padding: '2rem 0' }}>
                    No messages with {clientName(selected)} yet — say hello below.
                  </p>
                ) : (
                  thread.map((message) => {
                    const fromCoach = message.sender === 'coach'
                    return (
                      <div
                        key={message.id}
                        style={{
                          maxWidth: '80%',
                          alignSelf: fromCoach ? 'flex-end' : 'flex-start',
                          background: fromCoach ? 'var(--dark-card-bg)' : 'var(--page-bg)',
                          border: fromCoach ? 'none' : '1px solid var(--admin-outline-variant)',
                          borderRadius: fromCoach ? '0.875rem 0.875rem 0.25rem 0.875rem' : '0.875rem 0.875rem 0.875rem 0.25rem',
                          padding: '0.625rem 0.875rem',
                        }}
                      >
                        {message.is_check_in && (
                          <p style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            fontFamily: 'var(--font-hanken)', fontSize: '0.6875rem', fontWeight: 700,
                            color: 'var(--botanical-green)', marginBottom: '0.25rem',
                          }}>
                            <NotebookPen style={{ width: '0.75rem', height: '0.75rem' }} aria-hidden="true" />
                            CHECK-IN
                          </p>
                        )}
                        <p style={{
                          fontFamily: 'var(--font-hanken)', fontSize: '0.9rem', lineHeight: 1.55,
                          color: fromCoach ? '#F8F6F0' : 'var(--admin-on-surface)',
                          whiteSpace: 'pre-line', overflowWrap: 'anywhere',
                        }}>
                          {message.body}
                        </p>
                        <p style={{
                          fontFamily: 'var(--font-hanken)', fontSize: '0.6875rem', textAlign: 'right', marginTop: '0.25rem',
                          color: fromCoach ? 'rgba(200,220,192,0.75)' : 'var(--admin-on-surface-variant)',
                        }}>
                          {fromCoach ? 'You' : clientName(selected).split(' ')[0]} · {formatTimestamp(message.created_at)}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="px-5 py-4" style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
                <AdminReplyComposer clientId={selected.id} clientName={clientName(selected).split(' ')[0]} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
