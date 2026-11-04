/**
 * Region search and browsing for the weather location picker.
 *
 * The coordinates, capitals, area and population come from the MIT-licensed
 * cahyadsn/wilayah dataset (Kepmendagri No 300.2.2-2430 Tahun 2025), joined to
 * the BMKG adm4 forecast points at build time by scripts/build-region-data.py.
 * The map itself is rendered from the same data, so nothing is guessed.
 */
import type { BmkgLocationEntry } from './bmkg'

export type IslandId =
  | 'sumatra'
  | 'java'
  | 'bali-nusa-tenggara'
  | 'kalimantan'
  | 'sulawesi'
  | 'maluku'
  | 'papua'

export interface IslandGroup {
  id: IslandId
  label: string
  short: string
  prefixes: string[]
}

export const ISLANDS: IslandGroup[] = [
  { id: 'sumatra', label: 'Sumatra', short: 'Sumatra', prefixes: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21'] },
  {
    id: 'java',
    label: 'Java',
    short: 'Jawa',
    prefixes: ['31', '32', '33', '34', '35', '36']
  },
  {
    id: 'bali-nusa-tenggara',
    label: 'Bali & Nusa Tenggara',
    short: 'Bali–NT',
    prefixes: ['51', '52', '53']
  },
  { id: 'kalimantan', label: 'Kalimantan', short: 'Kalimantan', prefixes: ['61', '62', '63', '64', '65'] },
  { id: 'sulawesi', label: 'Sulawesi', short: 'Sulawesi', prefixes: ['71', '72', '73', '74', '75', '76'] },
  { id: 'maluku', label: 'Maluku', short: 'Maluku', prefixes: ['81', '82'] },
  { id: 'papua', label: 'Papua', short: 'Papua', prefixes: ['91', '92', '93', '94', '95', '96'] }
]

export interface ProvinceMeta {
  code: string
  name: string
  officialName: string
  capital: string | null
  lat: number | null
  lon: number | null
  timezone: number | null
  areaKm2: number | null
  population: number | null
  regencyCount: number
  island: IslandId
}

export interface ProvinceFile {
  source: string
  generatedAt: string
  provinces: ProvinceMeta[]
}

export type RegionMatchReason = 'name' | 'capital' | 'province' | 'code' | 'alias'

export interface RegionMatch {
  entry: BmkgLocationEntry
  score: number
  reason: RegionMatchReason
}

/** Common Indonesian shorthand and former names, expanded before matching. */
const ALIASES: Record<string, string> = {
  jogja: 'yogyakarta',
  jogjakarta: 'yogyakarta',
  yogya: 'yogyakarta',
  jkt: 'jakarta',
  jak: 'jakarta',
  dki: 'jakarta',
  'ujung pandang': 'makassar',
  bdg: 'bandung',
  sby: 'surabaya',
  smg: 'semarang',
  mks: 'makassar',
  dps: 'denpasar',
  plm: 'palembang',
  mdn: 'medan',
  bjm: 'banjarmasin',
  bpp: 'balikpapan',
  babel: 'bangka belitung',
  kepri: 'kepulauan riau',
  sumut: 'sumatera utara',
  sumbar: 'sumatera barat',
  sumsel: 'sumatera selatan',
  lampung: 'lampung',
  kalbar: 'kalimantan barat',
  kaltim: 'kalimantan timur',
  kalsel: 'kalimantan selatan',
  kaltara: 'kalimantan utara',
  kalteng: 'kalimantan tengah',
  sulsel: 'sulawesi selatan',
  sulut: 'sulawesi utara',
  sulteng: 'sulawesi tengah',
  sultra: 'sulawesi tenggara',
  gorro: 'gorontalo',
  malut: 'maluku utara',
  ntb: 'nusa tenggara barat',
  ntt: 'nusa tenggara timur',
  diy: 'yogyakarta',
  papbar: 'papua barat'
}

const PREFIX_RE = /^(kota administrasi|kabupaten administrasi|kota|kabupaten)\s+/i

/** Lowercase, strip diacritics and punctuation, collapse whitespace. */
export function normalizeRegion(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** "Kabupaten Bandung" → "Bandung" for compact labels and matching. */
export function shortRegionName(name: string): string {
  return name.replace(PREFIX_RE, '').trim()
}

function expandAliases(normalized: string): { text: string; used: boolean } {
  if (!normalized) return { text: '', used: false }
  const direct = ALIASES[normalized]
  if (direct) return { text: direct, used: true }
  const [first, ...rest] = normalized.split(' ')
  const alias = ALIASES[first]
  if (alias) return { text: [alias, ...rest].join(' '), used: true }
  return { text: normalized, used: false }
}

interface Scored {
  entry: BmkgLocationEntry
  score: number
  reason: RegionMatchReason
}

function fieldScore(text: string, query: string, tokens: string[]): number {
  if (!text || !query) return 0
  if (text === query) return 100
  if (text.startsWith(query)) return 84
  const index = text.indexOf(query)
  if (index >= 0) return 62 - Math.min(index / 12, 18)
  if (tokens.length > 1 && tokens.every((token) => text.includes(token))) return 46
  return 0
}

/**
 * Rank locations by name, capital, province, nickname or adm4 prefix.
 * Multi-word queries require every token to appear somewhere in the entry.
 */
export function rankRegions(
  entries: BmkgLocationEntry[],
  query: string,
  limit = 12
): RegionMatch[] {
  const raw = normalizeRegion(query)
  if (!raw) return []
  const expanded = expandAliases(raw)
  const tokens = expanded.text.split(' ').filter(Boolean)
  const compactCode = query.replace(/\D/g, '')

  const scored: Scored[] = []
  for (const entry of entries) {
    const name = normalizeRegion(entry.name)
    const short = normalizeRegion(shortRegionName(entry.name))
    const capital = normalizeRegion(entry.capital)
    const province = normalizeRegion(entry.province)
    const haystack = `${name} ${capital} ${province} ${entry.provinceCode}${
      compactCode.length >= 2 ? ` ${entry.adm4}` : ''
    }`
    if (!tokens.every((token) => haystack.includes(token))) continue

    const nameScore = Math.max(fieldScore(short, expanded.text, tokens) * 1.08, fieldScore(name, expanded.text, tokens))
    const capitalScore = fieldScore(capital, expanded.text, tokens) * 0.92
    const provinceScore = fieldScore(province, expanded.text, tokens) * 0.7
    let codeScore = 0
    if (compactCode.length >= 2) {
      const adm4 = entry.adm4.replace(/\./g, '')
      if (adm4.startsWith(compactCode)) codeScore = 70 + Math.min(compactCode.length, 10) * 3
    }

    let score = Math.max(nameScore, capitalScore, provinceScore, codeScore)
    if (score <= 0) continue
    // Gentle population tie-break so bigger cities surface first on equal matches.
    score += Math.log10((entry.population ?? 0) + 10) / 20

    let reason: RegionMatchReason = 'name'
    if (expanded.used && score < 100) reason = 'alias'
    if (codeScore >= nameScore && codeScore >= capitalScore && codeScore >= provinceScore) reason = 'code'
    else if (capitalScore > nameScore && capitalScore >= provinceScore) reason = 'capital'
    else if (provinceScore > nameScore) reason = 'province'

    scored.push({ entry, score, reason })
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.entry.population ?? 0) - (a.entry.population ?? 0) ||
        a.entry.name.localeCompare(b.entry.name)
    )
    .slice(0, limit)
}

export function provinceOf(entry: BmkgLocationEntry): string {
  return entry.provinceCode
}

export function inIsland(entry: BmkgLocationEntry, island: IslandId): boolean {
  const group = ISLANDS.find((item) => item.id === island)
  return Boolean(group && group.prefixes.includes(entry.provinceCode))
}

export function entriesInIsland(entries: BmkgLocationEntry[], island: IslandId | ''): BmkgLocationEntry[] {
  if (!island) return entries
  return entries.filter((entry) => inIsland(entry, island))
}

export function provincesForIsland(provinces: ProvinceMeta[], island: IslandId | ''): ProvinceMeta[] {
  if (!island) return provinces
  return provinces.filter((province) => province.island === island)
}

/** The largest cities in the dataset, used as friendly quick picks. */
export function largestCities(entries: BmkgLocationEntry[], limit = 6): BmkgLocationEntry[] {
  return entries
    .filter((entry) => entry.kind === 'kota' && (entry.population ?? 0) > 0)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, limit)
}

export function groupByProvince(
  entries: BmkgLocationEntry[]
): Array<{ code: string; name: string; entries: BmkgLocationEntry[] }> {
  const groups = new Map<string, { code: string; name: string; entries: BmkgLocationEntry[] }>()
  for (const entry of entries) {
    const group = groups.get(entry.provinceCode) ?? {
      code: entry.provinceCode,
      name: entry.province,
      entries: []
    }
    group.entries.push(entry)
    groups.set(entry.provinceCode, group)
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const numberFormat = new Intl.NumberFormat('id-ID')

export function formatPopulation(value: number | null | undefined): string {
  if (!value) return ''
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (value >= 1_000) return `${Math.round(value / 1_000)} rb`
  return numberFormat.format(value)
}

export function formatArea(value: number | null | undefined): string {
  if (!value) return ''
  if (value >= 1_000) return `${numberFormat.format(Math.round(value))} km²`
  return `${value.toFixed(1).replace('.', ',')} km²`
}

export interface LabelSegment {
  text: string
  match: boolean
}

/** Split a label around the typed query so results can show the hit. */
export function highlightSegments(label: string, query: string): LabelSegment[] {
  const needle = query.trim()
  if (needle.length < 2) return [{ text: label, match: false }]
  const index = label.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return [{ text: label, match: false }]
  return [
    { text: label.slice(0, index), match: false },
    { text: label.slice(index, index + needle.length), match: true },
    { text: label.slice(index + needle.length), match: false }
  ].filter((segment) => segment.text)
}

/** A distinct, muted hue per island group for the region map fills. */
export function islandColour(island: string): string {
  switch (island) {
    case 'sumatra':
      return '#3f7f6b'
    case 'java':
      return '#8a6a2f'
    case 'bali-nusa-tenggara':
      return '#a0522d'
    case 'kalimantan':
      return '#2f6f8f'
    case 'sulawesi':
      return '#8a6a4f'
    case 'maluku':
      return '#4f7f9f'
    case 'papua':
      return '#5f7a3f'
    default:
      return '#5f6b7a'
  }
}
