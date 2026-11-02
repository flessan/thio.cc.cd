/**
 * Site-wide customization ("Playground") state.
 * ---------------------------------------------------------------------------
 * Choices are written to <html data-*> so the CSS can react without wiring
 * anything else, and mirrored into localStorage so they survive navigation and
 * reloads. A tiny inline script in the site head applies them before first
 * paint, so there is no flash of the default theme.
 */
import { ref } from 'vue'

export type AccentId = 'cobalt' | 'emerald' | 'amber' | 'rose' | 'violet' | 'graphite'
export type PaperId = 'paper' | 'white' | 'sand'
export type CornerId = 'round' | 'soft' | 'sharp'
export type MotionId = 'playful' | 'calm' | 'off'
export type DensityId = 'cozy' | 'compact'
export type EngineId =
  | 'google'
  | 'duckduckgo'
  | 'brave'
  | 'startpage'
  | 'kagi'
  | 'bing'
  | 'youtube'
  | 'github'
  | 'wikipedia'
  | 'npm'

export interface Settings {
  accent: AccentId
  paper: PaperId
  corners: CornerId
  motion: MotionId
  density: DensityId
  engine: EngineId
}

export interface Engine {
  id: EngineId
  name: string
  short: string
  url: string
  color: string
  ink: string
  hint: string
}

export const ACCENTS: Array<{ id: AccentId; label: string; swatch: string }> = [
  { id: 'violet', label: 'Violet', swatch: '#6750a4' },
  { id: 'cobalt', label: 'Cobalt', swatch: '#0b57d0' },
  { id: 'emerald', label: 'Emerald', swatch: '#00696d' },
  { id: 'amber', label: 'Amber', swatch: '#a97400' },
  { id: 'rose', label: 'Rose', swatch: '#a93b57' },
  { id: 'graphite', label: 'Graphite', swatch: '#4a4a52' }
]

export const PAPERS: Array<{ id: PaperId; label: string; swatch: string }> = [
  { id: 'paper', label: 'Tonal', swatch: '#f3edf7' },
  { id: 'white', label: 'Bright', swatch: '#fffbfe' },
  { id: 'sand', label: 'Warm', swatch: '#f8f1e7' }
]

export const CORNERS: Array<{ id: CornerId; label: string }> = [
  { id: 'round', label: 'Extra' },
  { id: 'soft', label: 'Standard' },
  { id: 'sharp', label: 'Reduced' }
]

export const MOTIONS: Array<{ id: MotionId; label: string; note: string }> = [
  { id: 'playful', label: 'Expressive', note: 'springs, morphs, ambient loops' },
  { id: 'calm', label: 'Standard', note: 'no ambient loops' },
  { id: 'off', label: 'Reduced', note: 'no animation at all' }
]

export const DENSITIES: Array<{ id: DensityId; label: string }> = [
  { id: 'cozy', label: 'Comfortable' },
  { id: 'compact', label: 'Compact' }
]

/** Every engine takes a plain query string appended to `url`. */
export const ENGINES: Engine[] = [
  {
    id: 'google',
    name: 'Google',
    short: 'G',
    url: 'https://www.google.com/search?q=',
    color: '#2f6ee0',
    ink: '#ffffff',
    hint: 'the everywhere engine'
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    short: 'DDG',
    url: 'https://duckduckgo.com/?q=',
    color: '#c1441f',
    ink: '#ffffff',
    hint: 'no tracking, no fuss'
  },
  {
    id: 'brave',
    name: 'Brave',
    short: 'B',
    url: 'https://search.brave.com/search?q=',
    color: '#fb542b',
    ink: '#1e1a14',
    hint: 'independent index'
  },
  {
    id: 'startpage',
    name: 'Startpage',
    short: 'SP',
    url: 'https://www.startpage.com/sp/search?query=',
    color: '#4d5ae0',
    ink: '#ffffff',
    hint: 'google results, privately'
  },
  {
    id: 'kagi',
    name: 'Kagi',
    short: 'K',
    url: 'https://kagi.com/search?q=',
    color: '#ffb005',
    ink: '#241a00',
    hint: 'paid, ad-free search'
  },
  {
    id: 'bing',
    name: 'Bing',
    short: 'b',
    url: 'https://www.bing.com/search?q=',
    color: '#0f7cba',
    ink: '#ffffff',
    hint: 'microsoft flavoured'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    short: 'YT',
    url: 'https://www.youtube.com/results?search_query=',
    color: '#d40029',
    ink: '#ffffff',
    hint: 'videos and rabbit holes'
  },
  {
    id: 'github',
    name: 'GitHub',
    short: 'GH',
    url: 'https://github.com/search?q=',
    color: '#24292f',
    ink: '#ffffff',
    hint: 'code, issues, people'
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    short: 'W',
    url: 'https://en.wikipedia.org/w/index.php?search=',
    color: '#54595d',
    ink: '#ffffff',
    hint: 'the long-form answer'
  },
  {
    id: 'npm',
    name: 'npm',
    short: 'npm',
    url: 'https://www.npmjs.com/search?q=',
    color: '#cb3837',
    ink: '#ffffff',
    hint: 'packages and versions'
  }
]

export const ENGINE_MAP: Record<EngineId, Engine> = Object.fromEntries(
  ENGINES.map((engine) => [engine.id, engine])
) as Record<EngineId, Engine>

/** Single-letter prefixes that switch engine as you type (`!ddg anime`). */
export const ENGINE_PREFIXES: Record<string, EngineId> = {
  'g': 'google',
  'google': 'google',
  'd': 'duckduckgo',
  'ddg': 'duckduckgo',
  'b': 'brave',
  'sp': 'startpage',
  'k': 'kagi',
  'bing': 'bing',
  'yt': 'youtube',
  'youtube': 'youtube',
  'gh': 'github',
  'w': 'wikipedia',
  'wiki': 'wikipedia',
  'npm': 'npm'
}

const STORAGE_KEY = 'flessan-playground-v1'

export const DEFAULT_SETTINGS: Settings = {
  accent: 'violet',
  paper: 'paper',
  corners: 'soft',
  motion: 'playful',
  density: 'cozy',
  engine: 'duckduckgo'
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
}

export function readSettings(): Settings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      accent: isOneOf(parsed.accent, ACCENTS.map((a) => a.id))
        ? parsed.accent
        : DEFAULT_SETTINGS.accent,
      paper: isOneOf(parsed.paper, PAPERS.map((p) => p.id))
        ? parsed.paper
        : DEFAULT_SETTINGS.paper,
      corners: isOneOf(parsed.corners, CORNERS.map((c) => c.id))
        ? parsed.corners
        : DEFAULT_SETTINGS.corners,
      motion: isOneOf(parsed.motion, MOTIONS.map((m) => m.id))
        ? parsed.motion
        : DEFAULT_SETTINGS.motion,
      density: isOneOf(parsed.density, DENSITIES.map((d) => d.id))
        ? parsed.density
        : DEFAULT_SETTINGS.density,
      engine: isOneOf(parsed.engine, ENGINES.map((e) => e.id))
        ? parsed.engine
        : DEFAULT_SETTINGS.engine
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function paint(settings: Settings) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.accent = settings.accent
  root.dataset.paper = settings.paper
  root.dataset.corners = settings.corners
  root.dataset.motion = settings.motion
  root.dataset.density = settings.density
}

/**
 * Starts at the documented defaults so server-rendered markup and the first
 * client render agree; saved choices are loaded in `bootCustomization()`,
 * which runs after hydration.
 */
export const settings = ref<Settings>({ ...DEFAULT_SETTINGS })

export function applySettings(next: Partial<Settings>, persist = true) {
  settings.value = { ...settings.value, ...next }
  paint(settings.value)
  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch {
      /* private mode: choices still apply for this page */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('flessan:settings', { detail: settings.value }))
  }
}

export function resetSettings() {
  applySettings({ ...DEFAULT_SETTINGS })
}

/** Paint saved choices as soon as the module loads (client only). */
export function bootCustomization() {
  if (typeof window === 'undefined') return
  settings.value = readSettings()
  paint(settings.value)
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    settings.value = readSettings()
    paint(settings.value)
  })
}
