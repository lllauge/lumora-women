import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const PLACEHOLDER_PREFIX = 'your_'

/**
 * Cloudflare R2 is S3-compatible, so we use the AWS SDK with R2's endpoint.
 * Env vars are placeholder strings out of the box — this helper detects that
 * and returns a clean error so callers can show a "paste a URL instead" UX.
 */

export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string
}

export function getR2Config(): R2Config | null {
  const accountId        = process.env.R2_ACCOUNT_ID
  const accessKeyId      = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey  = process.env.R2_SECRET_ACCESS_KEY
  const bucket           = process.env.R2_BUCKET_NAME
  const publicUrl        = process.env.R2_PUBLIC_URL

  const allPresent =
    !!accountId && !!accessKeyId && !!secretAccessKey && !!bucket && !!publicUrl

  if (!allPresent) return null

  // Reject the placeholder values shipped in .env.local
  const isPlaceholder = [accountId, accessKeyId, secretAccessKey, publicUrl].some(
    (v) => v!.startsWith(PLACEHOLDER_PREFIX)
  )
  if (isPlaceholder) return null

  return {
    accountId:       accountId!,
    accessKeyId:     accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket:          bucket!,
    publicUrl:       publicUrl!.replace(/\/+$/, ''),
  }
}

export function isR2Configured(): boolean {
  return getR2Config() !== null
}

let _client: S3Client | null = null
function getClient(config: R2Config): S3Client {
  if (_client) return _client
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return _client
}

export type UploadResult =
  | { ok: true;  url: string; key: string; size: number; contentType: string }
  | { ok: false; error: string }

/**
 * Uploads a File (server-side, after FormData parsing) to R2 under `key` and
 * returns the public URL. Caller is responsible for picking a sensible key
 * (e.g. `courses/{id}/thumbnails/uuid.jpg`).
 */
export async function uploadFileToR2(file: File, key: string): Promise<UploadResult> {
  const config = getR2Config()
  if (!config) {
    return {
      ok: false,
      error:
        'Cloudflare R2 is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL to .env.local — or paste an external URL instead.',
    }
  }

  try {
    const client = getClient(config)
    const buffer = Buffer.from(await file.arrayBuffer())

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
        // Cache for a year — assets are content-hashed via uuid keys
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    return {
      ok: true,
      url: `${config.publicUrl}/${key}`,
      key,
      size: file.size,
      contentType: file.type,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown R2 upload error.',
    }
  }
}

/** Returns the file extension (without dot), inferred from filename + MIME. */
export function inferExtension(file: File): string {
  const fromName = file.name.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase()
  if (fromName) return fromName
  const fromType = file.type.split('/')[1]?.toLowerCase()
  return fromType || 'bin'
}
