<script setup lang="ts">
/**
 * /kerja — the personal workspace.
 * Shares the site's design tokens, settings store and search engines so the
 * workspace feels like a room in the same house, not a separate island.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import shortcutData from 'virtual:kerja-shortcuts'
import {
  ACCENTS,
  DENSITIES,
  ENGINES,
  ENGINE_PREFIXES,
  PAPERS,
  applySettings,
  bootCustomization,
  settings,
  type Engine
} from '../customize'
import { motionLevel, pop } from '../effects'
import { animate, stagger } from 'animejs'

type Shortcut = { name: string; url: string; icon: string; category: string }
type Mode = 'system' | 'light' | 'dark'
type Kind = 'web' | 'shortcut' | 'page' | 'action' | 'history'

interface Item {
  id: string
  kind: Kind
  label: string
  hint?: string
  url?: string
  path?: string
  term?: string
  category?: string
  icon?: string
  initial?: string
  engine?: Engine
  action?: () => void
}

const shortcuts = shortcutData as Shortcut[]
const PIN_KEY = 'kerja-pins-v1'
const RECENT_KEY = 'kerja-recent-v1'
const HISTORY_KEY = 'kerja-searches-v1'
const MAX_RECENT = 6
const MAX_HISTORY = 8

const themeOptions: Array<{ id: Mode; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Auto' }
]

/* ------------------------------------------------------------------ state */

const query = ref('')
const palette = ref(false)
const active = ref(0)
const engineMenu = ref(false)
const lookOpen = ref(false)
const activeCategory = ref('All')
const input = ref<HTMLInputElement | null>(null)
const bar = ref<HTMLElement | null>(null)
const engineWrap = ref<HTMLElement | null>(null)
const lookWrap = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)
const failed = ref(new Set<string>())
const mode = ref<Mode>('system')
const isDark = ref(false)
const clock = ref('--:--')

const pins = ref<string[]>(readList(PIN_KEY))
const recent = ref<string[]>(readList(RECENT_KEY))
const history = ref<string[]>(readList(HISTORY_KEY))

function readList(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function writeList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode */
  }
}

const engine = computed<Engine>(
  () => ENGINES.find((item) => item.id === settings.value.engine) ?? ENGINES[0]
)

const byUrl = computed(() => new Map(shortcuts.map((item) => [item.url, item])))
const pinnedItems = computed(() =>
  pins.value.map((url) => byUrl.value.get(url)).filter((item): item is Shortcut => Boolean(item))
)
const recentItems = computed(() =>
  recent.value.map((url) => byUrl.value.get(url)).filter((item): item is Shortcut => Boolean(item))
)

const categories = computed(() => {
  const map = new Map<string, number>()
  shortcuts.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + 1))
  return [
    { name: 'All', count: shortcuts.length },
    ...[...map.entries()].map(([name, count]) => ({ name, count }))
  ]
})

const groups = computed(() => {
  const list =
    activeCategory.value === 'All'
      ? [...new Set(shortcuts.map((item) => item.category))]
      : [activeCategory.value]
  return list.map((name) => ({
    name,
    count: shortcuts.filter((item) => item.category === name).length,
    items: shortcuts.filter((item) => item.category === name)
  }))
})

const desktop = computed(() => settings.value.density === 'compact')

/* -------------------------------------------------------------- utilities */

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function markFailed(url: string) {
  failed.value = new Set(failed.value).add(url)
}

function rememberRecent(url: string) {
  recent.value = [url, ...recent.value.filter((item) => item !== url)].slice(0, MAX_RECENT)
  writeList(RECENT_KEY, recent.value)
}

function rememberSearch(term: string) {
  const clean = term.trim()
  if (!clean) return
  history.value = [clean, ...history.value.filter((item) => item !== clean)].slice(0, MAX_HISTORY)
  writeList(HISTORY_KEY, history.value)
}

function togglePin(url: string) {
  pins.value = pins.value.includes(url)
    ? pins.value.filter((item) => item !== url)
    : [url, ...pins.value]
  writeList(PIN_KEY, pins.value)
}

function clearRecent() {
  recent.value = []
  writeList(RECENT_KEY, recent.value)
}

function selectEngine(id: Engine['id'], event?: Event) {
  applySettings({ engine: id })
  engineMenu.value = false
  if (event) pop(event.currentTarget as HTMLElement)
  nextTick(() => input.value?.focus())
}

function toggleDensity() {
  applySettings({ density: desktop.value ? 'cozy' : 'compact' })
}

function pickMode(next: Mode) {
  mode.value = next
  applyMode()
}

function applyMode() {
  if (typeof window === 'undefined') return
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark)
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
  try {
    window.localStorage.setItem(
      'vitepress-theme-appearance',
      mode.value === 'system' ? 'auto' : mode.value
    )
  } catch {
    /* private mode */
  }
}

function cycleTheme() {
  pickMode(isDark.value ? 'light' : 'dark')
}

/* ------------------------------------------------------------ web search */

function bang(value: string): { engine: Engine; rest: string } | null {
  const match = value.match(/^\s*!(\w+)\s+(.+)$/)
  if (!match) return null
  const id = ENGINE_PREFIXES[match[1].toLowerCase()]
  if (!id) return null
  const found = ENGINES.find((item) => item.id === id)
  return found ? { engine: found, rest: match[2].trim() } : null
}

const resolved = computed(() => bang(query.value))

function openWeb(term: string, target: Engine = engine.value) {
  const raw = term.trim()
  if (!raw) return
  const parsed = bang(raw)
  const selected = parsed?.engine ?? target
  const real = parsed?.rest ?? raw
  if (!real) return
  if (selected.id !== settings.value.engine) applySettings({ engine: selected.id })
  rememberSearch(real)
  window.open(`${selected.url}${encodeURIComponent(real)}`, '_blank', 'noopener')
  palette.value = false
}

function openShortcut(url: string) {
  rememberRecent(url)
  window.open(url, '_blank', 'noopener')
  palette.value = false
}

/* -------------------------------------------------------- command palette */

const pages = [
  { label: 'Home', path: '/', hint: 'thio.cc.cd' },
  { label: 'Blog', path: '/blog', hint: 'field notes' },
  { label: 'Projects', path: '/projects', hint: 'things I built' },
  { label: 'GDIPS', path: '/gdips', hint: 'community server' },
  { label: 'About', path: '/about', hint: 'the long version' },
  { label: 'Support', path: '/support', hint: 'keep it running' }
]

const items = computed<Item[]>(() => {
  const raw = query.value.trim()
  const q = raw.toLowerCase()
  const list: Item[] = []

  if (q) {
    const target = resolved.value?.engine ?? engine.value
    const term = resolved.value?.rest ?? raw
    list.push({
      id: 'web',
      kind: 'web',
      label: `Search ${target.name} for “${term}”`,
      hint: resolved.value ? `!bang · ${target.name}` : target.hint,
      term,
      engine: target
    })
  }

  const matches = shortcuts.filter((item) =>
    !q ? pins.value.includes(item.url) : `${item.name} ${item.category} ${hostOf(item.url)}`.toLowerCase().includes(q)
  )
  matches.slice(0, q ? 6 : 4).forEach((item) =>
    list.push({
      id: `shortcut:${item.url}`,
      kind: 'shortcut',
      label: item.name,
      hint: item.category,
      url: item.url,
      icon: item.icon,
      initial: initials(item.name),
      category: item.category
    })
  )

  if (!q) {
    history.value.slice(0, 3).forEach((term) =>
      list.push({
        id: `history:${term}`,
        kind: 'history',
        label: term,
        hint: 'recent search',
        term
      })
    )
  }

  pages
    .filter((page) => !q || `${page.label} ${page.hint}`.toLowerCase().includes(q))
    .slice(0, q ? 3 : 4)
    .forEach((page) =>
      list.push({
        id: `page:${page.path}`,
        kind: 'page',
        label: page.label,
        hint: page.hint,
        path: page.path
      })
    )

  const actions: Array<{ id: string; label: string; hint: string; run: () => void }> = [
    { id: 'theme', label: isDark.value ? 'Switch to light theme' : 'Switch to dark theme', hint: 'appearance', run: cycleTheme },
    { id: 'density', label: desktop.value ? 'Comfortable grid' : 'Compact grid', hint: 'layout', run: toggleDensity },
    { id: 'engine', label: 'Change search engine', hint: engine.value.name, run: () => { palette.value = false; engineMenu.value = true } }
  ]

  actions
    .filter((action) => !q || action.label.toLowerCase().includes(q))
    .forEach((action) =>
      list.push({ id: `action:${action.id}`, kind: 'action', label: action.label, hint: action.hint, action: action.run })
    )

  return list
})

watch(items, () => {
  active.value = 0
})

function run(item: Item) {
  if (item.kind === 'web') openWeb(item.term ?? query.value, item.engine)
  else if (item.kind === 'shortcut' && item.url) openShortcut(item.url)
  else if (item.kind === 'history' && item.term) openWeb(item.term)
  else if (item.kind === 'page' && item.path) window.location.assign(item.path)
  else if (item.kind === 'action') item.action?.()
}

function submit() {
  if (!query.value.trim()) {
    focusSearch()
    return
  }
  if (palette.value && items.value[active.value]) run(items.value[active.value])
  else openWeb(query.value)
}

/* ---------------------------------------------------------------- keyboard */

function focusSearch() {
  palette.value = true
  nextTick(() => input.value?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    focusSearch()
    return
  }
  const typing = isTyping(event.target)
  if (event.key === '/' && !typing) {
    event.preventDefault()
    focusSearch()
    return
  }
  if (event.key === 'Escape') {
    if (engineMenu.value || lookOpen.value) {
      engineMenu.value = false
      lookOpen.value = false
      return
    }
    if (palette.value) {
      palette.value = false
      input.value?.blur()
    }
  }
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    palette.value = true
    active.value = Math.min(active.value + 1, items.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    submit()
  } else if (event.key === 'Tab') {
    palette.value = false
  }
}

function onDocumentPointer(event: PointerEvent) {
  const node = event.target as Node
  if (engineMenu.value && engineWrap.value && !engineWrap.value.contains(node)) engineMenu.value = false
  if (lookOpen.value && lookWrap.value && !lookWrap.value.contains(node)) lookOpen.value = false
}

/* ------------------------------------------------------------------- clock */

let clockTimer: number | undefined
function tick() {
  try {
    clock.value = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Makassar'
    }).format(new Date())
  } catch {
    clock.value = new Date().toTimeString().slice(0, 5)
  }
}

/* -------------------------------------------------------------- lifecycle */

watch(palette, (value) => {
  if (value) active.value = 0
})

function sweepIcons() {
  const broken = new Set(failed.value)
  root.value?.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      broken.add(img.getAttribute('src') as string)
    }
  })
  if (broken.size !== failed.value.size) failed.value = broken
}

onMounted(async () => {
  bootCustomization()
  tick()
  clockTimer = window.setInterval(tick, 20000)

  try {
    const stored = window.localStorage.getItem('vitepress-theme-appearance')
    if (stored === 'dark' || stored === 'light') mode.value = stored
  } catch {
    /* private mode */
  }
  applyMode()

  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onDocumentPointer)
  nextTick(sweepIcons)
  window.setTimeout(sweepIcons, 1200)

  if (motionLevel() === 'off' || !root.value) return
  await nextTick()
  animate(root.value.querySelectorAll('[data-anim]'), {
    opacity: [0, 1],
    y: [14, 0],
    duration: 620,
    delay: stagger(55, { start: 60 }),
    ease: 'outQuint'
  })
})

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onDocumentPointer)
})
</script>

<template>
  <div ref="root" class="kerja" :class="{ 'is-compact': desktop }">
    <header class="k-header">
      <div class="k-header-inner">
        <a class="k-brand" href="/" aria-label="Back to thio.cc.cd">
          <img src="/images/flessan-avatar.png" alt="" width="26" height="26" />
          <span class="k-brand-name">thio.cc.cd</span>
          <span class="k-brand-sep" aria-hidden="true">/</span>
          <span class="k-brand-page">Workspace</span>
        </a>

        <p class="k-clock" data-anim>
          <span class="k-live" aria-hidden="true"></span>
          Banjarmasin · <span class="k-clock-time">{{ clock }}</span> WITA
        </p>

        <div class="k-actions">
          <div ref="lookWrap" class="k-pop-wrap">
            <button
              type="button"
              class="k-icon-btn k-look-btn"
              :aria-expanded="lookOpen"
              aria-haspopup="dialog"
              @click="lookOpen = !lookOpen"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                <circle cx="16" cy="7" r="2.2" />
                <circle cx="10" cy="17" r="2.2" />
              </svg>
              <span class="k-btn-label">Look</span>
            </button>

            <Transition name="k-pop">
              <div v-if="lookOpen" class="k-pop k-look" role="dialog" aria-label="Appearance">
                <div class="k-pop-group">
                  <span class="k-pop-label">Accent</span>
                  <div class="k-swatches">
                    <button
                      v-for="accent in ACCENTS"
                      :key="accent.id"
                      type="button"
                      class="k-swatch"
                      :class="{ active: settings.accent === accent.id }"
                      :style="{ '--swatch': accent.swatch }"
                      :aria-label="accent.label"
                      :aria-pressed="settings.accent === accent.id"
                      @click="applySettings({ accent: accent.id })"
                    />
                  </div>
                </div>

                <div class="k-pop-group">
                  <span class="k-pop-label">Surface</span>
                  <div class="k-options">
                    <button
                      v-for="paper in PAPERS"
                      :key="paper.id"
                      type="button"
                      class="k-option"
                      :class="{ active: settings.paper === paper.id }"
                      @click="applySettings({ paper: paper.id })"
                    >
                      {{ paper.label }}
                    </button>
                  </div>
                </div>

                <div class="k-pop-group">
                  <span class="k-pop-label">Theme</span>
                  <div class="k-options">
                    <button
                      v-for="option in themeOptions"
                      :key="option.id"
                      type="button"
                      class="k-option"
                      :class="{ active: mode === option.id }"
                      @click="pickMode(option.id)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <div class="k-pop-group">
                  <span class="k-pop-label">Grid</span>
                  <div class="k-options">
                    <button
                      v-for="density in DENSITIES"
                      :key="density.id"
                      type="button"
                      class="k-option"
                      :class="{ active: settings.density === density.id }"
                      @click="applySettings({ density: density.id })"
                    >
                      {{ density.label }}
                    </button>
                  </div>
                </div>

                <p class="k-pop-note">Saved with the rest of the site’s settings.</p>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            class="k-icon-btn"
            :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
            @click="cycleTheme"
          >
            <svg v-if="isDark" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
            </svg>
          </button>

          <a class="k-back" href="/">
            <span>Back to site</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
          </a>
        </div>
      </div>
    </header>

    <main class="k-main">
      <section class="k-hero" data-anim>
        <div class="k-hero-copy">
          <p class="k-kicker">
            <span class="k-dot" aria-hidden="true"></span>
            Personal workspace · {{ shortcuts.length }} shortcuts · {{ categories.length - 1 }} categories
          </p>
          <h1 class="k-title">
            Everything I use,
            <em>one keystroke away.</em>
          </h1>
          <p class="k-lead">
            Search the web, jump straight to a pinned tool, or browse the library
            below. Pins, recent visits and your engine are remembered on this device.
          </p>
        </div>

        <aside class="k-keys" aria-label="Keyboard shortcuts">
          <p class="k-keys-title">Keyboard</p>
          <ul>
            <li><span class="k-keys-combo"><kbd>/</kbd></span><span>focus the search bar</span></li>
            <li><span class="k-keys-combo"><kbd>⌘</kbd><kbd>K</kbd></span><span>open the command palette</span></li>
            <li><span class="k-keys-combo"><kbd>↑</kbd><kbd>↓</kbd></span><span>move through results</span></li>
            <li><span class="k-keys-combo"><kbd>↵</kbd></span><span>open the selected item</span></li>
            <li><span class="k-keys-combo"><kbd>esc</kbd></span><span>close a panel</span></li>
          </ul>
          <p class="k-keys-foot">Try <code>!gh</code>, <code>!yt</code> or <code>!w</code> before a query.</p>
        </aside>
      </section>

      <div ref="bar" class="k-search" data-anim>
        <form class="k-bar" role="search" @submit.prevent="submit">
          <div ref="engineWrap" class="k-engine-wrap">
            <button
              type="button"
              class="k-engine"
              :aria-expanded="engineMenu"
              aria-haspopup="listbox"
              :aria-label="`Search engine: ${engine.name}. Change engine`"
              @click="engineMenu = !engineMenu"
            >
              <span class="k-engine-dot" :style="{ background: engine.color }" aria-hidden="true"></span>
              <span class="k-engine-name">{{ engine.name }}</span>
              <svg class="k-chevron" :class="{ open: engineMenu }" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10l5 5 5-5" />
              </svg>
            </button>

            <Transition name="k-pop">
              <div v-if="engineMenu" class="k-pop k-engine-menu" role="listbox" aria-label="Search engines">
                <button
                  v-for="item in ENGINES"
                  :key="item.id"
                  type="button"
                  class="k-engine-option"
                  :class="{ active: item.id === engine.id }"
                  role="option"
                  :aria-selected="item.id === engine.id"
                  @click="selectEngine(item.id, $event)"
                >
                  <span class="k-engine-dot" :style="{ background: item.color }" aria-hidden="true"></span>
                  <span class="k-engine-meta">
                    <span class="k-engine-title">{{ item.name }}</span>
                    <span class="k-engine-hint">{{ item.hint }}</span>
                  </span>
                  <svg v-if="item.id === engine.id" class="k-check" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </Transition>
          </div>

          <div class="k-field">
            <svg class="k-search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4 4" />
            </svg>
            <input
              ref="input"
              v-model="query"
              class="k-input"
              type="text"
              role="combobox"
              autocomplete="off"
              spellcheck="false"
              aria-autocomplete="list"
              aria-controls="k-palette"
              :aria-expanded="palette"
              :placeholder="`Search ${engine.name}, or type a command`"
              aria-label="Search the web or the workspace"
              @focus="palette = true"
              @keydown="onInputKeydown"
            />
            <kbd v-if="!query" class="k-kbd">⌘K</kbd>
            <button
              v-else
              type="button"
              class="k-clear"
              aria-label="Clear search"
              @click="query = ''; input?.focus()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <button type="submit" class="k-submit">
            <span class="k-submit-label">Search</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M12.5 6.5L19 12l-6.5 5.5" />
            </svg>
          </button>
        </form>

        <Transition name="k-palette">
          <div v-if="palette" id="k-palette" class="k-palette" role="listbox" aria-label="Command palette">
            <p class="k-palette-head">
              <span>{{ query ? 'Results' : 'Commands' }}</span>
              <span class="k-palette-count">{{ items.length }}</span>
            </p>
            <button
              v-for="(item, index) in items"
              :key="item.id"
              type="button"
              class="k-result"
              :class="{ active: index === active }"
              role="option"
              :aria-selected="index === active"
              @mouseenter="active = index"
              @mousedown.prevent
              @click="run(item)"
            >
              <span class="k-result-icon">
                <svg v-if="item.kind === 'web'" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4 4" />
                </svg>
                <svg v-else-if="item.kind === 'page'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 4h7l4 4v12H7z" />
                  <path d="M14 4v4h4" />
                </svg>
                <svg v-else-if="item.kind === 'action'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                  <circle cx="16" cy="7" r="2.2" />
                  <circle cx="10" cy="17" r="2.2" />
                </svg>
                <svg v-else-if="item.kind === 'history'" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v4l3 2" />
                </svg>
                <img
                  v-else-if="item.icon && !failed.has(item.icon)"
                  :src="item.icon"
                  alt=""
                  width="16"
                  height="16"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="markFailed(item.icon!)"
                />
                <span v-else class="k-mono">{{ item.initial }}</span>
              </span>
              <span class="k-result-body">
                <span class="k-result-label">{{ item.label }}</span>
                <span v-if="item.hint" class="k-result-hint">{{ item.hint }}</span>
              </span>
              <span v-if="item.kind === 'web'" class="k-enter">↵</span>
              <svg v-else-if="item.kind === 'shortcut'" class="k-enter-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </button>
            <p class="k-palette-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> open</span>
              <span><kbd>esc</kbd> close</span>
            </p>
          </div>
        </Transition>

        <div v-if="history.length && !palette" class="k-history">
          <span class="k-history-label">Recent searches</span>
          <button
            v-for="term in history.slice(0, 5)"
            :key="term"
            type="button"
            class="k-chip"
            @click="openWeb(term)"
          >
            {{ term }}
          </button>
          <button type="button" class="k-chip k-chip-ghost" @click="history = []; writeList(HISTORY_KEY, [])">
            Clear
          </button>
        </div>
      </div>

      <section v-if="pinnedItems.length" class="k-section" data-anim>
        <header class="k-section-head">
          <h2>
            Pinned
            <span class="k-count">{{ pinnedItems.length }}</span>
          </h2>
        </header>
        <div class="k-grid k-grid-pinned" :class="{ compact: desktop }">
          <article v-for="item in pinnedItems" :key="item.url" class="k-card">
            <a class="k-card-link" :href="item.url" target="_blank" rel="noopener" @click="rememberRecent(item.url)">
              <span class="k-icon">
                <img
                  v-if="!failed.has(item.icon)"
                  :src="item.icon"
                  alt=""
                  width="20"
                  height="20"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="markFailed(item.icon)"
                />
                <span v-else class="k-mono">{{ initials(item.name) }}</span>
              </span>
              <span class="k-card-body">
                <span class="k-card-name">{{ item.name }}</span>
                <span class="k-card-host">{{ hostOf(item.url) }}</span>
              </span>
            </a>
            <button
              type="button"
              class="k-star"
              aria-label="Unpin shortcut"
              :aria-pressed="true"
              @click="togglePin(item.url)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3.8l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9-5.2-2.9-5.2 2.9 1.2-5.9L3.6 9.9l5.9-.7z" />
              </svg>
            </button>
          </article>
        </div>
      </section>

      <section v-else class="k-section k-empty-pinned" data-anim>
        <span class="k-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3.8l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9-5.2-2.9-5.2 2.9 1.2-5.9L3.6 9.9l5.9-.7z" />
          </svg>
        </span>
        <p><strong>Pin the tools you open every day.</strong> Star any shortcut and it will sit right here.</p>
      </section>

      <section v-if="recentItems.length" class="k-section" data-anim>
        <header class="k-section-head">
          <h2>
            Recently opened
            <span class="k-count">{{ recentItems.length }}</span>
          </h2>
          <button type="button" class="k-text-btn" @click="clearRecent()">Clear</button>
        </header>
        <div class="k-recents">
          <a
            v-for="item in recentItems"
            :key="item.url"
            class="k-recent"
            :href="item.url"
            target="_blank"
            rel="noopener"
            @click="rememberRecent(item.url)"
          >
            <span class="k-icon k-icon-sm">
              <img
                v-if="!failed.has(item.icon)"
                :src="item.icon"
                alt=""
                width="16"
                height="16"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="markFailed(item.icon)"
              />
              <span v-else class="k-mono">{{ initials(item.name) }}</span>
            </span>
            <span class="k-recent-name">{{ item.name }}</span>
          </a>
        </div>
      </section>

      <section class="k-section" data-anim>
        <header class="k-section-head">
          <h2>
            Library
            <span class="k-count">{{ shortcuts.length }}</span>
          </h2>
          <button
            type="button"
            class="k-text-btn k-density-btn"
            :aria-pressed="desktop"
            @click="toggleDensity"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="6" height="6" rx="1.2" />
              <rect x="14" y="4" width="6" height="6" rx="1.2" />
              <rect x="4" y="14" width="6" height="6" rx="1.2" />
              <rect x="14" y="14" width="6" height="6" rx="1.2" />
            </svg>
            {{ desktop ? 'Compact' : 'Comfortable' }}
          </button>
        </header>

        <div class="k-tabs" role="tablist" aria-label="Shortcut categories">
          <button
            v-for="category in categories"
            :key="category.name"
            type="button"
            role="tab"
            class="k-tab"
            :class="{ active: activeCategory === category.name }"
            :aria-selected="activeCategory === category.name"
            @click="activeCategory = category.name"
          >
            {{ category.name }}
            <span class="k-tab-count">{{ category.count }}</span>
          </button>
        </div>

        <div class="k-groups">
          <div v-for="group in groups" :key="group.name" class="k-group">
            <p v-if="activeCategory === 'All'" class="k-group-title">
              {{ group.name }}
              <span>{{ group.count }}</span>
            </p>
            <div class="k-grid" :class="{ compact: desktop }">
              <article v-for="item in group.items" :key="item.url" class="k-card">
                <a
                  class="k-card-link"
                  :href="item.url"
                  target="_blank"
                  rel="noopener"
                  @click="rememberRecent(item.url)"
                >
                  <span class="k-icon">
                    <img
                      v-if="!failed.has(item.icon)"
                      :src="item.icon"
                      alt=""
                      width="20"
                      height="20"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                      @error="markFailed(item.icon)"
                    />
                    <span v-else class="k-mono">{{ initials(item.name) }}</span>
                  </span>
                  <span class="k-card-body">
                    <span class="k-card-name">{{ item.name }}</span>
                    <span class="k-card-host">{{ hostOf(item.url) }}</span>
                  </span>
                </a>
                <button
                  type="button"
                  class="k-star"
                  :class="{ pinned: pins.includes(item.url) }"
                  :aria-label="pins.includes(item.url) ? 'Unpin shortcut' : 'Pin shortcut'"
                  :aria-pressed="pins.includes(item.url)"
                  @click="togglePin(item.url)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3.8l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9-5.2-2.9-5.2 2.9 1.2-5.9L3.6 9.9l5.9-.7z" />
                  </svg>
                </button>
              </article>
            </div>
          </div>
        </div>
      </section>

      <footer class="k-foot">
        <p>
          {{ shortcuts.length }} shortcuts ·
          <a href="https://github.com/flessan/thio.cc.cd/blob/main/data/kerja.md" target="_blank" rel="noopener">
            sourced from data/kerja.md
          </a>
        </p>
        <p class="k-foot-keys">
          <kbd>/</kbd> to search · <kbd>⌘K</kbd> for the palette · <kbd>esc</kbd> to close
        </p>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.kerja {
  min-height: 100vh;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

/* --------------------------------------------------------------- header */
.k-header {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.k-header-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2.5rem);
  min-height: 62px;
}

.k-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  font-weight: 650;
  letter-spacing: -0.025em;
  text-decoration: none;
}

.k-brand img {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--vp-c-divider);
}

.k-brand-sep {
  color: var(--vp-c-text-3);
  font-weight: 400;
}

.k-brand-page {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.k-clock {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0 auto;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.k-live {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--fl-accent);
  animation: k-pulse 3.4s ease-in-out infinite;
}

@keyframes k-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.k-clock-time {
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}

.k-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
}

.k-clock + .k-actions {
  margin-left: 0;
}

.k-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 32px;
  padding: 0 0.55rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

.k-icon-btn:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-alt);
}

.k-icon-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.k-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 32px;
  padding: 0 0.6rem;
  border-radius: 8px;
  color: var(--vp-c-text-2);
  font-size: 0.76rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 150ms ease, background-color 150ms ease;
}

.k-back:hover {
  color: var(--fl-accent-ink);
  background: var(--vp-c-bg-alt);
}

.k-back svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.k-pop-wrap {
  position: relative;
}

/* ------------------------------------------------------------------ pop */
.k-pop {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--flessan-shadow-lg);
}

.k-look {
  width: 262px;
  padding: 0.85rem;
}

.k-pop-group + .k-pop-group {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--vp-c-divider);
}

.k-pop-label {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.k-swatches {
  display: flex;
  gap: 0.45rem;
}

.k-swatch {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--swatch);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08) inset;
  cursor: pointer;
  transition: transform 170ms var(--flessan-ease-out), box-shadow 170ms ease;
}

.k-swatch:hover {
  transform: scale(1.08);
}

.k-swatch.active {
  box-shadow: 0 0 0 2px var(--vp-c-bg-elv), 0 0 0 3.5px var(--swatch);
}

.k-options {
  display: flex;
  gap: 0.3rem;
}

.k-option {
  flex: 1;
  padding: 0.3rem 0.35rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 140ms ease;
}

.k-option:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
}

.k-option.active {
  border-color: var(--fl-accent);
  background: var(--fl-accent-soft);
  color: var(--fl-accent-ink);
  font-weight: 600;
}

.k-pop-note {
  margin: 0.8rem 0 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  line-height: 1.5;
}

/* ----------------------------------------------------------------- main */
.k-main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2.5rem) 4rem;
}

.k-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 272px;
  gap: clamp(1.5rem, 5vw, 4rem);
  align-items: start;
  padding: clamp(2.4rem, 6vw, 4rem) 0 1.8rem;
}

.k-hero-copy {
  min-width: 0;
}

.k-keys {
  margin: 0.35rem 0 0;
  padding: 0.9rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-elv);
}

.k-keys-title {
  margin: 0 0 0.5rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.k-keys ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.k-keys li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.3rem 0;
  color: var(--vp-c-text-2);
  font-size: 0.72rem;
}

.k-keys li + li {
  border-top: 1px dashed var(--vp-c-divider);
}

.k-keys-combo {
  display: inline-flex;
  gap: 2px;
}

.k-keys kbd {
  display: inline-grid;
  place-items: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.24rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  line-height: 1;
}

.k-keys-foot {
  margin: 0.6rem 0 0;
  padding-top: 0.55rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-size: 0.64rem;
  line-height: 1.55;
}

.k-keys-foot code {
  padding: 0.02rem 0.22rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-alt);
  font-family: var(--vp-font-family-mono);
  font-size: 0.95em;
}

.k-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.1rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.k-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--fl-accent);
  box-shadow: 0 0 0 3px var(--fl-accent-soft);
}

.k-title {
  max-width: 18ch;
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(2.1rem, 4.6vw, 3.2rem);
  font-weight: 700;
  letter-spacing: -0.042em;
  line-height: 1.05;
}

.k-title em {
  display: block;
  color: var(--fl-accent-ink);
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.03em;
}

.k-lead {
  max-width: 56ch;
  margin: 1.15rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.94rem;
  line-height: 1.7;
}

/* --------------------------------------------------------------- search */
.k-search {
  position: relative;
  z-index: 30;
  margin-bottom: clamp(2rem, 4vw, 3rem);
}

.k-bar {
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--flessan-shadow-md);
  transition: border-color 180ms ease, box-shadow 220ms var(--flessan-ease-out);
}

.k-bar:focus-within {
  border-color: var(--fl-accent);
  box-shadow: 0 0 0 3px var(--fl-accent-soft), var(--flessan-shadow-md);
}

.k-engine-wrap {
  position: relative;
  flex: none;
}

.k-engine {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.6rem;
  padding: 0 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: calc(var(--fl-r-md) - 5px);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease;
}

.k-engine:hover {
  border-color: var(--vp-c-text-3);
}

.k-engine-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset;
}

.k-chevron {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 170ms var(--flessan-ease-out);
}

.k-chevron.open {
  transform: rotate(180deg);
}

.k-engine-menu {
  left: 0;
  right: auto;
  width: min(21rem, calc(100vw - 2rem));
  padding: 5px;
}

.k-engine-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.42rem 0.5rem;
  border: 0;
  border-radius: calc(var(--fl-r-md) - 5px);
  background: transparent;
  color: var(--vp-c-text-1);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.k-engine-option:hover,
.k-engine-option.active {
  background: var(--vp-c-bg-alt);
}

.k-engine-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.05rem;
}

.k-engine-title {
  font-size: 0.82rem;
  font-weight: 550;
}

.k-engine-hint {
  overflow: hidden;
  color: var(--vp-c-text-3);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-check {
  width: 15px;
  height: 15px;
  margin-left: auto;
  fill: none;
  stroke: var(--fl-accent-ink);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.k-field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  padding: 0 0.7rem;
}

.k-search-icon {
  flex: none;
  width: 17px;
  height: 17px;
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 1.7;
  stroke-linecap: round;
}

.k-input {
  width: 100%;
  min-width: 0;
  height: 2.6rem;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-1);
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;
}

.k-input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 1;
}

.k-kbd {
  flex: none;
  padding: 0.1rem 0.3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.64rem;
  line-height: 1.4;
}

.k-clear {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  cursor: pointer;
}

.k-clear:hover {
  color: var(--vp-c-text-1);
}

.k-clear svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.k-submit {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.35rem;
  height: 2.6rem;
  padding: 0 1rem;
  border: 0;
  border-radius: calc(var(--fl-r-md) - 5px);
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  font-family: inherit;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 160ms ease, transform 160ms var(--flessan-ease-out);
}

.k-submit:hover {
  background: var(--fl-accent-hover);
}

.k-submit:active {
  transform: scale(0.98);
}

.k-submit svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* -------------------------------------------------------------- palette */
.k-palette {
  position: absolute;
  z-index: 35;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: min(420px, 60vh);
  overflow-y: auto;
  padding: 5px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--flessan-shadow-lg);
}

.k-palette-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0.4rem 0.55rem 0.35rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.k-palette-count {
  letter-spacing: 0;
  text-transform: none;
}

.k-result {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.42rem 0.5rem;
  border: 0;
  border-radius: calc(var(--fl-r-md) - 5px);
  background: transparent;
  color: var(--vp-c-text-1);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.k-result.active {
  background: var(--vp-c-bg-alt);
}

.k-result.active .k-result-label {
  color: var(--fl-accent-ink);
}

.k-result-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.k-result-icon svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.k-result-icon img {
  width: 15px;
  height: 15px;
}

.k-result-body {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
  flex: 1;
}

.k-result-label {
  overflow: hidden;
  font-size: 0.83rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-result-hint {
  color: var(--vp-c-text-3);
  font-size: 0.68rem;
}

.k-enter {
  flex: none;
  padding: 0.05rem 0.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.63rem;
}

.k-enter-icon {
  flex: none;
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 1.8;
  stroke-linecap: round;
}

.k-palette-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
  padding: 0.45rem 0.55rem 0.3rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
}

.k-palette-foot kbd,
.k-foot kbd {
  padding: 0.02rem 0.22rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-alt);
  font-family: inherit;
  font-size: 0.9em;
}

.k-history {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.6rem;
}

.k-history-label {
  margin-right: 0.2rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.k-chip {
  max-width: 18rem;
  overflow: hidden;
  padding: 0.22rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font-family: inherit;
  font-size: 0.71rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 140ms ease, color 140ms ease;
}

.k-chip:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
}

.k-chip-ghost {
  color: var(--vp-c-text-3);
  border-style: dashed;
}

/* -------------------------------------------------------------- sections */
.k-section {
  padding-top: 1.9rem;
  border-top: 1px solid var(--vp-c-divider);
}

.k-section + .k-section {
  margin-top: 1.9rem;
}

.k-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.k-section-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: -0.015em;
}

.k-count {
  padding: 0.05rem 0.35rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 500;
}

.k-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease;
}

.k-text-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-alt);
}

.k-density-btn[aria-pressed='true'] {
  color: var(--fl-accent-ink);
}

.k-density-btn svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
}

/* ------------------------------------------------------------- empty pin */
.k-empty-pinned {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  max-width: 44rem;
  padding: 1.1rem 1.15rem;
  margin-top: 1.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-alt);
}

.k-empty-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border: 1px solid var(--fl-accent-line);
  border-radius: 8px;
  background: var(--fl-accent-soft);
  color: var(--fl-accent-ink);
}

.k-empty-icon svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.k-empty-pinned p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  line-height: 1.6;
}

.k-empty-pinned strong {
  display: block;
  color: var(--vp-c-text-1);
  font-weight: 600;
}

/* ----------------------------------------------------------------- cards */
.k-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(224px, 1fr));
  gap: 0.55rem;
}

.k-grid-pinned {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.k-card {
  position: relative;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--fl-r-sm);
  background: var(--vp-c-bg-elv);
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 180ms var(--flessan-ease-out),
    box-shadow 200ms var(--flessan-ease-out);
}

.k-card:hover {
  border-color: var(--vp-c-text-3);
  transform: translateY(-1px);
  box-shadow: var(--flessan-shadow-sm);
}

.k-card:has(.k-card-link:focus-visible) {
  border-color: var(--fl-accent);
  box-shadow: 0 0 0 2px var(--fl-accent-soft);
}

.k-card-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.62rem 2rem 0.62rem 0.62rem;
  color: inherit;
  text-decoration: none;
  border-radius: var(--fl-r-sm);
}

.k-card-link:focus-visible {
  outline: none;
}

.k-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.k-icon img {
  width: 17px;
  height: 17px;
  object-fit: contain;
}

.k-icon-sm {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

.k-icon-sm img {
  width: 13px;
  height: 13px;
}

.k-mono {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.k-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  min-width: 0;
}

.k-card-name {
  overflow: hidden;
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
  font-weight: 550;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-card-host {
  overflow: hidden;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.63rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-star {
  position: absolute;
  top: 50%;
  right: 0.4rem;
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity 140ms ease, color 140ms ease, background-color 140ms ease;
}

.k-card:hover .k-star,
.k-star:focus-visible,
.k-star.pinned {
  opacity: 1;
}

.k-star:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.k-star.pinned {
  color: var(--fl-accent);
}

.k-star svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.k-star.pinned svg {
  fill: color-mix(in srgb, var(--fl-accent) 22%, transparent);
}

.compact .k-card-link {
  padding-block: 0.4rem;
}

.compact .k-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
}

.compact .k-icon img {
  width: 14px;
  height: 14px;
}

.compact .k-card-name {
  font-size: 0.78rem;
}

.compact .k-card-host {
  display: none;
}

/* -------------------------------------------------------------- recents */
.k-recents {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.k-recent {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.6rem 0.3rem 0.32rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font-size: 0.74rem;
  text-decoration: none;
  transition: border-color 150ms ease, color 150ms ease;
}

.k-recent:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
}

.k-recent-name {
  font-weight: 500;
}

/* ----------------------------------------------------------------- tabs */
.k-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin: 0.2rem 0 1.15rem;
}

.k-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-family: inherit;
  font-size: 0.74rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 140ms ease;
}

.k-tab:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
}

.k-tab.active {
  border-color: var(--vp-c-text-1);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.k-tab-count {
  color: inherit;
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  opacity: 0.65;
}

.k-group + .k-group {
  margin-top: 1.35rem;
}

.k-group-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.5rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.k-group-title span {
  font-weight: 400;
  opacity: 0.7;
}

/* ----------------------------------------------------------------- foot */
.k-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 2.5rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
}

.k-foot p {
  margin: 0;
}

.k-foot a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-bottom: 1px solid var(--vp-c-divider);
}

.k-foot a:hover {
  color: var(--fl-accent-ink);
}

/* ---------------------------------------------------------- transitions */
.k-pop-enter-active,
.k-pop-leave-active {
  transition: opacity 130ms ease, transform 150ms var(--flessan-ease-out);
}

.k-pop-enter-from,
.k-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}

.k-palette-enter-active,
.k-palette-leave-active {
  transition: opacity 130ms ease, transform 160ms var(--flessan-ease-out);
}

.k-palette-enter-from,
.k-palette-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ------------------------------------------------------------ responsive */
@media (max-width: 980px) {
  .k-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }

  .k-keys {
    display: none;
  }
}

@media (max-width: 860px) {
  .k-clock {
    display: none;
  }

  .k-brand-page,
  .k-brand-sep {
    display: none;
  }

  .k-btn-label {
    display: none;
  }

  .k-icon-btn {
    width: 32px;
    padding: 0;
  }
}

@media (max-width: 640px) {
  .k-header-inner {
    min-height: 56px;
    gap: 0.5rem;
  }

  .k-back span {
    display: none;
  }

  .k-back {
    width: 32px;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--vp-c-border);
    background: var(--vp-c-bg-elv);
  }

  .k-back svg {
    width: 14px;
    height: 14px;
  }

  .k-engine-name {
    display: none;
  }

  .k-engine {
    padding: 0 0.5rem;
  }

  .k-submit {
    padding: 0 0.7rem;
  }

  .k-submit-label {
    display: none;
  }

  .k-kbd {
    display: none;
  }

  .k-lead {
    font-size: 0.88rem;
  }

  .k-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .k-card-link {
    gap: 0.5rem;
    padding-right: 1.9rem;
  }

  .k-star {
    opacity: 1;
  }

  .k-card-name {
    font-size: 0.78rem;
  }

  .k-card-host {
    font-size: 0.58rem;
  }

  .k-icon {
    width: 28px;
    height: 28px;
  }

  .k-palette {
    max-height: 52vh;
  }

  .k-palette-foot {
    display: none;
  }

  .k-section-head {
    margin-bottom: 0.6rem;
  }

  .k-foot {
    font-size: 0.6rem;
  }
}

@media (max-width: 420px) {
  .k-brand-name {
    font-size: 0.82rem;
  }

  .k-title {
    font-size: 1.9rem;
  }

  .k-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .k-live {
    animation: none;
  }
}
</style>
