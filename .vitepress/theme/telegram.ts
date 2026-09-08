// Client-side helpers for the @chfless Telegram channel API
// (https://chfless-api.pages.dev — powered by flessan/telegram_to_api,
// a read-only public JSON API running on Cloudflare Pages Functions)

export interface TgMedia {
  type: string
  width?: number
  height?: number
}

export interface TgPost {
  id: number
  type: string
  text: string
  published_at: string
  url: string
  media?: TgMedia
}

export interface TgChannel {
  id: number
  title: string
  username: string
  url: string
}

export interface TgData {
  version?: number
  channel: TgChannel
  updated_at?: string
  latest?: TgPost
  posts?: TgPost[]
}

const BASE = 'https://chfless-api.pages.dev'
const TTL = 5 * 60 * 1000 // the API itself caches for 60s; this saves repeat visits

export const channelUrl = 'https://t.me/chfless'

type Endpoint = 'latest.json' | 'posts.json'

/**
 * Fetch a channel API endpoint with a small localStorage cache.
 * Returns null when the API is unreachable (offline, CORS, outage) so
 * callers can degrade gracefully.
 */
export async function fetchChannel(endpoint: Endpoint): Promise<TgData | null> {
  const key = `flessan:tg:${endpoint}`

  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { ts, data } = JSON.parse(cached)
      if (Date.now() - ts < TTL) return data as TgData
    }
  } catch {
    /* ignore cache errors */
  }

  try {
    const res = await fetch(`${BASE}/${endpoint}`)
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as TgData
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
    } catch {
      /* storage full or blocked — fine */
    }
    return data
  } catch {
    return null
  }
}

export function clearChannelCache(endpoint: Endpoint) {
  try {
    localStorage.removeItem(`flessan:tg:${endpoint}`)
  } catch {
    /* ignore */
  }
}

/** Newest first, regardless of the order the API happens to return. */
export function sortPosts(posts: TgPost[]): TgPost[] {
  return [...posts].sort((a, b) => b.id - a.id)
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

export function absTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export interface Segment {
  text: string
  href?: string
}

/**
 * Split post text into plain-text and link segments, so the template can
 * render real anchors while Vue escapes everything (no v-html, no XSS).
 * Trailing punctuation stays outside the link, the way humans expect.
 */
export function linkify(text: string): Segment[] {
  const out: Segment[] = []
  const re = /https?:\/\/[^\s<>"')]+/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    let url = m[0]
    let cut = url.length
    // move trailing punctuation out of the URL
    while (cut > 0 && '.,;:!?'.includes(url[cut - 1])) cut--
    if (cut < url.length) {
      const rest = url.slice(cut)
      url = url.slice(0, cut)
      // re-emit trailing punctuation as plain text after the link
      if (m.index > last) out.push({ text: text.slice(last, m.index) })
      out.push({ text: url, href: url })
      out.push({ text: rest })
      last = m.index + m[0].length
      continue
    }
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ text: url, href: url })
    last = m.index + url.length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

/**
 * Unique http(s) URLs mentioned in a text, trailing punctuation stripped,
 * in order of appearance. Used to render link preview cards.
 */
export function extractUrls(text: string): string[] {
  const urls: string[] = []
  const re = /https?:\/\/[^\s<>"')]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    let url = m[0]
    while (url.length && '.,;:!?'.includes(url[url.length - 1])) url = url.slice(0, -1)
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}
