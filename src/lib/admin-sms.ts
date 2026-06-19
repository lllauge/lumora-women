type SmsResult = { ok: true } | { ok: false; reason: string }

export async function sendAdminSms(
  message: string,
  options?: { title?: string; priority?: -2 | -1 | 0 | 1 | 2 }
): Promise<SmsResult> {
  const token = process.env.PUSHOVER_TOKEN
  const user = process.env.PUSHOVER_USER_KEY

  if (!token || !user) {
    return { ok: false, reason: 'Pushover env vars missing; skipping notification.' }
  }

  const body = new URLSearchParams({
    token,
    user,
    message: message.slice(0, 1024),
  })
  if (options?.title) body.set('title', options.title.slice(0, 250))
  if (options?.priority !== undefined) body.set('priority', String(options.priority))

  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, reason: `Pushover responded ${res.status}: ${errText.slice(0, 200)}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'unknown notification error' }
  }
}
