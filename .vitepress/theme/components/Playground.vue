<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ACCENTS,
  CORNERS,
  DENSITIES,
  ENGINES,
  MOTIONS,
  PAPERS,
  applySettings,
  bootCustomization,
  resetSettings,
  settings,
  type AccentId,
  type CornerId,
  type DensityId,
  type MotionId,
  type PaperId
} from '../customize'
import { animate, stagger } from 'animejs'
import { freezeTransitions, motionLevel, motionProfile, pop } from '../effects'
import SearchDock from './SearchDock.vue'

type Tab = 'style' | 'find' | 'keys'

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'style', label: 'Style' },
  { id: 'find', label: 'Search' },
  { id: 'keys', label: 'Keys' }
]

const open = ref(false)
const tab = ref<Tab>('style')
const panel = ref<HTMLElement | null>(null)
const fab = ref<HTMLButtonElement | null>(null)
let lastFocus: HTMLElement | null = null

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return (
    !!el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable)
  )
}

function show(next: Tab = 'style') {
  if (open.value) {
    tab.value = next
    return
  }
  lastFocus = document.activeElement as HTMLElement | null
  tab.value = next
  open.value = true
}

function hide() {
  open.value = false
  lastFocus?.focus?.({ preventScroll: true })
}

function toggle(event?: Event) {
  if (event) pop(event.currentTarget as HTMLElement)
  open.value ? hide() : show()
}

function pickAccent(id: AccentId, event: Event) {
  applySettings({ accent: id })
  pop(event.currentTarget as HTMLElement)
}

function pickPaper(id: PaperId) {
  applySettings({ paper: id })
}

function pickCorners(id: CornerId) {
  applySettings({ corners: id })
}

function pickMotion(id: MotionId) {
  applySettings({ motion: id })
}

function pickDensity(id: DensityId) {
  applySettings({ density: id })
}

function reset() {
  resetSettings()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    hide()
    return
  }
  if (isTyping(event.target)) return
  const shortcut =
    (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p'
  if (shortcut) {
    event.preventDefault()
    toggle()
    return
  }
  if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault()
    show('keys')
  }
}

watch(open, async (value) => {
  if (!value) return
  await nextTick()
  if (!panel.value) return
  if (motionLevel() === 'off') return

  const profile = motionProfile()
  const D = (value: number) => Math.round(value * profile.duration)
  const T = (value: number) => Math.round(value * profile.delay)

  // The sheet itself is handled by its Vue <Transition> (one owner, no double
  // animation). The contents get a staggered entrance that starts once the
  // sheet has landed, with their hover transitions frozen so nothing fights
  // the timeline.
  const sections = Array.from(panel.value.querySelectorAll<HTMLElement>('.pg-section'))
  const tabs = Array.from(panel.value.querySelectorAll<HTMLElement>('.pg-tabs button'))
  const swatches = Array.from(panel.value.querySelectorAll<HTMLElement>('.pg-swatch'))
  const animated = [...sections, ...tabs, ...swatches]
  freezeTransitions(animated, D(1600))

  const start = profile.expressive ? T(280) : 140

  if (sections.length) {
    animate(sections, {
      opacity: [0, 1],
      y: [Math.round(12 * profile.travel), 0],
      duration: D(420),
      delay: stagger(Math.round(40 * profile.delay), { start }),
      ease: 'outQuint'
    })
  }

  if (profile.expressive) {
    if (tabs.length) {
      animate(tabs, {
        opacity: [0, 1],
        y: [-8, 0],
        duration: D(360),
        delay: stagger(Math.round(45 * profile.delay), { start }),
        ease: 'outQuint'
      })
    }
    if (swatches.length) {
      animate(swatches, {
        scale: [0.75, 1],
        opacity: [0, 1],
        duration: D(420),
        delay: stagger(Math.round(35 * profile.delay), { start: start + T(120) }),
        ease: 'outBack(1.8)'
      })
    }
  }
})


onMounted(() => {
  bootCustomization()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="pg-root">
    <Transition name="pg-scrim">
      <div v-if="open" class="pg-scrim" @click="hide" />
    </Transition>

    <button
      ref="fab"
      class="pg-fab"
      :class="{ 'is-open': open }"
      type="button"
      :aria-expanded="open"
      aria-controls="flessan-playground"
      aria-label="Customize this site"
      @click="toggle($event)"
    >
      <span class="pg-fab-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <circle cx="15" cy="7" r="2.2" />
          <circle cx="9" cy="17" r="2.2" />
        </svg>
      </span>
      <span class="pg-fab-label">Customize</span>
    </button>

    <Transition name="pg-sheet">
      <aside
        v-if="open"
        id="flessan-playground"
        ref="panel"
        class="pg-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Site customization"
      >
        <header class="pg-head">
          <div class="pg-title">
            <h2>Customize</h2>
            <p>Saved on this device</p>
          </div>
          <button class="pg-close" type="button" aria-label="Close" @click="hide">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div class="pg-tabs" role="tablist" aria-label="Customization sections">
          <button
            v-for="item in tabs"
            :key="item.id"
            type="button"
            role="tab"
            :aria-selected="tab === item.id"
            :class="{ active: tab === item.id }"
            @click="tab = item.id"
          >
            <svg v-if="tab === item.id" class="pg-tab-check" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {{ item.label }}
          </button>
        </div>

        <div class="pg-body">
          <template v-if="tab === 'style'">
            <section class="pg-section">
              <div class="pg-label">
                <span>Seed colour</span>
                <span class="pg-value">{{ settings.accent }}</span>
              </div>
              <div class="pg-swatches" role="radiogroup" aria-label="Seed colour">
                <button
                  v-for="accent in ACCENTS"
                  :key="accent.id"
                  type="button"
                  role="radio"
                  class="pg-swatch"
                  :class="{ active: settings.accent === accent.id }"
                  :aria-checked="settings.accent === accent.id"
                  :aria-label="accent.label"
                  :title="accent.label"
                  :style="{ '--swatch': accent.swatch }"
                  @click="pickAccent(accent.id, $event)"
                >
                  <svg v-if="settings.accent === accent.id" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </section>

            <section class="pg-section">
              <div class="pg-label">
                <span>Surface</span>
                <span class="pg-value">{{ settings.paper }}</span>
              </div>
              <div class="pg-row" role="radiogroup" aria-label="Surface tone">
                <button
                  v-for="paper in PAPERS"
                  :key="paper.id"
                  type="button"
                  class="pg-chip"
                  role="radio"
                  :aria-checked="settings.paper === paper.id"
                  :class="{ active: settings.paper === paper.id }"
                  @click="pickPaper(paper.id)"
                >
                  <span
                    class="pg-paper-dot"
                    :style="{ background: paper.swatch }"
                    aria-hidden="true"
                  ></span>
                  {{ paper.label }}
                </button>
              </div>
            </section>

            <section class="pg-section">
              <div class="pg-label"><span>Shape</span></div>
              <div class="pg-row" role="radiogroup" aria-label="Corner shape">
                <button
                  v-for="corner in CORNERS"
                  :key="corner.id"
                  type="button"
                  class="pg-chip"
                  role="radio"
                  :aria-checked="settings.corners === corner.id"
                  :class="{ active: settings.corners === corner.id }"
                  @click="pickCorners(corner.id)"
                >
                  {{ corner.label }}
                </button>
              </div>
            </section>

            <section class="pg-section">
              <div class="pg-label"><span>Motion</span></div>
              <div class="pg-row" role="radiogroup" aria-label="Motion level">
                <button
                  v-for="motion in MOTIONS"
                  :key="motion.id"
                  type="button"
                  class="pg-chip"
                  role="radio"
                  :aria-checked="settings.motion === motion.id"
                  :class="{ active: settings.motion === motion.id }"
                  :title="motion.note"
                  @click="pickMotion(motion.id)"
                >
                  {{ motion.label }}
                </button>
              </div>
            </section>

            <section class="pg-section">
              <div class="pg-label"><span>Density</span></div>
              <div class="pg-row" role="radiogroup" aria-label="Reading density">
                <button
                  v-for="density in DENSITIES"
                  :key="density.id"
                  type="button"
                  class="pg-chip"
                  role="radio"
                  :aria-checked="settings.density === density.id"
                  :class="{ active: settings.density === density.id }"
                  @click="pickDensity(density.id)"
                >
                  {{ density.label }}
                </button>
              </div>
            </section>

            <footer class="pg-foot">
              <button class="pg-reset" type="button" @click="reset">Reset defaults</button>
              <span class="pg-foot-hint">⌘⇧P toggles this sheet</span>
            </footer>
          </template>

          <template v-else-if="tab === 'find'">
            <section class="pg-section">
              <SearchDock compact heading="Default engine" />
            </section>
            <section class="pg-section">
              <div class="pg-label"><span>Also available</span></div>
              <ul class="pg-engines">
                <li v-for="engine in ENGINES.slice(1)" :key="engine.id">
                  <span class="pg-engine-dot" :style="{ background: engine.color }" aria-hidden="true"></span>
                  <span class="pg-engine-name">{{ engine.name }}</span>
                  <span class="pg-engine-hint">{{ engine.hint }}</span>
                </li>
              </ul>
            </section>
            <p class="pg-note">
              The same choice powers the home search bar and the workspace at
              <a href="/kerja">/kerja</a>.
            </p>
          </template>

          <template v-else>
            <section class="pg-section">
              <div class="pg-label"><span>Keyboard</span></div>
              <ul class="pg-keys">
                <li>
                  <span class="pg-keys-combo"><kbd>⌘</kbd><kbd>K</kbd><em>or</em><kbd>/</kbd></span>
                  <span>search this site</span>
                </li>
                <li>
                  <span class="pg-keys-combo"><kbd>?</kbd></span>
                  <span>this shortcut sheet</span>
                </li>
                <li>
                  <span class="pg-keys-combo"><kbd>⌘</kbd><kbd>⇧</kbd><kbd>P</kbd></span>
                  <span>open customization</span>
                </li>
                <li>
                  <span class="pg-keys-combo"><kbd>esc</kbd></span>
                  <span>close a panel</span>
                </li>
              </ul>
            </section>
            <section class="pg-section">
              <div class="pg-label"><span>Bang shortcuts</span></div>
              <ul class="pg-bangs">
                <li v-for="[prefix, id] in Object.entries({
                  g: 'google',
                  d: 'duckduckgo',
                  b: 'brave',
                  sp: 'startpage',
                  k: 'kagi',
                  yt: 'youtube',
                  gh: 'github',
                  w: 'wikipedia',
                  npm: 'npm'
                })" :key="prefix">
                  <code>!{{ prefix }}</code>
                  <span>{{ id }}</span>
                </li>
              </ul>
              <p class="pg-note">
                Type <code>!gh vite</code> in any search bar to open GitHub
                directly.
              </p>
            </section>
          </template>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.pg-root {
  position: relative;
  z-index: 60;
}

/* ------------------------------------------------------------------- FAB */
.pg-fab {
  position: fixed;
  right: clamp(14px, 2.4vw, 26px);
  bottom: clamp(14px, 2.4vw, 26px);
  z-index: 62;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  height: 56px;
  padding: 0 1.25rem 0 1rem;
  border: 0;
  border-radius: var(--md-shape-lg);
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  box-shadow: var(--md-elevation-3);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    box-shadow var(--md-duration-medium) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring),
    border-radius var(--md-duration-medium) var(--md-ease-standard);
}

.pg-fab:hover {
  box-shadow: var(--md-elevation-4);
  transform: translateY(-2px);
}

.pg-fab:active {
  transform: scale(0.96);
}

.pg-fab.is-open {
  border-radius: var(--md-shape-full);
  padding: 0;
  width: 56px;
  justify-content: center;
}

.pg-fab-icon {
  display: grid;
  place-items: center;
  transition: transform var(--md-duration-long) var(--md-ease-spring);
}

.pg-fab.is-open .pg-fab-icon {
  transform: rotate(-90deg);
}

.pg-fab svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
}

.pg-fab-label {
  white-space: nowrap;
}

.pg-fab.is-open .pg-fab-label {
  display: none;
}

/* ----------------------------------------------------------------- scrim */
.pg-scrim {
  position: fixed;
  inset: 0;
  z-index: 61;
  background: var(--md-scrim);
}

.pg-scrim-enter-active,
.pg-scrim-leave-active {
  transition: opacity var(--md-duration-medium) var(--md-ease-standard);
}

.pg-scrim-enter-from,
.pg-scrim-leave-to {
  opacity: 0;
}

/* ----------------------------------------------------------------- sheet */
.pg-panel {
  position: fixed;
  top: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 63;
  display: flex;
  flex-direction: column;
  width: min(390px, calc(100vw - 24px));
  overflow: hidden;
  border-radius: var(--md-shape-2xl);
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-5);
}

.pg-sheet-enter-active,
.pg-sheet-leave-active {
  will-change: transform, opacity;
  transition: opacity var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-long) var(--md-ease-emphasized-decel);
}

.pg-sheet-enter-from,
.pg-sheet-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.98);
}

.pg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.25rem 0.85rem;
}

.pg-title h2 {
  margin: 0;
  color: var(--md-on-surface);
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.25;
}

.pg-title p {
  margin: 0.2rem 0 0;
  color: var(--md-on-surface-variant);
  font-size: 0.78rem;
  letter-spacing: 0.2px;
}

.pg-close {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.pg-close:hover {
  background: color-mix(in srgb, var(--md-on-surface) 8%, transparent);
  color: var(--md-on-surface);
}

.pg-close svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* ------------------------------------------------------------ segmented */
.pg-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin: 0 1.25rem;
  border: 1px solid var(--md-outline);
  border-radius: var(--md-shape-full);
  overflow: hidden;
}

.pg-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 40px;
  border: 0;
  border-right: 1px solid var(--md-outline);
  background: transparent;
  color: var(--md-on-surface);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.pg-tabs button:last-child {
  border-right: 0;
}

.pg-tabs button:hover {
  background: color-mix(in srgb, var(--md-on-surface) 6%, transparent);
}

.pg-tabs button.active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.pg-tab-check {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ------------------------------------------------------------------ body */
.pg-body {
  overflow-y: auto;
  padding: 0.6rem 1.25rem 1.4rem;
}

.pg-section {
  padding: 0.85rem 0;
}

.pg-section + .pg-section {
  border-top: 1px solid var(--md-outline-variant);
}

.pg-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
  color: var(--md-on-surface-variant);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.pg-value {
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  font-weight: 400;
  letter-spacing: 0.3px;
  text-transform: capitalize;
  opacity: 0.85;
}

.pg-swatches {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.pg-swatch {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--swatch);
  color: #ffffff;
  cursor: pointer;
  transition: transform var(--md-duration-medium) var(--md-ease-spring),
    box-shadow var(--md-duration-short) var(--md-ease-standard);
}

.pg-swatch:hover {
  transform: scale(1.08);
}

.pg-swatch.active {
  box-shadow: 0 0 0 3px var(--md-surface-container-high), 0 0 0 6px var(--swatch);
}

.pg-swatch svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---------------------------------------------------------------- chips */
.pg-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pg-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 36px;
  padding: 0 0.9rem;
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
    border-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-short) var(--md-ease-spring);
}

.pg-chip:hover {
  background: color-mix(in srgb, var(--md-on-surface) 6%, transparent);
  color: var(--md-on-surface);
}

.pg-chip:active {
  transform: scale(0.97);
}

.pg-chip.active {
  border-color: transparent;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.pg-paper-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--md-outline-variant) inset;
}

/* ------------------------------------------------------------------ foot */
.pg-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-top: 0.4rem;
  padding-top: 1rem;
  border-top: 1px solid var(--md-outline-variant);
}

.pg-reset {
  min-height: 36px;
  padding: 0 1rem;
  border: 1px solid var(--md-outline);
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-primary);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.pg-reset:hover {
  background: var(--md-primary-container);
}

.pg-foot-hint {
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
}

/* ------------------------------------------------------------------ keys */
.pg-keys,
.pg-engines {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pg-keys li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0;
  color: var(--md-on-surface-variant);
  font-size: 0.8rem;
}

.pg-keys-combo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pg-keys-combo em {
  padding: 0 2px;
  font-size: 0.68rem;
  font-style: normal;
  opacity: 0.7;
}

.pg-keys kbd,
.pg-bangs code,
.pg-note code {
  padding: 0.12rem 0.4rem;
  border-radius: var(--md-shape-xs);
  background: var(--md-surface-container-highest);
  color: var(--md-on-surface);
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
}

.pg-bangs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pg-bangs li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--md-on-surface-variant);
  font-size: 0.68rem;
}

.pg-note {
  margin: 0.7rem 0 0;
  color: var(--md-on-surface-variant);
  font-size: 0.76rem;
  line-height: 1.6;
}

.pg-note a {
  color: var(--md-primary);
  font-weight: 500;
}

.pg-engines li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.78rem;
}

.pg-engine-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

.pg-engine-name {
  color: var(--md-on-surface);
  font-weight: 500;
}

.pg-engine-hint {
  margin-left: auto;
  overflow: hidden;
  max-width: 12rem;
  color: var(--md-on-surface-variant);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .pg-panel {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-height: 82vh;
    border-radius: var(--md-shape-2xl) var(--md-shape-2xl) 0 0;
  }

  .pg-fab {
    height: 56px;
    width: 56px;
    padding: 0;
    justify-content: center;
    border-radius: var(--md-shape-lg);
  }

  .pg-fab-label {
    display: none;
  }

  .pg-fab.is-open {
    border-radius: 50%;
  }
}
</style>
