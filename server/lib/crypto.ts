/**
 * WebCrypto helpers for the encrypted, stateless session cookie.
 *
 * The cookie contains the GitHub tokens, sealed with AES-256-GCM using a key
 * derived from SESSION_SECRET. Only the server holds the secret; the browser
 * receives an opaque value in an HttpOnly cookie and JavaScript never sees a
 * GitHub token.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const AAD = encoder.encode('kerja-session-v1') as unknown as BufferSource
const PREFIX = 'v1'

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] as number)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '==='.slice((normalized.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function importKey(secret: string): Promise<CryptoKey> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', encoder.encode(secret) as unknown as BufferSource)
  )
  return crypto.subtle.importKey(
    'raw',
    digest as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/** Encrypt a JSON-serialisable payload into `v1.<iv>.<ciphertext>`. */
export async function seal(
  payload: unknown,
  secret: string,
  aad: BufferSource = AAD
): Promise<string> {
  const key = await importKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = encoder.encode(JSON.stringify(payload))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource, additionalData: aad },
      key,
      plaintext as unknown as BufferSource
    )
  )
  return `${PREFIX}.${bytesToBase64Url(iv)}.${bytesToBase64Url(ciphertext)}`
}

/** Decrypt and parse a sealed value. Returns null for tampered or malformed data. */
export async function open<T>(
  token: string,
  secret: string,
  aad: BufferSource = AAD
): Promise<T | null> {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  try {
    const key = await importKey(secret)
    const iv = base64UrlToBytes(parts[1] as string) as unknown as BufferSource
    const ciphertext = base64UrlToBytes(parts[2] as string) as unknown as BufferSource
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      key,
      ciphertext
    )
    return JSON.parse(decoder.decode(plaintext)) as T
  } catch {
    return null
  }
}

/** Random URL-safe token, used for the OAuth state parameter. */
export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return bytesToBase64Url(buffer)
}

/** Constant-time string comparison for the OAuth state check. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}
