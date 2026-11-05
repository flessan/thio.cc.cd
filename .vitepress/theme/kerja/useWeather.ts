/**
 * BMKG forecast loading with a browser-side cache.
 *
 * The Cloudflare Pages Function caches upstream responses at the edge; this
 * layer keeps the last good payload in localStorage so the weather panel still
 * renders something useful when the network is down. A cached payload is always
 * labelled with its age, never presented as current.
 */
import { computed, reactive } from 'vue'
import {
  ADM4_PATTERN,
  BMKG_CACHE_TTL_MS,
  isCacheFresh,
  parseBmkgForecast,
  weatherCacheKey,
  type Forecast
} from './bmkg'
import type { SavedLocation } from './model'
import { rememberLocation, workspace } from './state'
import { pushToast } from './toasts'

interface WeatherCacheEntry {
  adm4: string
  fetchedAt: string
  raw: unknown
}

interface WeatherState {
  loading: boolean
  error: string
  forecast: Forecast | null
  fetchedAt: string | null
  fromCache: boolean
  stale: boolean
  lastAttempt: string | null
}

export const weather = reactive<WeatherState>({
  loading: false,
  error: '',
  forecast: null,
  fetchedAt: null,
  fromCache: false,
  stale: false,
  lastAttempt: null
})

export const weatherLocation = computed<SavedLocation | null>(
  () => workspace.settings.weatherLocation
)

let inFlight: AbortController | null = null
let requestedAdm4: string | null = null

function readCache(adm4: string): WeatherCacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(weatherCacheKey(adm4))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeatherCacheEntry
    if (!parsed || parsed.adm4 !== adm4) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(entry: WeatherCacheEntry): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(weatherCacheKey(entry.adm4), JSON.stringify(entry))
  } catch {
    /* quota or private mode */
  }
}

function applyForecast(forecast: Forecast, fromCache: boolean, error = ''): void {
  weather.forecast = forecast
  weather.fetchedAt = forecast.fetchedAt
  weather.fromCache = fromCache
  weather.stale = forecast.stale
  weather.error = error
}

function applyCached(adm4: string, error = ''): boolean {
  const cached = readCache(adm4)
  if (!cached) return false
  const parsed = parseBmkgForecast(cached.raw, cached.fetchedAt, true)
  if (!parsed.ok) return false
  applyForecast(parsed.forecast, true, error)
  return true
}

export async function loadWeather(
  adm4: string | null = weatherLocation.value?.adm4 ?? null,
  options: { force?: boolean } = {}
): Promise<void> {
  if (!adm4) {
    weather.forecast = null
    weather.error = ''
    weather.fetchedAt = null
    requestedAdm4 = null
    return
  }
  if (!ADM4_PATTERN.test(adm4)) {
    weather.error = 'That administrative code is not valid. Use the format 31.71.01.1001.'
    return
  }

  requestedAdm4 = adm4
  const cached = readCache(adm4)
  const fresh = cached ? isCacheFresh(cached.fetchedAt, new Date(), BMKG_CACHE_TTL_MS) : false

  if (cached && fresh && !options.force) {
    if (applyCached(adm4)) return
  } else if (cached) {
    // Show the previous payload immediately while the refresh runs.
    applyCached(adm4)
  }

  inFlight?.abort()
  const controller = new AbortController()
  inFlight = controller
  weather.loading = true
  weather.error = ''
  weather.lastAttempt = new Date().toISOString()

  try {
    const response = await fetch(`/api/cuaca?adm4=${encodeURIComponent(adm4)}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store'
    })
    const body = (await response.json().catch(() => null)) as
      | { ok: true; fetchedAt: string; stale?: boolean; data: unknown }
      | { ok: false; error?: { message?: string } }
      | null

    if (!response.ok || !body || body.ok !== true) {
      const message =
        body && 'error' in body && body.error?.message
          ? body.error.message
          : `BMKG forecast unavailable (${response.status}).`
      throw new Error(message)
    }
    if (requestedAdm4 !== adm4) return

    const parsed = parseBmkgForecast(body.data, body.fetchedAt, Boolean(body.stale))
    if (!parsed.ok) throw new Error(parsed.error)
    applyForecast(parsed.forecast, false)
    writeCache({ adm4, fetchedAt: body.fetchedAt, raw: body.data })
  } catch (error) {
    if (controller.signal.aborted) return
    const message =
      error instanceof Error
        ? error.message
        : 'Could not load the BMKG forecast. Check your connection.'
    if (!applyCached(adm4, message)) {
      weather.error = message
      weather.forecast = null
      weather.fetchedAt = null
    } else {
      weather.stale = true
    }
  } finally {
    if (inFlight === controller) inFlight = null
    weather.loading = false
  }
}

export async function refreshWeather(): Promise<void> {
  await loadWeather(weatherLocation.value?.adm4 ?? null, { force: true })
}

/** Persist a picked location and load its forecast. */
export async function chooseWeatherLocation(location: SavedLocation): Promise<void> {
  rememberLocation(location)
  weather.forecast = null
  await loadWeather(location.adm4, { force: true })
  pushToast({
    tone: 'success',
    title: 'Weather location saved',
    message: `${location.label} · ${location.adm4}`
  })
}

export function clearWeatherLocation(): void {
  rememberLocation(null)
  weather.forecast = null
  weather.error = ''
  weather.fetchedAt = null
}

/** Age of the displayed payload, for "updated X ago" labels. */
export function weatherAgeMinutes(now = new Date()): number | null {
  if (!weather.fetchedAt) return null
  const at = new Date(weather.fetchedAt)
  if (Number.isNaN(at.getTime())) return null
  return Math.max(0, Math.round((now.getTime() - at.getTime()) / 60_000))
}
