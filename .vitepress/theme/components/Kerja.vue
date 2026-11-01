<script setup lang="ts">
/**
 * /kerja — the personal workspace.
 * Material 3 Expressive: one tonal system with the rest of the site, a pill
 * search bar, filter chips, a command palette and a spring-animated grid.
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
const root = ref<HTMLElement | null>(null)
const engineWrap = ref<HTMLElement | null>(null)
const lookWrap = ref<HTMLElement | null>(null)
const resultsRoot = ref<HTMLElement | null>(null)
const fab = ref<HTMLButtonElement | null>(null)
const failed = ref(new Set<string>())
const mode = ref<Mode>('system')
const isDark = ref(false)
const clock = ref('--:--')

const pins = ref<string[]>([])
const recent = ref<string[]>([])
const history = ref<string[]>([])

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
const narrow = ref(false)

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

function sweepIcons() {
  const broken = new Set(failed.value)
  root.value?.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      broken.add(img.getAttribute('src') as string)
    }
  })
  if (broken.size !== failed.value.size) failed.value = broken
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

function togglePin(url: string, event?: Event) {
  pins.value = pins.value.includes(url)
    ? pins.value.filter((item) => item !== url)
    : [url, ...pins.value]
  writeList(PIN_KEY, pins.value)
  if (event) pop(event.currentTarget as HTMLElement)
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

function toggleDensity(event?: Event) {
  applySettings({ density: desktop.value ? 'cozy' : 'compact' })
  if (event) pop(event.currentTarget as HTMLElement)
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
    !q
      ? pins.value.includes(item.url)
      : `${item.name} ${item.category} ${hostOf(item.url)}`.toLowerCase().includes(q)
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
    {
      id: 'theme',
      label: isDark.value ? 'Switch to light theme' : 'Switch to dark theme',
      hint: 'appearance',
      run: cycleTheme
    },
    {
      id: 'density',
      label: desktop.value ? 'Comfortable grid' : 'Compact grid',
      hint: 'layout',
      run: () => toggleDensity()
    },
    {
      id: 'engine',
      label: 'Change search engine',
      hint: engine.value.name,
      run: () => {
        palette.value = false
        engineMenu.value = true
      }
    }
  ]

  actions
    .filter((action) => !q || action.label.toLowerCase().includes(q))
    .forEach((action) =>
      list.push({
        id: `action:${action.id}`,
        kind: 'action',
        label: action.label,
        hint: action.hint,
        action: action.run
      })
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
  if (event.key === '/' && !isTyping(event.target)) {
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

/* ------------------------------------------------------------- grid FLIP */

function captureCards() {
  const positions = new Map<string, DOMRect>()
  resultsRoot.value?.querySelectorAll<HTMLElement>('.k-card').forEach((card) => {
    if (card.dataset.key) positions.set(card.dataset.key, card.getBoundingClientRect())
  })
  return positions
}

function playFlip(previous: Map<string, DOMRect>) {
  if (motionLevel() === 'off' || !resultsRoot.value) return
  let order = 0
  resultsRoot.value.querySelectorAll<HTMLElement>('.k-card').forEach((card) => {
    const before = previous.get(card.dataset.key ?? '')
    const after = card.getBoundingClientRect()
    if (!before) {
      animate(card, {
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 460,
        delay: order++ * 22,
        ease: 'outBack(1.6)'
      })
      return
    }
    const dx = before.left - after.left
    const dy = before.top - after.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    animate(card, {
      translateX: [dx, 0],
      translateY: [dy, 0],
      duration: 560,
      ease: 'outQuint'
    })
  })
}

async function setCategory(name: string) {
  if (name === activeCategory.value) return
  const previous = captureCards()
  activeCategory.value = name
  await nextTick()
  playFlip(previous)
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

let narrowQuery: MediaQueryList | undefined
function syncNarrow() {
  narrow.value = window.matchMedia('(max-width: 640px)').matches
}

onMounted(async () => {
  bootCustomization()
  pins.value = readList(PIN_KEY)
  recent.value = readList(RECENT_KEY)
  history.value = readList(HISTORY_KEY)
  syncNarrow()
  narrowQuery = window.matchMedia('(max-width: 640px)')
  narrowQuery.addEventListener('change', syncNarrow)
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
  const intro = root.value.querySelectorAll<HTMLElement>('[data-anim]')
  animate(intro, {
    opacity: [0, 1],
    y: [18, 0],
    duration: 640,
    delay: stagger(60, { start: 60 }),
    ease: 'outQuint'
  })
  const cards = root.value.querySelectorAll<HTMLElement>('.k-card')
  animate(cards, {
    opacity: [0, 1],
    scale: [0.92, 1],
    duration: 520,
    delay: stagger(18, { start: 260 }),
    ease: 'outBack(1.4)'
  })
})

onBeforeUnmount(() => {
  narrowQuery?.removeEventListener('change', syncNarrow)
  if (clockTimer) window.clearInterval(clockTimer)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onDocumentPointer)
})
</script>

<template>
  <div ref="root" class="kerja" :class="{ 'is-compact': desktop }">
    <header class="k-appbar">
      <div class="k-appbar-inner">
        <a class="k-icon-btn k-back" href="/" aria-label="Back to thio.cc.cd">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 6L5 12l6 6" />
          </svg>
        </a>

        <div class="k-appbar-title">
          <h1>Workspace</h1>
          <p>thio.cc.cd · Banjarmasin · {{ clock }} WITA</p>
        </div>

        <div class="k-appbar-actions">
          <div ref="lookWrap" class="k-pop-wrap">
            <button
              type="button"
              class="k-icon-btn"
              :aria-expanded="lookOpen"
              aria-haspopup="dialog"
              aria-label="Appearance"
              @click="lookOpen = !lookOpen"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
                <circle cx="15" cy="7" r="2.2" />
                <circle cx="9" cy="17" r="2.2" />
              </svg>
            </button>

            <Transition name="k-pop">
              <div v-if="lookOpen" class="k-pop k-look" role="dialog" aria-label="Appearance">
                <div class="k-pop-group">
                  <span class="k-pop-label">Seed colour</span>
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
                    >
                      <svg v-if="settings.accent === accent.id" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
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
        </div>
      </div>
    </header>

    <main class="k-main">
      <section class="k-hero" data-anim>
        <div class="k-hero-copy">
          <span class="k-chip">
            <span class="k-chip-dot" aria-hidden="true"></span>
            Personal workspace · {{ shortcuts.length }} shortcuts
          </span>
          <h2 class="k-title">
            Everything I use,
            <span>one keystroke away.</span>
          </h2>
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

      <div class="k-search" data-anim>
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
              <span class="k-engine-initial" aria-hidden="true">{{ engine.name.slice(0, 1) }}</span>
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
              :placeholder="narrow ? 'Search the web' : `Search ${engine.name}, or type a command`"
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

          <button type="submit" class="k-submit" aria-label="Search">
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
                  <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
                  <circle cx="15" cy="7" r="2.2" />
                  <circle cx="9" cy="17" r="2.2" />
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
            class="k-chip-btn"
            @click="openWeb(term)"
          >
            {{ term }}
          </button>
          <button
            type="button"
            class="k-chip-btn k-chip-ghost"
            @click="history = []; writeList(HISTORY_KEY, [])"
          >
            Clear
          </button>
        </div>
      </div>

      <section v-if="pinnedItems.length" class="k-section" data-anim>
        <header class="k-section-head">
          <h3>
            Pinned
            <span class="k-count">{{ pinnedItems.length }}</span>
          </h3>
        </header>
        <div ref="resultsRoot" class="k-grid k-grid-pinned" :class="{ compact: desktop }">
          <article
            v-for="item in pinnedItems"
            :key="item.url"
            class="k-card"
            :data-key="item.url"
          >
            <div class="k-card-main">
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
              <a class="k-card-link" :href="item.url" target="_blank" rel="noopener" @click="rememberRecent(item.url)">
                <span class="k-card-name">{{ item.name }}</span>
                <span class="k-card-host">{{ hostOf(item.url) }}</span>
              </a>
            </div>
            <button
              type="button"
              class="k-star pinned"
              aria-label="Unpin shortcut"
              :aria-pressed="true"
              @click="togglePin(item.url, $event)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3.8l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9-5.2-2.9-5.2 2.9 1.2-5.9L3.6 9.9l5.9-.7z" />
              </svg>
            </button>
          </article>
        </div>
      </section>

      <section v-else class="k-empty-pinned" data-anim>
        <span class="k-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3.8l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9-5.2-2.9-5.2 2.9 1.2-5.9L3.6 9.9l5.9-.7z" />
          </svg>
        </span>
        <p><strong>Pin the tools you open every day.</strong> Star any shortcut and it will sit right here.</p>
      </section>

      <section v-if="recentItems.length" class="k-section" data-anim>
        <header class="k-section-head">
          <h3>
            Recently opened
            <span class="k-count">{{ recentItems.length }}</span>
          </h3>
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
          <h3>
            Library
            <span class="k-count">{{ shortcuts.length }}</span>
          </h3>
          <button
            type="button"
            class="k-chip-btn"
            :aria-pressed="desktop"
            @click="toggleDensity($event)"
          >
            <svg class="k-chip-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="6" height="6" rx="1.5" />
              <rect x="14" y="4" width="6" height="6" rx="1.5" />
              <rect x="4" y="14" width="6" height="6" rx="1.5" />
              <rect x="14" y="14" width="6" height="6" rx="1.5" />
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
            @click="setCategory(category.name)"
          >
            {{ category.name }}
            <span class="k-tab-count">{{ category.count }}</span>
          </button>
        </div>

        <div ref="resultsRoot" class="k-groups">
          <div v-for="group in groups" :key="group.name" class="k-group">
            <p v-if="activeCategory === 'All'" class="k-group-title">
              {{ group.name }}
              <span>{{ group.count }}</span>
            </p>
            <div class="k-grid" :class="{ compact: desktop }">
              <article
                v-for="item in group.items"
                :key="item.url"
                class="k-card"
                :data-key="item.url"
              >
                <div class="k-card-main">
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
                  <a
                    class="k-card-link"
                    :href="item.url"
                    target="_blank"
                    rel="noopener"
                    @click="rememberRecent(item.url)"
                  >
                    <span class="k-card-name">{{ item.name }}</span>
                    <span class="k-card-host">{{ hostOf(item.url) }}</span>
                  </a>
                </div>
                <button
                  type="button"
                  class="k-star"
                  :class="{ pinned: pins.includes(item.url) }"
                  :aria-label="pins.includes(item.url) ? 'Unpin shortcut' : 'Pin shortcut'"
                  :aria-pressed="pins.includes(item.url)"
                  @click="togglePin(item.url, $event)"
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

    <button
      ref="fab"
      type="button"
      class="k-fab"
      aria-label="Open the command palette"
      @click="pop(fab ?? undefined); focusSearch()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.kerja {
  min-height: 100vh;
  background: var(--md-surface);
  color: var(--md-on-surface);
}

/* ------------------------------------------------------------- app bar */
.k-appbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--md-surface) 90%, transparent);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  backdrop-filter: blur(16px) saturate(120%);
}

.k-appbar-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(0.75rem, 4vw, 2.5rem);
  min-height: 64px;
}

.k-icon-btn {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard);
}

.k-icon-btn:hover {
  background: color-mix(in srgb, var(--md-on-surface) 8%, transparent);
  color: var(--md-on-surface);
}

.k-icon-btn svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.k-appbar-title {
  min-width: 0;
}

.k-appbar-title h1 {
  margin: 0;
  color: var(--md-on-surface);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.2;
}

.k-appbar-title p {
  margin: 0.1rem 0 0;
  overflow: hidden;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  letter-spacing: 0.3px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-appbar-actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin-left: auto;
}

/* ------------------------------------------------------------------ pop */
.k-pop-wrap {
  position: relative;
}

.k-pop {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  border-radius: var(--md-shape-lg);
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-3);
}

.k-look {
  width: 280px;
  padding: 1rem;
}

.k-pop-group + .k-pop-group {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--md-outline-variant);
}

.k-pop-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.k-swatches {
  display: flex;
  gap: 0.5rem;
}

.k-swatch {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--swatch);
  color: #ffffff;
  cursor: pointer;
  transition: transform var(--md-duration-medium) var(--md-ease-spring),
    box-shadow var(--md-duration-short) var(--md-ease-standard);
}

.k-swatch:hover {
  transform: scale(1.1);
}

.k-swatch.active {
  box-shadow: 0 0 0 2px var(--md-surface-container-high), 0 0 0 4px var(--swatch);
}

.k-swatch svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.k-options {
  display: flex;
  gap: 0.35rem;
}

.k-option {
  flex: 1;
  min-height: 32px;
  padding: 0 0.4rem;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-shape-sm);
  background: transparent;
  color: var(--md-on-surface-variant);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard);
}

.k-option:hover {
  color: var(--md-on-surface);
  background: color-mix(in srgb, var(--md-on-surface) 7%, transparent);
}

.k-option.active {
  border-color: transparent;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.k-pop-note {
  margin: 0.85rem 0 0;
  color: var(--md-on-surface-variant);
  font-size: 0.68rem;
  line-height: 1.5;
}

/* ----------------------------------------------------------------- main */
.k-main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2.5rem) 5rem;
}

.k-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 288px;
  gap: clamp(1.5rem, 5vw, 4rem);
  align-items: start;
  padding: clamp(1.75rem, 4vw, 3rem) 0 1.5rem;
}

.k-hero-copy {
  min-width: 0;
}

.k-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 32px;
  padding: 0 0.9rem;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface-variant);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.k-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--md-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--md-primary) 14%, transparent);
}

.k-title {
  margin: 1.15rem 0 0;
  color: var(--md-on-surface);
  font-size: clamp(2.15rem, 4.6vw, 3.3rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.06;
}

.k-title span {
  display: block;
  color: var(--md-primary);
  font-weight: 500;
}

.k-lead {
  max-width: 54ch;
  margin: 1.1rem 0 0;
  color: var(--md-on-surface-variant);
  font-size: 1rem;
  line-height: 1.7;
}

/* ------------------------------------------------------------ key card */
.k-keys {
  margin: 0.25rem 0 0;
  padding: 1rem 1.1rem;
  border-radius: var(--md-shape-xl);
  background: var(--md-surface-container-low);
}

.k-keys-title {
  margin: 0 0 0.55rem;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.k-keys ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.k-keys li {
  display: grid;
  grid-template-columns: 4.9rem minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 0;
  color: var(--md-on-surface-variant);
  font-size: 0.76rem;
}

.k-keys-combo {
  display: inline-flex;
  gap: 3px;
}

.k-keys kbd {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.3rem;
  border-radius: var(--md-shape-xs);
  background: var(--md-surface-container-highest);
  color: var(--md-on-surface);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  line-height: 1;
}

.k-keys-foot {
  margin: 0.55rem 0 0;
  padding-top: 0.55rem;
  border-top: 1px solid var(--md-outline-variant);
  color: var(--md-on-surface-variant);
  font-size: 0.68rem;
  line-height: 1.55;
}

.k-keys-foot code {
  padding: 0.02rem 0.24rem;
  border-radius: var(--md-shape-xs);
  background: var(--md-surface-container-highest);
  font-family: var(--vp-font-family-mono);
  font-size: 0.95em;
}

/* --------------------------------------------------------------- search */
.k-search {
  position: relative;
  z-index: 30;
  margin-bottom: clamp(1.75rem, 4vw, 2.5rem);
}

.k-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 7px;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-1);
  transition: box-shadow var(--md-duration-medium) var(--md-ease-standard),
    background-color var(--md-duration-short) var(--md-ease-standard);
}

.k-bar:hover {
  box-shadow: var(--md-elevation-2);
}

.k-bar:focus-within {
  background: var(--md-surface-container-highest);
  box-shadow: var(--md-elevation-2), inset 0 0 0 2px var(--md-primary);
}

.k-engine-wrap {
  position: relative;
  flex: none;
}

.k-engine {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 48px;
  padding: 0 1rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.k-engine:hover {
  background: color-mix(in srgb, var(--md-secondary-container) 88%, var(--md-on-secondary-container));
}

.k-engine-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}

.k-engine-initial {
  display: none;
}

.k-chevron {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--md-duration-medium) var(--md-ease-spring);
}

.k-chevron.open {
  transform: rotate(180deg);
}

.k-engine-menu {
  left: 0;
  right: auto;
  width: min(22rem, calc(100vw - 2rem));
  padding: 8px;
}

.k-engine-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-on-surface);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.k-engine-option:hover,
.k-engine-option.active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.k-engine-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.05rem;
}

.k-engine-title {
  font-size: 0.85rem;
  font-weight: 500;
}

.k-engine-hint {
  overflow: hidden;
  color: var(--md-on-surface-variant);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-engine-option.active .k-engine-hint {
  color: color-mix(in srgb, var(--md-on-secondary-container) 75%, transparent);
}

.k-check {
  width: 17px;
  height: 17px;
  margin-left: auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.k-field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  padding: 0 0.4rem;
}

.k-search-icon {
  flex: none;
  width: 19px;
  height: 19px;
  fill: none;
  stroke: var(--md-on-surface-variant);
  stroke-width: 2;
  stroke-linecap: round;
}

.k-input {
  width: 100%;
  min-width: 0;
  height: 48px;
  border: 0;
  background: transparent;
  color: var(--md-on-surface);
  font-family: inherit;
  font-size: 1rem;
  letter-spacing: 0.15px;
  outline: none;
}

.k-input::placeholder {
  color: var(--md-on-surface-variant);
  opacity: 1;
}

.k-kbd {
  flex: none;
  padding: 0.2rem 0.5rem;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-highest);
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
}

.k-clear {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--md-surface-container-highest);
  color: var(--md-on-surface-variant);
  cursor: pointer;
}

.k-clear svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
}

.k-submit {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 48px;
  padding: 0 1.2rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: var(--md-primary);
  color: var(--md-on-primary);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-short) var(--md-ease-spring);
}

.k-submit:hover {
  background: color-mix(in srgb, var(--md-primary) 90%, var(--md-on-primary));
}

.k-submit:active {
  transform: scale(0.96);
}

.k-submit svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* -------------------------------------------------------------- palette */
.k-palette {
  position: absolute;
  z-index: 35;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: min(440px, 62vh);
  overflow-y: auto;
  padding: 8px;
  border-radius: var(--md-shape-xl);
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-4);
}

.k-palette-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0.4rem 0.7rem 0.35rem;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.k-palette-count {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  opacity: 0.8;
}

.k-result {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-on-surface);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.k-result.active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.k-result-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--md-surface-container-highest);
  color: var(--md-on-surface-variant);
}

.k-result.active .k-result-icon {
  background: color-mix(in srgb, var(--md-on-secondary-container) 12%, transparent);
  color: var(--md-on-secondary-container);
}

.k-result-icon svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.k-result-icon img {
  width: 17px;
  height: 17px;
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
  font-size: 0.87rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-result-hint {
  color: var(--md-on-surface-variant);
  font-size: 0.7rem;
}

.k-result.active .k-result-hint {
  color: color-mix(in srgb, var(--md-on-secondary-container) 75%, transparent);
}

.k-enter {
  flex: none;
  padding: 0.05rem 0.35rem;
  border-radius: var(--md-shape-xs);
  background: color-mix(in srgb, currentColor 10%, transparent);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
}

.k-enter-icon {
  flex: none;
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.k-palette-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin: 4px 0 0;
  padding: 0.5rem 0.7rem 0.25rem;
  border-top: 1px solid var(--md-outline-variant);
  color: var(--md-on-surface-variant);
  font-size: 0.68rem;
}

.k-palette-foot kbd,
.k-foot kbd {
  display: inline-block;
  padding: 0.05rem 0.3rem;
  border-radius: var(--md-shape-xs);
  background: var(--md-surface-container-highest);
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
}

.k-palette-enter-active,
.k-palette-leave-active {
  transition: opacity var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring);
}

.k-palette-enter-from,
.k-palette-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

/* ---------------------------------------------------------------- chips */
.k-history {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.7rem;
  padding-inline: 0.25rem;
}

.k-history-label {
  margin-right: 0.2rem;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.k-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 32px;
  max-width: 18rem;
  overflow: hidden;
  padding: 0 0.85rem;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-shape-sm);
  background: transparent;
  color: var(--md-on-surface-variant);
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard),
    border-color var(--md-duration-short) var(--md-ease-standard);
}

.k-chip-btn:hover {
  color: var(--md-on-surface);
  background: color-mix(in srgb, var(--md-on-surface) 7%, transparent);
}

.k-chip-ghost {
  border-style: dashed;
}

.k-chip-icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
}

/* ------------------------------------------------------------- sections */
.k-section {
  margin-top: 1.9rem;
}

.k-section:first-of-type {
  margin-top: 0;
}

.k-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.k-section-head h3 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--md-on-surface);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: 0;
}

.k-count {
  padding: 0.1rem 0.45rem;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  font-weight: 500;
}

.k-text-btn {
  min-height: 32px;
  padding: 0 0.8rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-primary);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
}

.k-text-btn:hover {
  background: var(--md-primary-container);
}

/* ------------------------------------------------------------- empty pin */
.k-empty-pinned {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  max-width: 46rem;
  margin-top: 1.9rem;
  padding: 1.1rem 1.2rem;
  border-radius: var(--md-shape-xl);
  background: var(--md-surface-container-low);
}

.k-empty-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.k-empty-icon svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.k-empty-pinned p {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 0.85rem;
  line-height: 1.6;
}

.k-empty-pinned strong {
  display: block;
  color: var(--md-on-surface);
  font-weight: 500;
}

/* ----------------------------------------------------------------- cards */
.k-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.5rem;
}

.k-grid-pinned {
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}

.k-card {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--md-shape-lg);
  background: var(--md-surface-container-low);
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    box-shadow var(--md-duration-short) var(--md-ease-standard);
}

.k-card:hover {
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-1);
}

.k-card:focus-within {
  background: var(--md-surface-container-high);
  box-shadow: 0 0 0 2px var(--md-primary);
}

.k-card-main {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  flex: 1;
  padding: 0.6rem 0.5rem 0.6rem 0.65rem;
}

.k-card-link {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
  flex: 1;
  color: inherit;
  text-decoration: none;
}

.k-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--md-surface-container-highest);
  color: var(--md-on-surface-variant);
}

.k-icon img {
  width: 19px;
  height: 19px;
  object-fit: contain;
}

.k-icon-sm {
  width: 28px;
  height: 28px;
}

.k-icon-sm img {
  width: 14px;
  height: 14px;
}

.k-mono {
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.k-card-name {
  overflow: hidden;
  color: var(--md-on-surface);
  font-size: 0.86rem;
  font-weight: 500;
  letter-spacing: 0.1px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-card-host {
  overflow: hidden;
  color: var(--md-on-surface-variant);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-star {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  margin-right: 0.35rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--md-duration-short) var(--md-ease-standard),
    background-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard);
}

.k-card:hover .k-star,
.k-star:focus-visible,
.k-star.pinned {
  opacity: 1;
}

.k-star:hover {
  background: color-mix(in srgb, var(--md-on-surface) 8%, transparent);
  color: var(--md-on-surface);
}

.k-star.pinned {
  color: var(--md-primary);
}

.k-star svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.k-star.pinned svg {
  fill: color-mix(in srgb, var(--md-primary) 28%, transparent);
}

.compact .k-card-main {
  padding-block: 0.4rem;
}

.compact .k-icon {
  width: 32px;
  height: 32px;
}

.compact .k-icon img {
  width: 16px;
  height: 16px;
}

.compact .k-card-name {
  font-size: 0.8rem;
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
  padding: 0.3rem 0.85rem 0.3rem 0.3rem;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-low);
  color: var(--md-on-surface-variant);
  font-size: 0.78rem;
  text-decoration: none;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.k-recent:hover {
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
}

.k-recent-name {
  font-weight: 500;
}

/* ----------------------------------------------------------------- tabs */
.k-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0 0 1.15rem;
}

.k-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 36px;
  padding: 0 0.95rem;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-shape-sm);
  background: transparent;
  color: var(--md-on-surface-variant);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard),
    border-color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-short) var(--md-ease-spring);
}

.k-tab:hover {
  color: var(--md-on-surface);
  background: color-mix(in srgb, var(--md-on-surface) 7%, transparent);
}

.k-tab:active {
  transform: scale(0.97);
}

.k-tab.active {
  border-color: transparent;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.k-tab-count {
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  opacity: 0.75;
}

.k-group + .k-group {
  margin-top: 1.4rem;
}

.k-group-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.55rem;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.k-group-title span {
  opacity: 0.7;
}

/* ----------------------------------------------------------------- foot */
.k-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 2.6rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--md-outline-variant);
  color: var(--md-on-surface-variant);
  font-size: 0.7rem;
}

.k-foot p {
  margin: 0;
}

.k-foot a {
  color: var(--md-primary);
  text-decoration: none;
}

.k-foot a:hover {
  text-decoration: underline;
}

/* ------------------------------------------------------------------ fab */
.k-fab {
  position: fixed;
  right: clamp(16px, 3vw, 28px);
  bottom: clamp(16px, 3vw, 28px);
  z-index: 45;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 0;
  border-radius: var(--md-shape-lg);
  background: var(--md-primary);
  color: var(--md-on-primary);
  box-shadow: var(--md-elevation-3);
  cursor: pointer;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    box-shadow var(--md-duration-medium) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring);
}

.k-fab:hover {
  box-shadow: var(--md-elevation-4);
  transform: translateY(-2px);
}

.k-fab:active {
  transform: scale(0.95);
}

.k-fab svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* ---------------------------------------------------------- transitions */
.k-pop-enter-active,
.k-pop-leave-active {
  transition: opacity var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring);
}

.k-pop-enter-from,
.k-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.95);
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

@media (max-width: 640px) {
  .k-appbar-inner {
    min-height: 60px;
    gap: 0.5rem;
  }

  .k-appbar-title h1 {
    font-size: 1.1rem;
  }

  .k-appbar-title p {
    font-size: 0.66rem;
  }

  .k-engine-name {
    display: none;
  }

  .k-engine {
    width: 44px;
    height: 44px;
    padding: 0;
    justify-content: center;
    gap: 0;
  }

  .k-engine-initial {
    display: inline;
    font-family: var(--vp-font-family-mono);
    font-size: 0.8rem;
    font-weight: 500;
  }

  .k-chevron {
    display: none;
  }

  .k-engine-dot {
    width: 10px;
    height: 10px;
  }

  .k-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin-inline: -1rem;
    padding: 0 1rem 0.2rem;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .k-tabs::-webkit-scrollbar {
    display: none;
  }

  .k-tab {
    flex: none;
  }

  .k-engine {
    padding: 0 0.85rem;
    height: 44px;
  }

  .k-bar {
    padding: 6px;
  }

  .k-input,
  .k-submit-row {
    height: 44px;
  }

  .k-input {
    height: 44px;
  }

  .k-submit {
    width: 44px;
    height: 44px;
    padding: 0;
  }

  .k-submit-label {
    display: none;
  }

  .k-kbd {
    display: none;
  }

  .k-lead {
    font-size: 0.92rem;
  }

  .k-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .k-card-main {
    gap: 0.5rem;
    padding: 0.5rem 0.25rem 0.5rem 0.5rem;
  }

  .k-icon {
    width: 34px;
    height: 34px;
  }

  .k-card-name {
    font-size: 0.8rem;
  }

  .k-card-host {
    font-size: 0.62rem;
  }

  .k-star {
    width: 30px;
    height: 30px;
    margin-right: 0.2rem;
    opacity: 1;
  }

  .k-palette {
    max-height: 54vh;
  }

  .k-palette-foot {
    display: none;
  }

  .k-foot {
    padding-bottom: 4rem;
    font-size: 0.64rem;
  }
}

@media (max-width: 420px) {
  .k-title {
    font-size: 2rem;
  }

  .k-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .k-chip-dot {
    animation: none;
  }
}
</style>
