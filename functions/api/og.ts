/**
 * Cloudflare Pages Function — GET /api/og?url=<target>
 *
 * Server-side Open Graph metadata fetcher, so the site can render rich link
 * previews (title, description, image) for any URL without depending on a
 * third-party service or a bot token.
 *
 * - only public http(s) URLs (loopback / private / link-local hosts rejected)
 * - reads at most the first 300 KB of an HTML response, 8s timeout
 * - og:* tags first, twitter:* / <title> / meta description as fallbacks
 * - successful responses are cached at the edge for a day
 *
 * Deployed automatically: Cloudflare Pages builds any `functions/` directory
 * at the project root (works with both the Git integration and
 * `wrangler pages deploy`).
 */

export interface OgMeta {
  title?: string
  description?: string
  image?: string
  siteName?: string
}

type Ctx = { request: Request }

const MAX_URL_LENGTH = 2048
const MAX_BODY_BYTES = 300_000
const FETCH_TIMEOUT_MS = 8_000

const UA =
  'Mozilla/5.0 (compatible; thio-cc-cd-og/1.0; +https://thio.cc.cd)'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'access-control-allow-origin': '*',
      'cache-control':
        status === 200 ? 'public, max-age=3600, s-maxage=86400' : 'no-store'
    }
  })
}

/** Reject obvious SSRF targets: loopback, private, link-local, local names. */
export function isBlockedUrl(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true
  if (u.username || u.password) return true

  const port = u.port === '' ? (u.protocol === 'https:' ? 443 : 80) : Number(u.port)
  if (port !== 80 && port !== 443) return true

  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home')) return true
  if (h === '::' || h === '::1' || h === '0.0.0.0') return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true
  if (/^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (h.includes(':') && (/^f[cd]/.test(h) || /^fe[89ab]/.test(h))) return true
  return false
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#0?39|#x27);/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&(amp);/gi, '&') // last, so double-escaped entities survive
}

/** Content of the first meta tag whose property/name matches one of `keys`. */
function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]*(?:property|name)\\s*=\\s*["']\\s*${escapeRe(key)}\\s*["'][^>]*>`,
      'i'
    )
    const tag = html.match(re)?.[0]
    if (!tag) continue
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]
    if (content && content.trim()) return decodeEntities(content).trim()
  }
  return undefined
}

function absolute(u: string | undefined, base: string): string | undefined {
  if (!u) return undefined
  try {
    return new URL(u, base).href
  } catch {
    return undefined
  }
}

function clip(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined
  const t = s.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : undefined
}

export function extractMeta(html: string, baseUrl: string): OgMeta {
  const titleTag = html
    .match(/<title[^>]*>([\s\S]{0,600}?)<\/title>/i)?.[1]
    ?.replace(/<[^>]+>/g, '')

  const title =
    metaContent(html, ['og:title', 'twitter:title']) ??
    (titleTag ? decodeEntities(titleTag) : undefined)

  const description = metaContent(html, [
    'og:description',
    'twitter:description',
    'description'
  ])

  const rawImage = metaContent(html, [
    'og:image',
    'og:image:url',
    'og:image:secure_url',
    'twitter:image',
    'twitter:image:src'
  ])

  return {
    title: clip(title, 300),
    description: clip(description, 600),
    image: clip(absolute(rawImage, baseUrl), 1000),
    siteName: clip(metaContent(html, ['og:site_name']), 100)
  }
}

async function readCappedBody(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return res.text()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let received = 0
  while (received < MAX_BODY_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    chunks.push(decoder.decode(value, { stream: true }))
  }
  try {
    await reader.cancel()
  } catch {
    /* already closed */
  }
  return chunks.join('')
}

export const onRequestGet = async ({ request }: Ctx): Promise<Response> => {
  const target = new URL(request.url).searchParams.get('url')
  if (!target) return json({ error: 'missing url parameter' }, 400)
  if (target.length > MAX_URL_LENGTH) return json({ error: 'url too long' }, 400)

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return json({ error: 'invalid url' }, 400)
  }
  if (isBlockedUrl(parsed)) return json({ error: 'url not allowed' }, 400)

  try {
    const signal =
      typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(FETCH_TIMEOUT_MS)
        : undefined
    const res = await fetch(parsed.href, {
      redirect: 'follow',
      signal,
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!res.ok) return json({ error: `upstream responded ${res.status}` }, 502)

    const type = res.headers.get('content-type') || ''
    if (!/text\/html|application\/xhtml/i.test(type)) {
      return json({ error: 'not an html page' }, 415)
    }

    const html = await readCappedBody(res)
    if (!html) return json({ error: 'empty response' }, 502)

    const meta = extractMeta(html, parsed.href)
    return json({ url: parsed.href, ...meta })
  } catch {
    return json({ error: 'fetch failed' }, 502)
  }
}
