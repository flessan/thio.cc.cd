// Client-side link metadata (Open Graph) loader with a localStorage cache.
//
// Tries the site's own /api/og Cloudflare Pages Function first - self-hosted,
// edge-cached, no third party involved. Falls back to the public microlink.io
// API called straight from the visitor's browser when /api/og cannot resolve
// the URL (unreachable target, local dev without Functions, etc.). If both
// fail, the card simply shows the URL - nothing ever breaks the page.

export interface LinkMeta {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

const TTL = 24 * 60 * 60 * 1000
const KEY = 'flessan:og:'

function fromCache(url: string): LinkMeta | null {
  try {
    const raw = localStorage.getItem(KEY + url)
    if (!raw) return null
    const { ts, meta } = JSON.parse(raw)
    if (Date.now() - ts > TTL) {
      localStorage.removeItem(KEY + url)
      return null
    }
    return meta as LinkMeta
  } catch {
    return null
  }
}

function toCache(meta: LinkMeta) {
  try {
    localStorage.setItem(KEY + meta.url, JSON.stringify({ ts: Date.now(), meta }))
  } catch {
    /* storage unavailable - fine */
  }
}

async function fromOwnApi(url: string): Promise<LinkMeta | null> {
  try {
    const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const m = await res.json()
    if (!m || (!m.title && !m.description && !m.image)) return null
    return {
      url,
      title: m.title || undefined,
      description: m.description || undefined,
      image: m.image || undefined,
      siteName: m.siteName || undefined
    }
  } catch {
    return null
  }
}

async function fromMicrolink(url: string): Promise<LinkMeta | null> {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const j = await res.json()
    const d = j?.data
    if (!d) return null
    const meta: LinkMeta = {
      url,
      title: typeof d.title === 'string' ? d.title : undefined,
      description: typeof d.description === 'string' ? d.description : undefined,
      image: d.image?.url || d.logo?.url || undefined,
      siteName: typeof d.publisher === 'string' ? d.publisher : undefined
    }
    return meta.title || meta.description || meta.image ? meta : null
  } catch {
    return null
  }
}

export async function fetchLinkMeta(url: string): Promise<LinkMeta | null> {
  const cached = fromCache(url)
  if (cached) return cached
  let meta = await fromOwnApi(url)
  if (!meta) meta = await fromMicrolink(url)
  if (meta) toCache(meta)
  return meta
}
