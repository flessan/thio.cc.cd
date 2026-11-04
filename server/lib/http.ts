/** Small HTTP helpers shared by the Pages Functions. */

export const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
} as const

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  })
}

export function apiError(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {}
): Response {
  return json({ ok: false, error: { code, message } }, status, headers)
}

export function redirect(location: string, headers: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers
    }
  })
}

export interface CookieOptions {
  maxAge?: number
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  path?: string
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  header.split(';').forEach((part) => {
    const index = part.indexOf('=')
    if (index === -1) return
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (!name) return
    try {
      out[name] = decodeURIComponent(value)
    } catch {
      out[name] = value
    }
  })
  return out
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${options.path ?? '/'}`)
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`)
  if (options.httpOnly !== false) parts.push('HttpOnly')
  if (options.secure !== false) parts.push('Secure')
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`)
  return parts.join('; ')
}

export function clearCookie(name: string, options: CookieOptions = {}): string {
  return serializeCookie(name, '', { ...options, maxAge: 0 })
}

export function appendCookie(response: Response, cookie: string): Response {
  const next = new Response(response.body, response)
  next.headers.append('set-cookie', cookie)
  return next
}

/**
 * CSRF guard for state-changing requests.
 *
 * Same-origin `fetch` sends `Origin`; if it is present it must match exactly.
 * When it is absent (older browsers, command-line clients) we fall back to the
 * `Sec-Fetch-Site` hint and otherwise reject. Combined with SameSite cookies
 * and a JSON content type this blocks cross-site form posts.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const expected = new URL(request.url).origin
  if (origin) return origin === expected
  const site = request.headers.get('sec-fetch-site')
  if (site) return site === 'same-origin' || site === 'none'
  return true
}

export async function readJson<T = unknown>(request: Request, limit = 2_000_000): Promise<T> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Send the request as application/json.')
  }
  const text = await request.text()
  if (text.length > limit) {
    throw new HttpError(413, 'payload_too_large', 'That workspace is too large to sync.')
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request body is not valid JSON.')
  }
}

export class HttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function errorFromUnknown(error: unknown): Response {
  if (error instanceof HttpError) return apiError(error.status, error.code, error.message)
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return apiError(500, 'server_error', message)
}

/** Cache key namespaced to this deployment, for the BMKG proxy. */
export function cacheRequest(request: Request, key: string): Request {
  const url = new URL(request.url)
  url.pathname = `/__kerja-cache/${key}`
  url.search = ''
  return new Request(url.toString(), { method: 'GET' })
}
