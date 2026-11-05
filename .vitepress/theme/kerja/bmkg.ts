/**
 * BMKG forecast parsing and weather heuristics.
 *
 * Source: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG), public forecast
 * API `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=...`. BMKG is credited
 * wherever this data is shown. A regular forecast is *not* an official weather
 * warning, and nothing here claims otherwise.
 *
 * The parser is defensive: BMKG has shipped slightly different JSON shapes over
 * time, so it accepts both `data[].cuaca[]` and `data[].cuaca[][]`, skips
 * malformed slots, and de-duplicates timestamps.
 */
import { MINUTE, localDayKey, parseDate } from './dates'
import type { SavedLocation, Task } from './model'
import { rankRegions } from './region'

export const BMKG_API = 'https://api.bmkg.go.id/publik/prakiraan-cuaca'
export const BMKG_PORTAL = 'https://data.bmkg.go.id/prakiraan-cuaca/'
export const BMKG_ATTRIBUTION = 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'
export const BMKG_CACHE_TTL_MS = 20 * MINUTE

export const ADM4_PATTERN = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/

export interface BmkgLocationEntry {
  adm4: string
  name: string
  regency: string
  provinceCode: string
  province: string
  /** Official Kepmendagri code of the regency (may differ from the adm4 prefix). */
  regencyCode?: string
  /** Regency capital, from cahyadsn/wilayah. */
  capital?: string | null
  /** Regency centroid, not the forecast village. */
  lat?: number | null
  lon?: number | null
  elevationM?: number | null
  /** UTC offset in hours (7, 8 or 9). */
  timezone?: number | null
  areaKm2?: number | null
  population?: number | null
  kind?: 'kabupaten' | 'kota'
  officialName?: string
}

export interface BmkgLocation {
  adm4: string
  provinsi: string
  kotkab: string
  kecamatan: string
  desa: string
  latitude: number | null
  longitude: number | null
  timezone: string
}

export type WeatherKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'heavy-rain'
  | 'storm'
  | 'fog'
  | 'haze'
  | 'unknown'

export interface WeatherSlot {
  /** Absolute timestamp (ISO UTC), used to compare with task times. */
  time: string
  /** Date in the *location's* timezone, e.g. 2026-11-04. */
  localDay: string
  /** Clock time in the location's timezone, e.g. 15:00. */
  localTime: string
  temperature: number
  humidity: number
  precipitationMm: number
  cloudCover: number
  code: number
  desc: string
  descEn: string
  windSpeed: number
  windDirection: string
  windDirectionTo: string
  windDegree: number
  visibility: string
  kind: WeatherKind
  /** BMKG's own SVG icon, kept for reference; the UI draws inline icons. */
  iconUrl: string
}

export interface ForecastDay {
  date: string
  label: string
  slots: WeatherSlot[]
}

export interface Forecast {
  location: BmkgLocation
  slots: WeatherSlot[]
  days: ForecastDay[]
  timezone: string
  fetchedAt: string
  stale: boolean
}

export type ForecastResult =
  | { ok: true; forecast: Forecast }
  | { ok: false; error: string }

const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Jakarta': '+07:00',
  'Asia/Pontianak': '+07:00',
  'Asia/Makassar': '+08:00',
  'Asia/Jayapura': '+09:00',
  WIB: '+07:00',
  WITA: '+08:00',
  WIT: '+09:00'
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** Normalise BMKG's `+0700` (or `Asia/Jakarta`) into an ISO offset. */
export function timezoneOffset(value: string): string {
  const trimmed = value.trim()
  const numeric = /^([+-])(\d{2}):?(\d{2})$/.exec(trimmed)
  if (numeric) return `${numeric[1]}${numeric[2]}:${numeric[3]}`
  if (TIMEZONE_OFFSETS[trimmed]) return TIMEZONE_OFFSETS[trimmed]
  if (/^UTC$/i.test(trimmed)) return '+00:00'
  return '+07:00'
}

/**
 * `2026-11-04 15:00:00` + `+0700` becomes an absolute ISO timestamp, while the
 * original local time is preserved separately for display.
 */
export function parseBmkgDateTime(
  value: string,
  offset: string
): { time: string; localDay: string; localTime: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim())
  if (!match) return null
  const [, year, month, day, hour, minute, second = '00'] = match
  const offsetIso = timezoneOffset(offset)
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetIso}`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return {
    time: date.toISOString(),
    localDay: `${year}-${month}-${day}`,
    localTime: `${hour}:${minute}`
  }
}

/** Classify a BMKG weather code (with an English/Indonesian description fallback). */
export function weatherKind(code: number, description = ''): WeatherKind {
  if (code >= 95 && code <= 99) return 'storm'
  if (code === 63 || code === 64) return 'heavy-rain'
  if ((code >= 60 && code <= 69) || code === 80 || code === 81) return 'rain'
  if (code === 45 || code === 48) return 'fog'
  if (code === 5 || code === 10) return 'haze'
  if (code === 4) return 'overcast'
  if (code === 3) return 'cloudy'
  if (code === 2) return 'partly'
  if (code === 0 || code === 1) return 'clear'

  const text = description.toLowerCase()
  if (text.includes('petir') || text.includes('thunder')) return 'storm'
  if (text.includes('lebat') || text.includes('heavy')) return 'heavy-rain'
  if (text.includes('hujan') || text.includes('rain') || text.includes('shower')) return 'rain'
  if (text.includes('kabut') || text.includes('fog')) return 'fog'
  if (text.includes('asap') || text.includes('kabur') || text.includes('haze')) return 'haze'
  if (text.includes('berawan tebal') || text.includes('overcast')) return 'overcast'
  if (text.includes('berawan') || text.includes('cloud')) return 'cloudy'
  if (text.includes('cerah berawan') || text.includes('partly')) return 'partly'
  if (text.includes('cerah') || text.includes('clear') || text.includes('sunny')) return 'clear'
  return 'unknown'
}

export function isRainy(slot: WeatherSlot): boolean {
  return (
    slot.kind === 'rain' ||
    slot.kind === 'heavy-rain' ||
    slot.kind === 'storm' ||
    slot.precipitationMm >= 0.5
  )
}

function normalizeLocation(raw: unknown): BmkgLocation | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const adm4 = asString(source.adm4)
  if (!ADM4_PATTERN.test(adm4)) return null
  return {
    adm4,
    provinsi: asString(source.provinsi),
    kotkab: asString(source.kotkab),
    kecamatan: asString(source.kecamatan),
    desa: asString(source.desa),
    latitude: typeof source.lat === 'number' ? source.lat : null,
    longitude: typeof source.lon === 'number' ? source.lon : null,
    timezone: asString(source.timezone, 'Asia/Jakarta')
  }
}

function normalizeSlot(raw: unknown, offset: string): WeatherSlot | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const local = asString(source.local_datetime) || asString(source.utc_datetime)
  if (!local) return null
  const parsed = parseBmkgDateTime(local, offset)
  if (!parsed) return null
  const code = asNumber(source.weather, 0)
  const desc = asString(source.weather_desc)
  return {
    time: parsed.time,
    localDay: parsed.localDay,
    localTime: parsed.localTime,
    temperature: Math.round(asNumber(source.t, 0)),
    humidity: Math.round(asNumber(source.hu, 0)),
    precipitationMm: asNumber(source.tp, 0),
    cloudCover: asNumber(source.tcc, 0),
    code,
    desc,
    descEn: asString(source.weather_desc_en),
    windSpeed: asNumber(source.ws, 0),
    windDirection: asString(source.wd),
    windDirectionTo: asString(source.wd_to),
    windDegree: asNumber(source.wd_deg, 0),
    visibility: asString(source.vs_text),
    kind: weatherKind(code, `${desc} ${asString(source.weather_desc_en)}`),
    iconUrl: asString(source.image)
  }
}

function dayLabel(date: string): string {
  const parsed = parseDate(`${date}T12:00:00Z`)
  if (!parsed) return date
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  }).format(parsed)
}

/** Group slots into forecast days using the location's local date. */
export function groupForecastDays(slots: WeatherSlot[]): ForecastDay[] {
  const map = new Map<string, WeatherSlot[]>()
  slots.forEach((slot) => {
    const list = map.get(slot.localDay) ?? []
    list.push(slot)
    map.set(slot.localDay, list)
  })
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      label: dayLabel(date),
      slots: items.sort((a, b) => a.time.localeCompare(b.time))
    }))
}

/** Parse the upstream JSON envelope into the workspace's forecast shape. */
export function parseBmkgForecast(
  raw: unknown,
  fetchedAt = new Date().toISOString(),
  stale = false
): ForecastResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'BMKG returned an unexpected response.' }
  }
  const source = raw as Record<string, unknown>
  if (source.error) {
    const error = source.error as Record<string, unknown>
    return { ok: false, error: asString(error.message, 'BMKG reported an error.') }
  }
  const root = Array.isArray(source.data) ? (source.data[0] as Record<string, unknown> | undefined) : undefined
  const location = normalizeLocation(source.lokasi) ?? normalizeLocation(root?.lokasi)
  if (!location) {
    return { ok: false, error: 'This administrative code does not have a BMKG forecast.' }
  }

  const offset =
    asString((root?.lokasi as Record<string, unknown> | undefined)?.timezone) ||
    location.timezone

  const rawSlots: unknown[] = []
  const pushSlots = (value: unknown) => {
    if (Array.isArray(value)) rawSlots.push(...value)
  }
  if (root) {
    pushSlots(root.cuaca)
    if (Array.isArray(root.cuaca)) {
      root.cuaca.forEach((day) => {
        if (Array.isArray(day)) pushSlots(day)
      })
    }
  }

  const seen = new Set<string>()
  const slots: WeatherSlot[] = []
  rawSlots.forEach((item) => {
    const slot = normalizeSlot(item, offset)
    if (!slot || seen.has(slot.time)) return
    seen.add(slot.time)
    slots.push(slot)
  })
  slots.sort((a, b) => a.time.localeCompare(b.time))

  if (!slots.length) {
    return { ok: false, error: 'BMKG has no forecast slots for this location yet.' }
  }

  return {
    ok: true,
    forecast: {
      location,
      slots,
      days: groupForecastDays(slots),
      timezone: location.timezone,
      fetchedAt,
      stale
    }
  }
}

/** The slot closest to now, preferring the next upcoming one. */
export function currentSlot(forecast: Forecast, now = new Date()): WeatherSlot | null {
  if (!forecast.slots.length) return null
  const nowMs = now.getTime()
  const upcoming = forecast.slots.find((slot) => new Date(slot.time).getTime() >= nowMs)
  if (upcoming) return upcoming
  return forecast.slots[forecast.slots.length - 1]
}

export interface RainAdvice {
  severity: 'low' | 'medium' | 'high'
  title: string
  detail: string
  slots: WeatherSlot[]
  windowStart: string
  windowEnd: string
}

/**
 * A soft, purely advisory hint for outdoor tasks. It never changes the task and
 * explicitly says it is a forecast, not an official BMKG warning.
 */
export function outdoorRainAdvice(
  task: Task,
  forecast: Forecast | null,
  now = new Date()
): RainAdvice | null {
  if (!task.outdoor || !forecast) return null
  const scheduled = parseDate(task.startAt) ?? parseDate(task.dueAt)
  if (!scheduled) return null
  const startMs = scheduled.getTime()
  const endMs = startMs + Math.max(60, task.estimateMinutes ?? 60) * MINUTE
  const buffer = 90 * MINUTE
  const from = startMs - buffer
  const to = endMs + buffer
  const lastSlot = forecast.slots[forecast.slots.length - 1]
  if (!lastSlot || from > new Date(lastSlot.time).getTime() + 3 * 60 * MINUTE) return null

  const overlapping = forecast.slots.filter((slot) => {
    const at = new Date(slot.time).getTime()
    return isRainy(slot) && at >= from && at <= to
  })
  if (!overlapping.length) return null

  const inside = overlapping.filter((slot) => {
    const at = new Date(slot.time).getTime()
    return at >= startMs && at <= endMs
  })
  const severe = overlapping.some((slot) => slot.kind === 'storm' || slot.kind === 'heavy-rain')
  const severity: RainAdvice['severity'] = severe ? 'high' : inside.length ? 'medium' : 'low'
  const first = overlapping[0]
  const last = overlapping[overlapping.length - 1]
  const span =
    first === last ? first.localTime : `${first.localTime}–${last.localTime}`
  const detail = inside.length
    ? `Rain is forecast around ${span} (${first.desc}). Consider moving this outdoor task or preparing for wet weather.`
    : `Rain is forecast near ${span} (${first.desc}). Keep an eye on the sky before heading out.`

  return {
    severity,
    title: 'Rain near this outdoor task',
    detail,
    slots: overlapping,
    windowStart: new Date(from).toISOString(),
    windowEnd: new Date(to).toISOString()
  }
}

export interface WeatherCacheEntry {
  adm4: string
  fetchedAt: string
  stale: boolean
  raw: unknown
}

export function weatherCacheKey(adm4: string): string {
  return `kerja-cuaca-v1:${adm4}`
}

export function isCacheFresh(fetchedAt: string, now = new Date(), ttl = BMKG_CACHE_TTL_MS): boolean {
  const at = parseDate(fetchedAt)
  if (!at) return false
  return now.getTime() - at.getTime() <= ttl
}

/** Pick the forecast day containing `now`, or the first day. */
export function todayForecastDay(forecast: Forecast, now = new Date()): ForecastDay | null {
  const key = localDayKey(now)
  return forecast.days.find((day) => day.date === key) ?? forecast.days[0] ?? null
}

/** Rank location suggestions by name, capital, province or adm4 prefix. */
export function searchLocations(
  entries: BmkgLocationEntry[],
  query: string,
  limit = 8
): BmkgLocationEntry[] {
  return rankRegions(entries, query, limit).map((match) => match.entry)
}

export function toSavedLocation(entry: BmkgLocationEntry): SavedLocation {
  return {
    adm4: entry.adm4,
    label: entry.name,
    provinsi: entry.province,
    kotkab: entry.name
  }
}

/** Build a readable location line from the BMKG response. */
export function locationLabel(location: BmkgLocation): string {
  const parts = [location.desa, location.kecamatan, location.kotkab, location.provinsi].filter(
    (part, index, list) => Boolean(part) && list.indexOf(part) === index
  )
  return parts.join(', ') || location.adm4
}
