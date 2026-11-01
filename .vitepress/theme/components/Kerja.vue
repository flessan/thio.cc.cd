<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import shortcutData from 'virtual:kerja-shortcuts'
import { animate, stagger } from 'animejs'

type Shortcut = { name: string; url: string; icon: string; category: string }
type ColorMode = 'system' | 'light' | 'dark'
type Palette = { id: string; name: string; swatch: string; light: Record<string, string>; dark: Record<string, string> }

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
const clock = ref('')
const dateLabel = ref('')
let clockTimer: ReturnType<typeof setInterval> | undefined
let themeMedia: MediaQueryList | undefined
let animeCleanups: Array<{ revert?: () => void }> = []

const palettes: Palette[] = [
  { id: 'forest', name: 'Evergreen', swatch: '#39734f', light: { bg: '#f4f6f2', surface: '#ffffff', text: '#202820', muted: '#727d72', border: '#e1e7df', accent: '#2f704d', hover: '#3f8056', soft: '#e4f0e6', contrast: '#ffffff' }, dark: { bg: '#171b18', surface: '#202621', text: '#edf2ed', muted: '#a0ada1', border: '#303a32', accent: '#8bc99e', hover: '#a3d9b1', soft: '#283e2e', contrast: '#142118' } },
  { id: 'ocean', name: 'Ocean', swatch: '#276b8a', light: { bg: '#f2f6f8', surface: '#ffffff', text: '#1e2930', muted: '#6f7d84', border: '#dfe8ec', accent: '#276b8a', hover: '#1f5a75', soft: '#e0eef5', contrast: '#ffffff' }, dark: { bg: '#151c20', surface: '#1e292f', text: '#edf4f6', muted: '#a0b0b7', border: '#303e45', accent: '#83c5df', hover: '#a1d5e8', soft: '#243b45', contrast: '#102229' } },
  { id: 'rose', name: 'Rose', swatch: '#9d4750', light: { bg: '#faf4f3', surface: '#ffffff', text: '#2b2222', muted: '#827272', border: '#eee1df', accent: '#9d4750', hover: '#843842', soft: '#f7e4e5', contrast: '#ffffff' }, dark: { bg: '#201719', surface: '#2b2022', text: '#f6eeee', muted: '#b9a5a7', border: '#433034', accent: '#e8a0a8', hover: '#f0b5bb', soft: '#44282e', contrast: '#2b1519' } },
  { id: 'amber', name: 'Amber', swatch: '#926516', light: { bg: '#f8f5ee', surface: '#ffffff', text: '#2d281e', muted: '#817966', border: '#eae3d5', accent: '#926516', hover: '#7c5410', soft: '#f5ebd1', contrast: '#ffffff' }, dark: { bg: '#1f1b13', surface: '#2a251b', text: '#f4efe2', muted: '#b3a98f', border: '#403827', accent: '#e6bf72', hover: '#f0ce8e', soft: '#40331d', contrast: '#2c2110' } },
  { id: 'slate', name: 'Slate', swatch: '#535f75', light: { bg: '#f3f4f6', surface: '#ffffff', text: '#22262d', muted: '#737b89', border: '#e0e3e9', accent: '#535f75', hover: '#414b5f', soft: '#e7eaf0', contrast: '#ffffff' }, dark: { bg: '#191c22', surface: '#232730', text: '#eef0f5', muted: '#a5adbb', border: '#353a47', accent: '#aab8d5', hover: '#c2cce2', soft: '#2d3545', contrast: '#1a2030' } }
]

const categories = computed(() => ['Semua', ...new Set(shortcuts.map((shortcut) => shortcut.category))])
const filteredShortcuts = computed(() => {
  const term = query.value.trim().toLowerCase()
  return shortcuts.filter((shortcut) => {
    const matchesCategory = activeCategory.value === 'Semua' || shortcut.category === activeCategory.value
    const searchable = `${shortcut.name} ${shortcut.category} ${shortcut.url}`.toLowerCase()
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
const resolvedMode = computed(() => colorMode.value === 'system' ? (systemPrefersDark.value ? 'dark' : 'light') : colorMode.value)
const selectedPalette = computed(() => {
  const palette = palettes.find((item) => item.id === paletteId.value) ?? palettes[0]
  if (paletteId.value !== 'custom') return palette
  const lightAccent = customAccent.value
  const darkAccent = mixHex(customAccent.value, '#ffffff', 0.3)
  return { ...palette, swatch: customAccent.value,
    light: { ...palette.light, accent: lightAccent, hover: mixHex(lightAccent, '#000000', 0.12), soft: mixHex(lightAccent, '#ffffff', 0.88), contrast: contrastColor(lightAccent) },
    dark: { ...palette.dark, accent: darkAccent, hover: mixHex(darkAccent, '#ffffff', 0.13), soft: mixHex(darkAccent, palette.dark.bg, 0.82), contrast: contrastColor(darkAccent) } }
})
const themeVariables = computed(() => {
  const tones = resolvedMode.value === 'dark' ? selectedPalette.value.dark : selectedPalette.value.light
  return { '--workspace-bg': tones.bg, '--workspace-surface': tones.surface, '--workspace-text': tones.text, '--workspace-muted': tones.muted, '--workspace-border': tones.border, '--workspace-accent': tones.accent, '--workspace-accent-hover': tones.hover, '--workspace-accent-soft': tones.soft, '--workspace-accent-contrast': tones.contrast }
})

function mixHex(color: string, other: string, amount: number) {
  const parse = (hex: string) => { const normalized = hex.replace('#', ''); return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16)) }
  const a = parse(color); const b = parse(other)
  return '#' + a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount).toString(16).padStart(2, '0')).join('')
}
function contrastColor(hex: string) {
  const normalized = hex.replace('#', '')
  const channels = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255)
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] > 0.179 ? '#162018' : '#ffffff'
}
function loadSettings() {
  try {
    const saved = localStorage.getItem('kerja-settings')
    if (saved) {
      const settings = JSON.parse(saved) as { colorMode?: ColorMode; paletteId?: string; customAccent?: string }
      if (settings.colorMode && colorModes.includes(settings.colorMode)) colorMode.value = settings.colorMode
      if (settings.paletteId && (palettes.some((palette) => palette.id === settings.paletteId) || settings.paletteId === 'custom')) paletteId.value = settings.paletteId
      if (settings.customAccent && /^#[\da-f]{6}$/i.test(settings.customAccent)) customAccent.value = settings.customAccent
    }
  } catch { /* Keep defaults if storage is unavailable or malformed. */ }
  themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = themeMedia.matches
  themeMedia.addEventListener('change', handleThemeChange)
  settingsReady.value = true
}
function handleThemeChange(event: MediaQueryListEvent) { systemPrefersDark.value = event.matches }
function saveSettings() {
  if (!settingsReady.value) return
  try { localStorage.setItem('kerja-settings', JSON.stringify({ colorMode: colorMode.value, paletteId: paletteId.value, customAccent: customAccent.value })) } catch { /* Storage is optional. */ }
}
watch([colorMode, paletteId, customAccent], saveSettings)
function submitSearch() {
  const term = query.value.trim()
  if (!term) { searchInput.value?.focus(); return }
  window.location.assign(`https://www.google.com/search?client=firefox-b-d&q=${encodeURIComponent(term)}`)
}
function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.value?.focus() }
  if (event.key === 'Escape') { themeSettingsOpen.value = false; query.value = '' }
}
function selectCategory(category: string) { activeCategory.value = category }
function markIconFailed(name: string) { failedIcons.value = new Set(failedIcons.value).add(name) }
function updateClock() {
  const now = new Date()
  clock.value = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  dateLabel.value = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
}
function animateEntrance() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  animeCleanups.forEach((animation) => animation.revert?.())
  animeCleanups = []
  const intro = animate('.workspace-hero [data-intro]', { opacity: [0, 1], y: [24, 0], scale: [0.98, 1], duration: 850, delay: stagger(90), ease: 'out(4)' })
  animeCleanups.push(intro)
  const cards = animate('.shortcut-card', { opacity: [0, 1], y: [14, 0], scale: [0.96, 1], delay: stagger(35), duration: 520, ease: 'out(3)' })
  animeCleanups.push(cards)
}
function handleGlobalKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.value?.focus() }
  else if (event.key === '/' && !typing) { event.preventDefault(); searchInput.value?.focus() }
  else if (event.key === 'Escape') themeSettingsOpen.value = false
}

onMounted(() => {
  loadSettings()
  updateClock()
  clockTimer = setInterval(updateClock, 30_000)
  window.addEventListener('keydown', handleGlobalKeydown)
  requestAnimationFrame(animateEntrance)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  themeMedia?.removeEventListener('change', handleThemeChange)
  if (clockTimer) clearInterval(clockTimer)
  animeCleanups.forEach((animation) => animation.revert?.())
})
watch([filteredShortcuts, activeCategory, query], () => requestAnimationFrame(animateEntrance))
</script>

<template>
  <div class="workspace" :style="themeVariables">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>
    <header class="workspace-topbar" data-intro>
      <a class="wordmark" href="/" aria-label="Flessan home"><span class="wordmark-mark">F</span><span>FLESSAN<span class="wordmark-dot">.</span></span></a>
      <div class="topbar-meta"><span class="status-dot"></span><span>PERSONAL WORKSPACE</span><span class="topbar-divider">/</span><span>{{ dateLabel }} · {{ clock }}</span></div>
      <div class="topbar-actions">
        <button class="icon-button theme-toggle" type="button" aria-label="Open appearance settings" @click="themeSettingsOpen = !themeSettingsOpen"><span aria-hidden="true">◐</span></button>
        <a class="exit-link" href="/">Exit workspace <span aria-hidden="true">↗</span></a>
      </div>
    </header>

    <main class="workspace-main">
      <section class="workspace-hero" aria-labelledby="workspace-title">
        <div class="hero-copy">
          <p class="eyebrow" data-intro><span class="eyebrow-rule"></span> YOUR PERSONAL LAUNCHPAD <span class="eyebrow-rule"></span></p>
          <h1 id="workspace-title" data-intro>Make room<br /><span>for good work.</span></h1>
          <p class="hero-subtitle" data-intro>One calm space for searching, creating, and getting where you need to go.</p>
          <div class="hero-stats" data-intro><div><strong>{{ shortcuts.length }}</strong><span>shortcuts</span></div><span class="stats-divider"></span><div><strong>{{ categories.length - 1 }}</strong><span>collections</span></div><span class="stats-divider"></span><div class="live-time"><strong>{{ clock || '--:--' }}</strong><span>{{ dateLabel || 'your local time' }}</span></div></div>
        </div>
        <div class="hero-orbit" aria-hidden="true"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="orbit orbit-c"></div><div class="orbit-core">K</div><span class="orbit-node node-one">✳</span><span class="orbit-node node-two">↗</span><span class="orbit-node node-three">⌘</span></div>
      </section>

      <section class="search-deck" aria-label="Search the web">
        <div class="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg></div>
        <form class="search-form" @submit.prevent="submitSearch"><label class="sr-only" for="workspace-search">Search Google</label><input id="workspace-search" ref="searchInput" v-model="query" type="search" placeholder="Search the web, or find a shortcut…" autocomplete="off" /><button class="search-submit" type="submit">Search <span aria-hidden="true">↗</span></button></form>
        <div class="search-hint"><kbd>⌘</kbd><kbd>K</kbd><span>to focus</span></div>
      </section>

      <section class="collections" aria-labelledby="shortcuts-title">
        <div class="collection-heading"><div><p class="eyebrow">THE SHORTCUT LIBRARY</p><h2 id="shortcuts-title">Jump back in<span class="heading-period">.</span></h2></div><p class="result-count" aria-live="polite"><strong>{{ filteredShortcuts.length }}</strong> destinations</p></div>
        <nav class="category-rail" aria-label="Shortcut categories"><button v-for="category in categories" :key="category" type="button" class="category-chip" :class="{ active: activeCategory === category }" :aria-pressed="activeCategory === category" @click="selectCategory(category)"><span class="category-indicator"></span>{{ category }}</button></nav>
        <p v-if="filteredShortcuts.length === 0" class="empty-state">No destinations match “{{ query }}”. Try another search.</p>
        <div v-for="group in groupedShortcuts" :key="group.category" class="shortcut-group"><div class="group-heading"><h3>{{ group.category }}</h3><span>{{ String(group.items.length).padStart(2, '0') }}</span></div><div class="shortcut-grid"><a v-for="(shortcut, index) in group.items" :key="shortcut.name" class="shortcut-card" :href="shortcut.url" target="_blank" rel="noopener noreferrer" :style="{ '--card-index': index }"><span class="shortcut-icon"><img v-if="shortcut.icon && !failedIcons.has(shortcut.name)" :src="shortcut.icon" :alt="''" loading="lazy" decoding="async" @error="markIconFailed(shortcut.name)" /><span v-else class="fallback-icon">{{ shortcut.name.slice(0, 1).toUpperCase() }}</span></span><span class="shortcut-copy"><strong>{{ shortcut.name }}</strong><span>{{ new URL(shortcut.url).hostname.replace(/^www\./, '') }}</span></span><span class="shortcut-arrow" aria-hidden="true">↗</span></a></div></div>
      </section>

      <footer class="workspace-footer"><a href="/">← Back to thio.cc.cd</a><span>Built for focus, not distraction.</span><button type="button" @click="themeSettingsOpen = !themeSettingsOpen">Appearance <span aria-hidden="true">✳</span></button></footer>
    </main>

    <Transition name="settings"><div v-if="themeSettingsOpen" class="settings-backdrop" @click.self="themeSettingsOpen = false"><section id="kerja-theme-panel" class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title"><header class="settings-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2 id="settings-title">Workspace settings</h2></div><button class="icon-button" type="button" aria-label="Close settings" @click="themeSettingsOpen = false">×</button></header><div class="settings-section"><span class="settings-label">Appearance</span><div class="mode-options"><button v-for="mode in colorModes" :key="mode" type="button" :aria-pressed="colorMode === mode" :class="{ selected: colorMode === mode }" @click="colorMode = mode">{{ mode }}</button></div></div><div class="settings-section"><span class="settings-label">Color atmosphere</span><div class="palette-options"><button v-for="palette in palettes" :key="palette.id" type="button" :aria-label="palette.name + ' color palette'" :title="palette.name" :class="{ selected: paletteId === palette.id }" @click="paletteId = palette.id"><span :style="{ background: palette.swatch }"></span>{{ palette.name }}</button></div></div><div class="settings-section"><label class="settings-label" for="kerja-custom-accent">Custom accent</label><input id="kerja-custom-accent" type="color" v-model="customAccent" @input="paletteId = 'custom'" /></div></section></div></Transition>
  </div>
</template>

<style>
.workspace {
  --workspace-bg: #f4f6f2; --workspace-surface: #fff; --workspace-text: #202820; --workspace-muted: #727d72; --workspace-border: #e1e7df; --workspace-accent: #2f704d; --workspace-accent-hover: #3f8056; --workspace-accent-soft: #e4f0e6; --workspace-accent-contrast: #fff;
  position: relative; isolation: isolate; min-height: 100vh; overflow: hidden; background: var(--workspace-bg); color: var(--workspace-text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; transition: background-color 400ms ease, color 400ms ease;
}
.workspace *, .workspace *::before, .workspace *::after { box-sizing: border-box; }
.workspace::before { content: ""; position: absolute; z-index: -1; inset: 0; opacity: .48; pointer-events: none; background-image: radial-gradient(color-mix(in srgb, var(--workspace-accent) 16%, transparent) .7px, transparent .7px); background-size: 19px 19px; mask-image: linear-gradient(180deg, #000 0%, transparent 76%); }
.ambient { position: absolute; z-index: -1; width: 32rem; aspect-ratio: 1; border-radius: 50%; filter: blur(72px); opacity: .13; pointer-events: none; background: var(--workspace-accent); animation: ambient-float 14s ease-in-out infinite alternate; }
.ambient-one { top: -17rem; left: -9rem; }.ambient-two { top: 10rem; right: -20rem; animation-delay: -6s; }
@keyframes ambient-float { from { transform: translate3d(0, 0, 0) scale(.94); } to { transform: translate3d(24px, 38px, 0) scale(1.08); } }
.workspace-topbar { position: relative; z-index: 5; display: flex; align-items: center; justify-content: space-between; max-width: 1320px; margin: 0 auto; padding: 24px clamp(20px, 5vw, 72px); border-bottom: 1px solid color-mix(in srgb, var(--workspace-border) 72%, transparent); }
.wordmark { display: inline-flex; align-items: center; gap: 10px; color: var(--workspace-text); text-decoration: none; font-size: 12px; font-weight: 850; letter-spacing: .12em; }.wordmark-mark { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--workspace-border); border-radius: 50%; color: var(--workspace-accent); font-family: Georgia, serif; font-size: 18px; letter-spacing: 0; }.wordmark-dot { color: var(--workspace-accent); }
.topbar-meta { display: flex; align-items: center; gap: 10px; color: var(--workspace-muted); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #3b9b67; box-shadow: 0 0 0 4px color-mix(in srgb, #3b9b67 15%, transparent); }.topbar-divider { opacity: .5; }
.topbar-actions { display: flex; align-items: center; gap: 14px; }.icon-button { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--workspace-border); border-radius: 50%; background: var(--workspace-surface); color: var(--workspace-text); font-size: 20px; cursor: pointer; transition: transform 250ms ease, border-color 250ms ease; }.icon-button:hover { transform: rotate(30deg); border-color: var(--workspace-accent); }.exit-link { color: var(--workspace-muted); font-size: 12px; text-decoration: none; }.exit-link:hover { color: var(--workspace-accent); }
.workspace-main { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }.workspace-hero { position: relative; display: flex; align-items: center; justify-content: space-between; min-height: 370px; padding: 46px 2px 50px; }.hero-copy { position: relative; z-index: 1; max-width: 720px; }.eyebrow { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; color: var(--workspace-accent); font-size: 10px; font-weight: 800; letter-spacing: .17em; text-transform: uppercase; }.eyebrow-rule { width: 22px; height: 1px; background: var(--workspace-accent); opacity: .6; }.workspace-hero h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(54px, 7vw, 92px); font-weight: 400; line-height: .95; letter-spacing: -.065em; }.workspace-hero h1 span { color: var(--workspace-accent); font-style: italic; }.hero-subtitle { max-width: 430px; margin: 22px 0 25px; color: var(--workspace-muted); font-size: 15px; line-height: 1.7; }.hero-stats { display: flex; align-items: center; gap: 20px; }.hero-stats > div { display: grid; gap: 2px; }.hero-stats strong { font-size: 16px; font-weight: 750; font-variant-numeric: tabular-nums; }.hero-stats span { color: var(--workspace-muted); font-size: 10px; }.stats-divider { width: 1px; height: 30px; background: var(--workspace-border); }.hero-stats .live-time strong { font-size: 13px; }
.hero-orbit { position: absolute; top: 50%; right: 4%; width: 315px; height: 315px; transform: translateY(-50%); }.orbit { position: absolute; inset: 9%; border: 1px solid color-mix(in srgb, var(--workspace-accent) 18%, transparent); border-radius: 50%; }.orbit-a { inset: 0; border-style: dashed; animation: orbit-spin 42s linear infinite; }.orbit-b { inset: 13%; transform: rotate(35deg) scaleX(.7); }.orbit-c { inset: 24%; border-style: dotted; animation: orbit-spin 24s linear infinite reverse; }.orbit-core { position: absolute; inset: 38%; display: grid; place-items: center; border-radius: 50%; background: var(--workspace-accent); color: var(--workspace-accent-contrast); font: italic 36px Georgia,serif; box-shadow: 0 0 50px color-mix(in srgb, var(--workspace-accent) 25%, transparent); }.orbit-node { position: absolute; display: grid; place-items: center; width: 35px; height: 35px; border: 1px solid var(--workspace-border); border-radius: 50%; background: var(--workspace-surface); color: var(--workspace-accent); box-shadow: 0 8px 24px rgba(0,0,0,.08); }.node-one { top: 7%; left: 52%; }.node-two { right: 3%; top: 47%; }.node-three { bottom: 8%; left: 24%; }@keyframes orbit-spin { to { transform: rotate(360deg); } }
.search-deck { position: relative; display: flex; align-items: center; gap: 17px; min-height: 80px; padding: 14px 18px; border: 1px solid color-mix(in srgb, var(--workspace-accent) 35%, var(--workspace-border)); border-radius: 19px; background: var(--workspace-surface); box-shadow: 0 18px 60px color-mix(in srgb, var(--workspace-accent) 10%, transparent); transition: box-shadow 300ms ease, transform 300ms ease; }.search-deck:focus-within { transform: translateY(-2px); box-shadow: 0 22px 72px color-mix(in srgb, var(--workspace-accent) 17%, transparent); }.search-icon { display: grid; flex: 0 0 auto; place-items: center; width: 45px; height: 45px; border-radius: 14px; background: var(--workspace-accent-soft); color: var(--workspace-accent); }.search-icon svg { width: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }.search-form { display: flex; flex: 1; align-items: center; gap: 14px; min-width: 0; }.search-form input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--workspace-text); font: inherit; font-size: 16px; }.search-form input::placeholder { color: var(--workspace-muted); opacity: .8; }.search-submit { display: inline-flex; align-items: center; gap: 12px; min-height: 45px; padding: 0 17px; border: 0; border-radius: 13px; background: var(--workspace-accent); color: var(--workspace-accent-contrast); font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; transition: background 180ms ease, transform 180ms ease; }.search-submit:hover { background: var(--workspace-accent-hover); transform: translateY(-1px); }.search-hint { display: flex; align-items: center; gap: 4px; color: var(--workspace-muted); font-size: 10px; white-space: nowrap; }.search-hint kbd { padding: 3px 5px; border: 1px solid var(--workspace-border); border-radius: 5px; background: var(--workspace-bg); color: var(--workspace-text); font: 10px ui-monospace,monospace; }
.collections { padding: 74px 0 30px; }.collection-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 27px; }.collection-heading .eyebrow { margin-bottom: 10px; }.collection-heading h2 { margin: 0; font: 400 clamp(35px,5vw,50px)/1 Georgia,serif; letter-spacing: -.045em; }.heading-period { color: var(--workspace-accent); }.result-count { margin: 0 0 5px; color: var(--workspace-muted); font-size: 12px; }.result-count strong { color: var(--workspace-text); }
.category-rail { display: flex; gap: 8px; margin: 0 0 38px; padding-bottom: 6px; overflow-x: auto; scrollbar-width: thin; }.category-chip { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 9px; padding: 9px 14px; border: 1px solid var(--workspace-border); border-radius: 999px; background: transparent; color: var(--workspace-muted); font: inherit; font-size: 12px; cursor: pointer; transition: color 180ms ease, background 180ms ease, border-color 180ms ease, transform 180ms ease; }.category-chip:hover { transform: translateY(-2px); border-color: var(--workspace-accent); color: var(--workspace-text); }.category-chip.active { border-color: var(--workspace-accent); background: var(--workspace-accent); color: var(--workspace-accent-contrast); }.category-indicator { width: 6px; height: 6px; border: 1px solid currentColor; border-radius: 50%; }.active .category-indicator { background: currentColor; }
.shortcut-group { margin: 0 0 34px; }.group-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }.group-heading h3 { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }.group-heading span { display: grid; place-items: center; min-width: 23px; height: 21px; border: 1px solid var(--workspace-border); border-radius: 99px; color: var(--workspace-muted); font-size: 9px; font-variant-numeric: tabular-nums; }.shortcut-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; }.shortcut-card { position: relative; display: flex; align-items: center; gap: 12px; min-width: 0; min-height: 78px; padding: 13px; overflow: hidden; border: 1px solid var(--workspace-border); border-radius: 15px; background: var(--workspace-surface); color: var(--workspace-text); text-decoration: none; transition: transform 300ms cubic-bezier(.2,.8,.2,1), border-color 200ms ease, box-shadow 300ms ease; }.shortcut-card::before { content: ""; position: absolute; inset: 0; transform: translateX(-110%) skewX(-18deg); background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--workspace-accent) 8%, transparent), transparent); transition: transform 650ms cubic-bezier(.2,.8,.2,1); pointer-events: none; }.shortcut-card:hover { z-index: 1; transform: translateY(-4px); border-color: color-mix(in srgb, var(--workspace-accent) 65%, var(--workspace-border)); box-shadow: 0 14px 32px color-mix(in srgb, var(--workspace-accent) 12%, transparent); }.shortcut-card:hover::before { transform: translateX(110%) skewX(-18deg); }.shortcut-icon { position: relative; display: grid; flex: 0 0 42px; place-items: center; width: 42px; height: 42px; border: 1px solid var(--workspace-border); border-radius: 13px; background: var(--workspace-bg); }.shortcut-icon img { width: 22px; height: 22px; object-fit: contain; }.fallback-icon { color: var(--workspace-accent); font: italic 19px Georgia,serif; }.shortcut-copy { display: grid; flex: 1; min-width: 0; gap: 4px; }.shortcut-copy strong { overflow: hidden; color: var(--workspace-text); font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.shortcut-copy > span { overflow: hidden; color: var(--workspace-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.shortcut-arrow { color: var(--workspace-muted); font-size: 14px; transition: color 180ms ease, transform 220ms ease; }.shortcut-card:hover .shortcut-arrow { transform: translate(2px,-2px); color: var(--workspace-accent); }.empty-state { padding: 44px 24px; border: 1px dashed var(--workspace-border); border-radius: 16px; color: var(--workspace-muted); text-align: center; }
.workspace-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 30px 0 28px; margin-top: 24px; border-top: 1px solid var(--workspace-border); color: var(--workspace-muted); font-size: 11px; }.workspace-footer a,.workspace-footer button { color: inherit; text-decoration: none; }.workspace-footer a:hover,.workspace-footer button:hover { color: var(--workspace-accent); }.workspace-footer button { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.settings-backdrop { position: fixed; z-index: 20; inset: 0; display: flex; justify-content: flex-end; background: rgba(11,17,13,.35); backdrop-filter: blur(4px); }.settings-panel { width: min(390px,100%); height: 100%; padding: 28px; overflow-y: auto; border-left: 1px solid var(--workspace-border); background: var(--workspace-surface); color: var(--workspace-text); box-shadow: -20px 0 60px rgba(0,0,0,.14); }.settings-heading { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 22px; border-bottom: 1px solid var(--workspace-border); }.settings-heading .eyebrow { margin: 0 0 8px; }.settings-heading h2 { margin: 0; font: 26px Georgia,serif; }.settings-section { display: grid; gap: 13px; padding: 23px 0; border-bottom: 1px solid var(--workspace-border); }.settings-label { color: var(--workspace-muted); font-size: 10px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }.mode-options { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; }.mode-options button,.palette-options button { padding: 10px; border: 1px solid var(--workspace-border); border-radius: 10px; background: transparent; color: var(--workspace-text); font: inherit; font-size: 11px; text-transform: capitalize; cursor: pointer; }.mode-options button.selected,.palette-options button.selected { border-color: var(--workspace-accent); background: var(--workspace-accent-soft); }.palette-options { display: grid; gap: 8px; }.palette-options button { display: flex; align-items: center; gap: 10px; text-align: left; }.palette-options button span { width: 16px; height: 16px; border: 1px solid rgba(0,0,0,.12); border-radius: 50%; }.settings-section input[type=color] { width: 100%; height: 44px; border: 1px solid var(--workspace-border); border-radius: 9px; background: transparent; cursor: pointer; }
.settings-enter-active,.settings-leave-active { transition: opacity 220ms ease; }.settings-enter-active .settings-panel,.settings-leave-active .settings-panel { transition: transform 320ms cubic-bezier(.16,1,.3,1); }.settings-enter-from,.settings-leave-to { opacity: 0; }.settings-enter-from .settings-panel,.settings-leave-to .settings-panel { transform: translateX(30px); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.workspace :where(a,button,input):focus-visible { outline: 3px solid var(--workspace-accent); outline-offset: 3px; }
@media(max-width:900px) { .hero-orbit { right: -3%; opacity: .55; transform: translateY(-50%) scale(.78); }.shortcut-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }.topbar-meta { letter-spacing: .07em; } }
@media(max-width:680px) { .workspace-topbar { padding: 14px 18px; }.topbar-meta { display: none; }.exit-link { font-size: 11px; }.workspace-main { width: min(100% - 32px, 560px); }.workspace-hero { min-height: 330px; padding: 58px 0 38px; }.workspace-hero h1 { font-size: clamp(54px,15vw,76px); }.hero-subtitle { max-width: 320px; font-size: 13px; }.hero-orbit { top: 25%; right: -31%; transform: translateY(-50%) scale(.58); opacity: .3; }.hero-stats { gap: 12px; }.search-deck { gap: 11px; min-height: 70px; padding: 10px; border-radius: 16px; }.search-icon { width: 38px; height: 38px; }.search-form { gap: 8px; }.search-form input { font-size: 13px; }.search-submit { min-height: 40px; padding: 0 11px; font-size: 11px; }.search-hint { display: none; }.collections { padding-top: 54px; }.collection-heading { align-items: flex-start; gap: 12px; }.result-count { padding-top: 22px; white-space: nowrap; }.category-rail { margin-bottom: 29px; }.shortcut-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }.shortcut-card { min-height: 70px; gap: 9px; padding: 10px; }.shortcut-icon { flex-basis: 36px; width: 36px; height: 36px; border-radius: 11px; }.shortcut-icon img { width: 19px; height: 19px; }.shortcut-copy strong { font-size: 11px; }.shortcut-copy>span { font-size: 9px; }.shortcut-arrow { display: none; }.workspace-footer { flex-wrap: wrap; }.workspace-footer span { display: none; } }
@media(max-width:380px) { .shortcut-grid { grid-template-columns: 1fr; }.workspace-hero h1 { font-size: 52px; }.hero-stats { gap: 8px; } }
@media(prefers-reduced-motion:reduce) { *,*::before,*::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }.orbit-a,.orbit-c,.ambient { animation: none !important; }.shortcut-card:hover,.category-chip:hover,.search-deck:focus-within { transform: none; } }
</style>
