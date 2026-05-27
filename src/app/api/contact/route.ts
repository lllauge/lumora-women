import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = body

    // TODO: replace with real email sending (Resend, SendGrid, etc.)
    console.log('[Contact Form Submission]', {
      name,
      email,
      subject,
      message,
      receivedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Contact API Error]', err)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
