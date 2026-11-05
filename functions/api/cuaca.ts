/**
 * GET /api/cuaca?adm4=31.71.01.1001
 *
 * Thin, cached proxy for BMKG's official public forecast API.
 * - only the fixed api.bmkg.go.id host is fetched (no open proxy)
 * - successful responses are cached at the edge (30 min) with a 24 h stale copy
 * - errors are translated into clear JSON instead of leaking upstream details
 *
 * Weather data source: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG),
 * https://data.bmkg.go.id/prakiraan-cuaca/. Attribution is required and shown in
 * the workspace UI.
 */
import { apiError, cacheRequest, json } from '../../server/lib/http'

const BMKG_ENDPOINT = 'https://api.bmkg.go.id/publik/prakiraan-cuaca'
const ADM4_PATTERN = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/
const FRESH_TTL = 30 * 60
const STALE_TTL = 24 * 60 * 60
const UA = 'thio-cc-cd-kerja/1.0 (+https://thio.cc.cd/kerja)'

interface CachePayload {
  fetchedAt: string
  data: unknown
}

function upstreamError(status: number): Response {
  if (status === 404 || status === 400) {
    return apiError(
      404,
      'not_found',
      'BMKG has no forecast for that administrative code. Check the village code and try again.'
    )
  }
  if (status === 429) {
    return apiError(429, 'rate_limited', 'BMKG is rate limiting requests. Try again in a minute.')
  }
  return apiError(502, 'upstream_error', 'BMKG did not return a forecast. Try again shortly.')
}

async function readCache(key: Request): Promise<CachePayload | null> {
  if (typeof caches === 'undefined' || !caches.default) return null
  try {
    const hit = await caches.default.match(key)
    if (!hit) return null
    const parsed = (await hit.json()) as CachePayload
    if (!parsed || !parsed.data) return null
    return parsed
  } catch {
    return null
  }
}

async function writeCache(key: Request, payload: CachePayload, ttl: number): Promise<void> {
  if (typeof caches === 'undefined' || !caches.default) return
  try {
    await caches.default.put(
      key,
      new Response(JSON.stringify(payload), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${ttl}`
        }
      })
    )
  } catch {
    /* cache is best-effort */
  }
}

function success(payload: CachePayload, stale: boolean, cacheState: 'hit' | 'miss'): Response {
  return json(
    {
      ok: true,
      source: 'BMKG',
      attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
      fetchedAt: payload.fetchedAt,
      stale,
      data: payload.data
    },
    200,
    {
      'cache-control': 'public, max-age=120, s-maxage=900',
      'x-data-source': 'BMKG',
      'x-kerja-cache': cacheState,
      ...(stale ? { 'x-kerja-stale': 'true' } : {})
    }
  )
}

export const onRequestGet = async ({
  request
}: {
  request: Request
}): Promise<Response> => {
  const url = new URL(request.url)
  const adm4 = (url.searchParams.get('adm4') ?? '').trim()
  if (!adm4) {
    return apiError(400, 'missing_adm4', 'Select a location first (administrative code adm4).')
  }
  if (!ADM4_PATTERN.test(adm4)) {
    return apiError(
      400,
      'invalid_adm4',
      'Administrative codes look like 31.71.01.1001 (province.regency.district.village).'
    )
  }

  const freshKey = cacheRequest(request, `bmkg-fresh-${adm4}`)
  const staleKey = cacheRequest(request, `bmkg-stale-${adm4}`)

  const cached = await readCache(freshKey)
  if (cached) return success(cached, false, 'hit')

  const upstreamUrl = `${BMKG_ENDPOINT}?adm4=${encodeURIComponent(adm4)}`
  let response: Response
  try {
    response = await fetch(upstreamUrl, {
      headers: { accept: 'application/json', 'user-agent': UA },
      signal: AbortSignal.timeout(9_000)
    })
  } catch {
    const stale = await readCache(staleKey)
    if (stale) return success(stale, true, 'hit')
    return apiError(
      504,
      'timeout',
      'BMKG took too long to respond. Check your connection and try again.'
    )
  }

  if (!response.ok) {
    const stale = await readCache(staleKey)
    if (stale) return success(stale, true, 'hit')
    return upstreamError(response.status)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    const stale = await readCache(staleKey)
    if (stale) return success(stale, true, 'hit')
    return apiError(502, 'upstream_error', 'BMKG returned a response the workspace could not read.')
  }

  if (!data || typeof data !== 'object' || !('lokasi' in data) || !('data' in data)) {
    return apiError(502, 'upstream_error', 'BMKG returned an unexpected forecast format.')
  }

  const payload: CachePayload = { fetchedAt: new Date().toISOString(), data }
  await Promise.all([
    writeCache(freshKey, payload, FRESH_TTL),
    writeCache(staleKey, payload, STALE_TTL)
  ])
  return success(payload, false, 'miss')
}
