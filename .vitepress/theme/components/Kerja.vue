<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import shortcutData from 'virtual:kerja-shortcuts'

type Shortcut = {
  name: string
  url: string
  icon: string
  category: string
}

type ColorMode = 'system' | 'light' | 'dark'
type Palette = {
  id: string
  name: string
  swatch: string
  light: Record<string, string>
  dark: Record<string, string>
}

const shortcuts = shortcutData as Shortcut[]
const colorModes: ColorMode[] = ['system', 'light', 'dark']
const query = ref('')
const activeCategory = ref('Semua')
const searchInput = ref<HTMLInputElement | null>(null)
const failedIcons = ref(new Set<string>())
const themeSettingsOpen = ref(false)
const colorMode = ref<ColorMode>('system')
const paletteId = ref('forest')
const customAccent = ref('#2f704d')
const systemPrefersDark = ref(false)
const settingsReady = ref(false)

const palettes: Palette[] = [
  {
    id: 'forest', name: 'Evergreen', swatch: '#39734f',
    light: { bg: '#f4f6f2', surface: '#ffffff', text: '#202820', muted: '#727d72', border: '#e1e7df', accent: '#2f704d', hover: '#3f8056', soft: '#e4f0e6', contrast: '#ffffff' },
    dark: { bg: '#171b18', surface: '#202621', text: '#edf2ed', muted: '#a0ada1', border: '#303a32', accent: '#8bc99e', hover: '#a3d9b1', soft: '#283e2e', contrast: '#142118' }
  },
  {
    id: 'ocean', name: 'Ocean', swatch: '#276b8a',
    light: { bg: '#f2f6f8', surface: '#ffffff', text: '#1e2930', muted: '#6f7d84', border: '#dfe8ec', accent: '#276b8a', hover: '#1f5a75', soft: '#e0eef5', contrast: '#ffffff' },
    dark: { bg: '#151c20', surface: '#1e292f', text: '#edf4f6', muted: '#a0b0b7', border: '#303e45', accent: '#83c5df', hover: '#a1d5e8', soft: '#243b45', contrast: '#102229' }
  },
  {
    id: 'rose', name: 'Rose', swatch: '#9d4750',
    light: { bg: '#faf4f3', surface: '#ffffff', text: '#2b2222', muted: '#827272', border: '#eee1df', accent: '#9d4750', hover: '#843842', soft: '#f7e4e5', contrast: '#ffffff' },
    dark: { bg: '#201719', surface: '#2b2022', text: '#f6eeee', muted: '#b9a5a7', border: '#433034', accent: '#e8a0a8', hover: '#f0b5bb', soft: '#44282e', contrast: '#2b1519' }
  },
  {
    id: 'amber', name: 'Amber', swatch: '#926516',
    light: { bg: '#f8f5ee', surface: '#ffffff', text: '#2d281e', muted: '#817966', border: '#eae3d5', accent: '#926516', hover: '#7c5410', soft: '#f5ebd1', contrast: '#ffffff' },
    dark: { bg: '#1f1b13', surface: '#2a251b', text: '#f4efe2', muted: '#b3a98f', border: '#403827', accent: '#e6bf72', hover: '#f0ce8e', soft: '#40331d', contrast: '#2c2110' }
  },
  {
    id: 'slate', name: 'Slate', swatch: '#535f75',
    light: { bg: '#f3f4f6', surface: '#ffffff', text: '#22262d', muted: '#737b89', border: '#e0e3e9', accent: '#535f75', hover: '#414b5f', soft: '#e7eaf0', contrast: '#ffffff' },
    dark: { bg: '#191c22', surface: '#232730', text: '#eef0f5', muted: '#a5adbb', border: '#353a47', accent: '#aab8d5', hover: '#c2cce2', soft: '#2d3545', contrast: '#1a2030' }
  }
]

const categories = computed(() => [
  'Semua',
  ...new Set(shortcuts.map((shortcut) => shortcut.category))
])

const filteredShortcuts = computed(() => {
  const term = query.value.trim().toLowerCase()

  return shortcuts.filter((shortcut) => {
    const matchesCategory =
      activeCategory.value === 'Semua' ||
      shortcut.category === activeCategory.value
    const searchable = (shortcut.name + ' ' + shortcut.category + ' ' + shortcut.url).toLowerCase()
    return matchesCategory && (!term || searchable.includes(term))
  })
})

const groupedShortcuts = computed(() => {
  const groups = new Map<string, Shortcut[]>()

  for (const shortcut of filteredShortcuts.value) {
    const group = groups.get(shortcut.category) ?? []
    group.push(shortcut)
    groups.set(shortcut.category, group)
  }

  return [...groups.entries()].map(([category, items]) => ({ category, items }))
})

const resolvedMode = computed(() => {
  if (colorMode.value === 'system') return systemPrefersDark.value ? 'dark' : 'light'
  return colorMode.value
})

const selectedPalette = computed(() => {
  const palette = palettes.find((item) => item.id === paletteId.value) ?? palettes[0]
  if (paletteId.value !== 'custom') return palette

  const lightAccent = customAccent.value
  const darkAccent = mixHex(customAccent.value, '#ffffff', 0.3)
  return {
    ...palette,
    swatch: customAccent.value,
    light: { ...palette.light, accent: lightAccent, hover: mixHex(lightAccent, '#000000', 0.12), soft: mixHex(lightAccent, '#ffffff', 0.88), contrast: contrastColor(lightAccent) },
    dark: { ...palette.dark, accent: darkAccent, hover: mixHex(darkAccent, '#ffffff', 0.13), soft: mixHex(darkAccent, palette.dark.bg, 0.82), contrast: contrastColor(darkAccent) }
  }
})

const themeVariables = computed(() => {
  const tones = resolvedMode.value === 'dark' ? selectedPalette.value.dark : selectedPalette.value.light
  return {
    '--workspace-bg': tones.bg,
    '--workspace-surface': tones.surface,
    '--workspace-text': tones.text,
    '--workspace-muted': tones.muted,
    '--workspace-border': tones.border,
    '--workspace-accent': tones.accent,
    '--workspace-accent-hover': tones.hover,
    '--workspace-accent-soft': tones.soft,
    '--workspace-accent-contrast': tones.contrast
  }
})

function mixHex(color: string, other: string, amount: number) {
  const parse = (hex: string) => {
    const normalized = hex.replace('#', '')
    return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16))
  }
  const a = parse(color)
  const b = parse(other)
  return '#' + a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount).toString(16).padStart(2, '0')).join('')
}

function contrastColor(hex: string) {
  const normalized = hex.replace('#', '')
  const channels = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255)
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4))
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  return luminance > 0.43 ? '#172019' : '#ffffff'
}

function saveSettings() {
  if (!settingsReady.value) return
  try {
    localStorage.setItem('kerja-settings-v1', JSON.stringify({
      colorMode: colorMode.value,
      paletteId: paletteId.value,
      customAccent: customAccent.value
    }))
  } catch {
    // Private browsing or storage restrictions should not disable theming.
  }
}

function chooseMode(mode: ColorMode) {
  colorMode.value = mode
}

function choosePalette(id: string) {
  paletteId.value = id
}

function setCustomAccent(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || !/^#[0-9a-fA-F]{6}$/.test(target.value)) return
  customAccent.value = target.value
  paletteId.value = 'custom'
}

function searchGoogle() {
  const term = query.value.trim()
  if (!term) {
    searchInput.value?.focus()
    return
  }

  window.location.href =
    'https://www.google.com/search?client=firefox-b-d&q=' + encodeURIComponent(term)
}

function focusSearch() {
  searchInput.value?.focus()
  searchInput.value?.select()
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof Element && !target.closest('.theme-menu')) {
    themeSettingsOpen.value = false
  }
}

function handleShortcutKeys(event: KeyboardEvent) {
  const target = event.target
  const isTyping =
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

  if (event.key === 'Escape') {
    themeSettingsOpen.value = false
    if (document.activeElement === searchInput.value) {
      query.value = ''
      searchInput.value?.blur()
    }
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    focusSearch()
  } else if (event.key === '/' && !isTyping) {
    event.preventDefault()
    focusSearch()
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function hostname(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

let systemThemeQuery: MediaQueryList | undefined
function updateSystemTheme(event?: MediaQueryListEvent) {
  systemPrefersDark.value = event?.matches ?? systemThemeQuery?.matches ?? false
}

onMounted(() => {
  systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  updateSystemTheme()
  systemThemeQuery.addEventListener('change', updateSystemTheme)
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleShortcutKeys)

  try {
    const stored = localStorage.getItem('kerja-settings-v1')
    if (stored) {
      const parsed = JSON.parse(stored) as {
        colorMode?: ColorMode
        paletteId?: string
        customAccent?: string
      }
      if (['system', 'light', 'dark'].includes(parsed.colorMode ?? '')) {
        colorMode.value = parsed.colorMode!
      }
      if ([...palettes.map((palette) => palette.id), 'custom'].includes(parsed.paletteId ?? '')) {
        paletteId.value = parsed.paletteId!
      }
      if (typeof parsed.customAccent === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.customAccent)) {
        customAccent.value = parsed.customAccent
      }
    }
  } catch {
    // Invalid or unavailable saved settings fall back to defaults.
  }

  settingsReady.value = true
})

watch([colorMode, paletteId, customAccent], saveSettings)

onBeforeUnmount(() => {
  systemThemeQuery?.removeEventListener('change', updateSystemTheme)
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleShortcutKeys)
})
</script>

<template>
  <div class="kerja-shell" :data-mode="resolvedMode" :style="themeVariables">
    <header class="workspace-header">
      <a class="brand" href="/" aria-label="Back to thio.cc.cd">
        <span class="brand-mark">f.</span>
        <span>flessan</span>
      </a>
      <span class="workspace-label">PERSONAL WORKSPACE</span>

      <div class="header-actions">
        <div class="theme-menu">
          <button
            class="theme-button"
            type="button"
            :aria-expanded="themeSettingsOpen"
            aria-controls="kerja-theme-panel"
            @click.stop="themeSettingsOpen = !themeSettingsOpen"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 9 9c0-.55-.45-1-1-1h-2.2a1.8 1.8 0 0 1-1.45-2.87A2.1 2.1 0 0 0 14.65 5H12" />
              <circle cx="7.5" cy="10" r="1" />
              <circle cx="10" cy="6.5" r="1" />
              <circle cx="7.5" cy="14" r="1" />
            </svg>
            <span>Theme</span>
            <span class="theme-dot" :style="{ backgroundColor: selectedPalette.swatch }"></span>
          </button>

          <section
            v-if="themeSettingsOpen"
            id="kerja-theme-panel"
            class="theme-panel"
            aria-label="Theme settings"
            @click.stop
          >
            <div class="theme-panel-heading">
              <div>
                <p class="eyebrow">PERSONALIZE</p>
                <h2>Make it yours</h2>
              </div>
              <button class="panel-close" type="button" aria-label="Close theme settings" @click="themeSettingsOpen = false">×</button>
            </div>

            <div class="theme-setting">
              <div class="setting-label">
                <strong>Appearance</strong>
                <span>Choose how the workspace looks</span>
              </div>
              <div class="mode-options" role="group" aria-label="Color mode">
                <button
                  v-for="mode in colorModes"
                  :key="mode"
                  type="button"
                  :class="{ selected: colorMode === mode }"
                  :aria-pressed="colorMode === mode"
                  @click="chooseMode(mode)"
                >
                  <svg v-if="mode === 'system'" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  <svg v-else-if="mode === 'light'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
                  <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/></svg>
                  {{ mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark' }}
                </button>
              </div>
            </div>

            <div class="theme-setting">
              <div class="setting-label">
                <strong>Color theme</strong>
                <span>Five ready-made palettes</span>
              </div>
              <div class="palette-grid" role="group" aria-label="Color theme">
                <button
                  v-for="palette in palettes"
                  :key="palette.id"
                  type="button"
                  class="palette-option"
                  :class="{ selected: paletteId === palette.id }"
                  :aria-label="palette.name + ' theme'"
                  :aria-pressed="paletteId === palette.id"
                  :title="palette.name"
                  @click="choosePalette(palette.id)"
                >
                  <span class="palette-swatch" :style="{ backgroundColor: palette.swatch }">
                    <svg v-if="paletteId === palette.id" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>
                  </span>
                  <span>{{ palette.name }}</span>
                </button>
              </div>
            </div>

            <div class="custom-accent-row">
              <label for="kerja-custom-accent">
                <strong>Custom accent</strong>
                <span>Pick your own color</span>
              </label>
              <div class="custom-accent-control">
                <input id="kerja-custom-accent" type="color" :value="customAccent" aria-label="Custom accent color" @input="setCustomAccent" />
                <code>{{ customAccent.toUpperCase() }}</code>
              </div>
            </div>

            <p class="theme-saved-note">Settings are saved on this device.</p>
          </section>
        </div>

        <a class="site-link" href="/">thio.cc.cd <span aria-hidden="true">↗</span></a>
      </div>
    </header>

    <main class="workspace-main">
      <section class="hero" aria-labelledby="workspace-title">
        <p class="eyebrow">YOUR EVERYDAY START PAGE</p>
        <h1 id="workspace-title">What are we working on?</h1>
        <p class="hero-description">Search the web or jump straight into something.</p>

        <form class="search-form" role="search" @submit.prevent="searchGoogle">
          <button class="search-submit" type="submit" aria-label="Search Google">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.2 4.2" />
            </svg>
          </button>
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            name="q"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-label="Search Google or filter shortcuts"
            placeholder="Search Google or filter shortcuts..."
          />
          <button class="enter-key" type="submit" aria-label="Submit search">Enter ↵</button>
        </form>

        <div class="search-notes">
          <span><kbd>/</kbd> or <kbd>Ctrl K</kbd> to focus</span>
          <span>Enter searches Google</span>
        </div>
      </section>

      <section class="shortcuts-section" aria-labelledby="shortcuts-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ALL IN ONE PLACE</p>
            <h2 id="shortcuts-title">Quick access</h2>
          </div>
          <span class="shortcut-count">{{ filteredShortcuts.length }} links</span>
        </div>

        <nav class="category-tabs" aria-label="Filter shortcut categories">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            :class="{ active: activeCategory === category }"
            :aria-pressed="activeCategory === category"
            @click="activeCategory = category"
          >
            {{ category }}
          </button>
        </nav>

        <div v-if="groupedShortcuts.length" class="shortcut-groups">
          <section
            v-for="group in groupedShortcuts"
            :key="group.category"
            class="shortcut-group"
            :aria-label="group.category"
          >
            <h3>{{ group.category }}</h3>
            <div class="shortcut-grid">
              <a
                v-for="shortcut in group.items"
                :key="shortcut.name"
                class="shortcut-card"
                :href="shortcut.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="shortcut.name + ' (opens in a new tab)'"
              >
                <span class="shortcut-icon" aria-hidden="true">
                  <img
                    v-if="!failedIcons.has(shortcut.name)"
                    :src="shortcut.icon"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    @error="failedIcons.add(shortcut.name)"
                  />
                  <span v-else class="icon-fallback">{{ initials(shortcut.name) }}</span>
                </span>
                <span class="shortcut-copy">
                  <span class="shortcut-name">{{ shortcut.name }}</span>
                  <span class="shortcut-host">{{ hostname(shortcut.url) }}</span>
                </span>
                <span class="shortcut-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </section>
        </div>

        <div v-else class="empty-state">
          <span class="empty-mark">?</span>
          <strong>No shortcuts found</strong>
          <span>Try a different keyword or select another category.</span>
          <button type="button" @click="query = ''; activeCategory = 'Semua'">Clear filters</button>
        </div>
      </section>
    </main>

    <footer class="workspace-footer">
      <span>Made for the way you work.</span>
      <a
        href="https://github.com/flessan/thio.cc.cd/edit/main/data/kerja.md"
        target="_blank"
        rel="noopener noreferrer"
      >
        Edit shortcuts on GitHub <span aria-hidden="true">↗</span>
      </a>
    </footer>
  </div>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  min-height: 100%;
  margin: 0;
}

.kerja-shell {
  --workspace-bg: #f4f6f2;
  --workspace-surface: #ffffff;
  --workspace-text: #202820;
  --workspace-muted: #727d72;
  --workspace-border: #e1e7df;
  --workspace-accent: #2f704d;
  --workspace-accent-hover: #3f8056;
  --workspace-accent-soft: #e4f0e6;
  --workspace-accent-contrast: #ffffff;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px clamp(16px, 4.2vw, 64px) 22px;
  display: flex;
  flex-direction: column;
  background: var(--workspace-bg);
  color: var(--workspace-text);
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  transition: background-color 180ms ease, color 180ms ease;
}

.kerja-shell[data-mode="dark"] {
  color-scheme: dark;
}

.workspace-header,
.workspace-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
  max-width: 1320px;
  margin-inline: auto;
}

.brand,
.site-link,
.workspace-footer a {
  color: inherit;
  text-decoration: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.035em;
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 11px;
  background: var(--workspace-accent);
  color: var(--workspace-accent-contrast);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.08em;
}

.workspace-label,
.eyebrow {
  color: var(--workspace-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.15em;
}

.site-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--workspace-muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.site-link:hover,
.workspace-footer a:hover {
  color: var(--workspace-accent);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-menu {
  position: relative;
}

.theme-button {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
  background: var(--workspace-surface);
  color: var(--workspace-text);
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.theme-button:hover,
.theme-button[aria-expanded="true"] {
  border-color: var(--workspace-accent);
}

.theme-button svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.theme-dot {
  width: 12px;
  height: 12px;
  border: 2px solid var(--workspace-surface);
  outline: 1px solid var(--workspace-border);
  border-radius: 50%;
}

.theme-panel {
  position: absolute;
  z-index: 50;
  top: calc(100% + 10px);
  right: 0;
  width: min(340px, calc(100vw - 32px));
  padding: 19px;
  border: 1px solid var(--workspace-border);
  border-radius: 18px;
  background: var(--workspace-surface);
  color: var(--workspace-text);
  box-shadow: 0 18px 50px rgb(18 28 20 / 17%);
  text-align: left;
  animation: panel-enter 140ms ease-out;
}

@keyframes panel-enter {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.theme-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 21px;
}

.theme-panel-heading .eyebrow {
  margin: 0 0 5px;
  font-size: 9px;
}

.theme-panel-heading h2 {
  margin: 0;
  font-size: 19px;
  letter-spacing: -0.04em;
}

.panel-close {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--workspace-border);
  border-radius: 9px;
  background: transparent;
  color: var(--workspace-muted);
  font: inherit;
  font-size: 22px;
  cursor: pointer;
}

.theme-setting {
  display: grid;
  gap: 11px;
  padding: 15px 0;
  border-top: 1px solid var(--workspace-border);
}

.setting-label,
.custom-accent-row label {
  display: grid;
  gap: 4px;
}

.setting-label strong,
.custom-accent-row strong {
  font-size: 12px;
  font-weight: 700;
}

.setting-label span,
.custom-accent-row label span {
  color: var(--workspace-muted);
  font-size: 11px;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.mode-options button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 9px 5px;
  border: 1px solid var(--workspace-border);
  border-radius: 10px;
  background: var(--workspace-bg);
  color: var(--workspace-muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.mode-options button.selected {
  border-color: var(--workspace-accent);
  background: var(--workspace-accent-soft);
  color: var(--workspace-accent);
  font-weight: 700;
}

.mode-options svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
}

.palette-option {
  display: grid;
  justify-items: center;
  gap: 7px;
  min-width: 0;
  padding: 5px 2px 6px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--workspace-muted);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.palette-option:hover,
.palette-option.selected {
  border-color: var(--workspace-border);
  background: var(--workspace-bg);
  color: var(--workspace-text);
}

.palette-swatch {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 9px;
  color: #ffffff;
}

.palette-swatch svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.custom-accent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 15px;
  border-top: 1px solid var(--workspace-border);
}

.custom-accent-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-accent-control input {
  width: 34px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--workspace-border);
  border-radius: 9px;
  background: var(--workspace-bg);
  cursor: pointer;
}

.custom-accent-control code {
  color: var(--workspace-muted);
  font-size: 10px;
}

.theme-saved-note {
  margin: 15px 0 0;
  color: var(--workspace-muted);
  font-size: 10px;
}

.workspace-main {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  flex: 1;
}

.hero {
  padding: clamp(55px, 8vh, 92px) 0 53px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 15px;
}

.hero h1 {
  margin: 0;
  font-size: clamp(30px, 4.5vw, 52px);
  line-height: 1.12;
  letter-spacing: -0.055em;
  font-weight: 760;
}

.hero-description {
  margin: 15px 0 28px;
  color: var(--workspace-muted);
  font-size: 14px;
}

.search-form {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(100%, 700px);
  min-height: 62px;
  margin: 0 auto;
  padding: 8px 10px 8px 18px;
  border: 1px solid var(--workspace-border);
  border-radius: 18px;
  background: var(--workspace-surface);
  box-shadow: 0 8px 24px rgb(28 52 34 / 4%);
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 180ms ease;
}

.search-form:focus-within {
  border-color: var(--workspace-accent);
  box-shadow: 0 0 0 3px var(--workspace-accent-soft);
}

.search-submit {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--workspace-muted);
  cursor: pointer;
}

.search-submit svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.search-form input {
  min-width: 0;
  flex: 1;
  padding: 11px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--workspace-text);
  font: inherit;
  font-size: 14px;
}

.search-form input::placeholder {
  color: var(--workspace-muted);
  opacity: 0.8;
}

.search-form input::-webkit-search-cancel-button {
  cursor: pointer;
}

.enter-key {
  flex: 0 0 auto;
  padding: 8px 10px;
  border: 1px solid var(--workspace-border);
  border-radius: 9px;
  background: var(--workspace-bg);
  color: var(--workspace-muted);
  font-size: 11px;
  cursor: pointer;
}

.enter-key:hover {
  color: var(--workspace-text);
}

.search-notes {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 13px;
  color: var(--workspace-muted);
  font-size: 11px;
}

kbd {
  padding: 2px 5px;
  border: 1px solid var(--workspace-border);
  border-radius: 5px;
  background: var(--workspace-surface);
  color: var(--workspace-muted);
  font: inherit;
  font-size: 10px;
}

.shortcuts-section {
  padding-bottom: 42px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.section-heading .eyebrow {
  margin-bottom: 7px;
  font-size: 9px;
}

.section-heading h2 {
  margin: 0;
  font-size: 23px;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.shortcut-count {
  padding-bottom: 3px;
  color: var(--workspace-muted);
  font-size: 12px;
  white-space: nowrap;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.category-tabs button {
  padding: 8px 13px;
  border: 1px solid var(--workspace-border);
  border-radius: 999px;
  background: transparent;
  color: var(--workspace-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}

.category-tabs button:hover {
  border-color: var(--workspace-accent);
  color: var(--workspace-text);
}

.category-tabs button.active {
  border-color: var(--workspace-accent);
  background: var(--workspace-accent);
  color: var(--workspace-accent-contrast);
}

.shortcut-groups {
  display: grid;
  gap: 27px;
}

.shortcut-group h3 {
  margin: 0 0 12px;
  color: var(--workspace-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.015em;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.shortcut-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 76px;
  box-sizing: border-box;
  padding: 13px 14px;
  border: 1px solid var(--workspace-border);
  border-radius: 15px;
  background: var(--workspace-surface);
  color: var(--workspace-text);
  text-decoration: none;
  transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease, background-color 180ms ease;
}

.shortcut-card:hover {
  transform: translateY(-2px);
  border-color: var(--workspace-accent);
  box-shadow: 0 7px 18px rgb(28 52 34 / 6%);
}

.shortcut-card:focus-visible,
.category-tabs button:focus-visible,
.theme-button:focus-visible,
.panel-close:focus-visible {
  outline: 3px solid var(--workspace-accent-soft);
  outline-offset: 2px;
}

.shortcut-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 39px;
  height: 39px;
  overflow: hidden;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
  background: var(--workspace-bg);
}

.shortcut-icon img {
  display: block;
  width: 23px;
  height: 23px;
  object-fit: contain;
}

.icon-fallback {
  color: var(--workspace-accent);
  font-size: 11px;
  font-weight: 800;
}

.shortcut-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.shortcut-name {
  overflow: hidden;
  font-size: 12px;
  font-weight: 690;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-host {
  overflow: hidden;
  color: var(--workspace-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-arrow {
  margin-left: auto;
  align-self: flex-start;
  color: var(--workspace-muted);
  font-size: 13px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.shortcut-card:hover .shortcut-arrow,
.shortcut-card:focus-visible .shortcut-arrow {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 45px 16px;
  border: 1px dashed var(--workspace-border);
  border-radius: 16px;
  color: var(--workspace-muted);
  text-align: center;
  font-size: 12px;
}

.empty-state strong {
  color: var(--workspace-text);
  font-size: 14px;
}

.empty-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  margin-bottom: 4px;
  border-radius: 12px;
  background: var(--workspace-accent-soft);
  color: var(--workspace-accent);
  font-weight: 800;
}

.empty-state button {
  margin-top: 7px;
  padding: 7px 11px;
  border: 1px solid var(--workspace-border);
  border-radius: 8px;
  background: var(--workspace-surface);
  color: var(--workspace-text);
  font: inherit;
  cursor: pointer;
}

.workspace-footer {
  padding-top: 20px;
  border-top: 1px solid var(--workspace-border);
  color: var(--workspace-muted);
  font-size: 11px;
}

.workspace-footer a {
  font-weight: 650;
}

@media (max-width: 780px) {
  .workspace-label {
    display: none;
  }

  .workspace-header {
    flex-wrap: wrap;
  }

  .header-actions {
    gap: 10px;
  }

  .hero {
    padding-top: 58px;
    padding-bottom: 45px;
  }

  .shortcut-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .kerja-shell {
    padding: 18px 14px 16px;
  }

  .workspace-header {
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    align-items: flex-end;
    flex-direction: column-reverse;
    gap: 9px;
  }

  .site-link {
    font-size: 11px;
  }

  .theme-button {
    min-height: 36px;
  }

  .theme-panel {
    right: -1px;
    padding: 16px;
  }

  .hero {
    padding-top: 52px;
  }

  .hero h1 {
    max-width: 340px;
    margin-inline: auto;
    font-size: clamp(28px, 9vw, 38px);
  }

  .hero-description {
    max-width: 290px;
    margin-inline: auto;
    margin-top: 13px;
    margin-bottom: 23px;
    font-size: 13px;
  }

  .search-form {
    min-height: 58px;
    gap: 8px;
    padding-left: 12px;
    border-radius: 15px;
  }

  .search-form input {
    font-size: 13px;
  }

  .enter-key {
    padding: 7px 8px;
    font-size: 10px;
  }

  .search-notes {
    flex-wrap: wrap;
    gap: 8px 13px;
    font-size: 10px;
  }

  .section-heading h2 {
    font-size: 21px;
  }

  .category-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 3px;
    scrollbar-width: thin;
  }

  .category-tabs button {
    flex: 0 0 auto;
  }

  .shortcut-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .shortcut-card {
    min-height: 68px;
  }

  .shortcut-arrow {
    opacity: 1;
  }

  .workspace-footer {
    align-items: flex-start;
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kerja-shell,
  .search-form,
  .category-tabs button,
  .shortcut-card,
  .shortcut-arrow,
  .theme-panel {
    transition: none;
    animation: none;
  }

  .shortcut-card:hover {
    transform: none;
  }
}
</style>
