/**
 * Cloudflare Stream helpers (server-side only).
 * Env vars required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_STREAM_TOKEN
 */

const PLACEHOLDER_PREFIX = 'your_'

export function isStreamConfigured(): boolean {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token     = process.env.CLOUDFLARE_STREAM_TOKEN
  if (!accountId || !token) return false
  if (accountId.startsWith(PLACEHOLDER_PREFIX) || token.startsWith(PLACEHOLDER_PREFIX)) return false
  return true
}

export type StreamDirectUploadResult =
  | { ok: true;  uid: string; uploadURL: string }
  | { ok: false; error: string }

/**
 * Calls the Cloudflare Stream "direct creator upload" endpoint which returns a
 * one-time TUS URL the browser can upload to directly — no server proxy needed.
 */
export async function getStreamDirectUploadUrl(): Promise<StreamDirectUploadResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token     = process.env.CLOUDFLARE_STREAM_TOKEN

  if (!accountId || !token) {
    return { ok: false, error: 'Cloudflare Stream is not configured.' }
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 21600, // 6 hours
          requireSignedURLs: false,
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Cloudflare error ${res.status}: ${text}` }
    }

    const json = await res.json() as {
      success: boolean
      result: { uid: string; uploadURL: string }
      errors: { message: string }[]
    }

    if (!json.success) {
      return { ok: false, error: json.errors?.[0]?.message ?? 'Unknown Cloudflare error.' }
    }

    return { ok: true, uid: json.result.uid, uploadURL: json.result.uploadURL }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Cloudflare Stream API.',
    }
  }
}

/** Extracts the Stream UID from a stored video_url value like "stream:uid". */
export function parseStreamUid(videoUrl: string): string | null {
  if (videoUrl.startsWith('stream:')) return videoUrl.slice(7)
  return null
}
