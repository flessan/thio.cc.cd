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
import { motionLevel, pop } from '../effects'
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

function toggle() {
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
  animate(panel.value, {
    opacity: [0, 1],
    y: [14, 0],
    scale: [0.98, 1],
    duration: 340,
    ease: 'outQuint'
  })
  animate(panel.value.querySelectorAll('.pg-section'), {
    opacity: [0, 1],
    y: [8, 0],
    duration: 300,
    delay: stagger(45, { start: 70 }),
    ease: 'outQuint'
  })
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
    <button
      class="pg-trigger"
      type="button"
      :aria-expanded="open"
      aria-controls="flessan-playground"
      aria-label="Customize this site"
      title="Customize this site (⌘⇧P)"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2.2" />
        <circle cx="10" cy="17" r="2.2" />
      </svg>
    </button>

    <aside
      v-if="open"
      id="flessan-playground"
      ref="panel"
      class="pg-panel"
      role="dialog"
      aria-modal="false"
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
          {{ item.label }}
        </button>
      </div>

      <div class="pg-body">
        <template v-if="tab === 'style'">
          <section class="pg-section">
            <div class="pg-label">
              <span>Accent</span>
              <span class="pg-value">{{ settings.accent }}</span>
            </div>
            <div class="pg-swatches" role="radiogroup" aria-label="Accent colour">
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
              />
            </div>
          </section>

          <section class="pg-section">
            <div class="pg-label">
              <span>Surface</span>
              <span class="pg-value">{{ settings.paper }}</span>
            </div>
            <div class="pg-row" role="radiogroup" aria-label="Surface tint">
              <button
                v-for="paper in PAPERS"
                :key="paper.id"
                type="button"
                class="pg-pill"
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
            <div class="pg-label"><span>Corners</span></div>
            <div class="pg-row" role="radiogroup" aria-label="Corner style">
              <button
                v-for="corner in CORNERS"
                :key="corner.id"
                type="button"
                class="pg-pill"
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
                class="pg-pill"
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
                class="pg-pill"
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
            <span class="pg-foot-hint">⌘⇧P toggles this panel</span>
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
  </div>
</template>

<style scoped>
.pg-root {
  position: relative;
  z-index: 60;
}

.pg-trigger {
  position: fixed;
  right: clamp(14px, 2.2vw, 24px);
  bottom: clamp(14px, 2.2vw, 22px);
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  padding: 0;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  box-shadow: var(--flessan-shadow-sm);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    transform 200ms var(--flessan-ease-out);
}

.pg-trigger:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-alt);
  transform: translateY(-1px);
}

.pg-trigger svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.pg-panel {
  position: fixed;
  right: clamp(14px, 2.2vw, 24px);
  bottom: calc(clamp(14px, 2.2vw, 22px) + 48px);
  z-index: 61;
  display: flex;
  flex-direction: column;
  width: min(336px, calc(100vw - 28px));
  max-height: min(620px, calc(100vh - 120px));
  overflow: hidden;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--fl-r-lg);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--flessan-shadow-lg);
}

.pg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem 0.75rem;
}

.pg-title h2 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 0.98rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.pg-title p {
  margin: 0.15rem 0 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.63rem;
  letter-spacing: 0.02em;
}

.pg-close {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.pg-close:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.pg-close svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.pg-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin: 0 1rem;
  padding: 3px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
}

.pg-tabs button {
  padding: 0.32rem 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-family: inherit;
  font-size: 0.73rem;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
}

.pg-tabs button:hover {
  color: var(--vp-c-text-1);
}

.pg-tabs button.active {
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: 0 1px 2px rgba(16, 18, 22, 0.08);
}

.pg-body {
  overflow-y: auto;
  padding: 0.85rem 1rem 1rem;
}

.pg-section {
  padding: 0.6rem 0;
  border-top: 1px solid var(--vp-c-divider);
}

.pg-section:first-child {
  border-top: 0;
}

.pg-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-2);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.pg-value {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pg-swatches {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pg-swatch {
  position: relative;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--swatch);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08) inset;
  cursor: pointer;
  transition: transform 180ms var(--flessan-ease-out), box-shadow 180ms ease;
}

.pg-swatch:hover {
  transform: scale(1.08);
}

.pg-swatch.active {
  box-shadow:
    0 0 0 2px var(--vp-c-bg-elv),
    0 0 0 3.5px var(--swatch);
}

.pg-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pg-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-family: inherit;
  font-size: 0.73rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.pg-pill:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
}

.pg-pill.active {
  border-color: var(--fl-accent);
  background: var(--fl-accent-soft);
  color: var(--fl-accent-ink);
  font-weight: 600;
}

.pg-paper-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.14) inset;
}

.pg-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.4rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--vp-c-divider);
}

.pg-reset {
  padding: 0.32rem 0.55rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.pg-reset:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.pg-foot-hint {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.61rem;
}

.pg-keys {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pg-keys li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.32rem 0;
  color: var(--vp-c-text-2);
  font-size: 0.73rem;
}

.pg-keys li + li {
  border-top: 1px dashed var(--vp-c-divider);
}

.pg-keys-combo {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.pg-keys-combo em {
  padding: 0 2px;
  color: var(--vp-c-text-3);
  font-size: 0.63rem;
  font-style: normal;
}

.pg-keys kbd,
.pg-bangs code,
.pg-note code {
  padding: 0.08rem 0.3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
}

.pg-bangs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pg-bangs li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0;
  color: var(--vp-c-text-3);
  font-size: 0.64rem;
}

.pg-bangs li + li {
  border-top: 0;
}

.pg-note {
  margin: 0.6rem 0 0;
  color: var(--vp-c-text-3);
  font-size: 0.71rem;
  line-height: 1.6;
}

.pg-note a {
  color: var(--fl-accent-ink);
}

.pg-engines {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pg-engines li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.26rem 0;
  font-size: 0.72rem;
}

.pg-engines li + li {
  border-top: 1px dashed var(--vp-c-divider);
}

.pg-engine-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.pg-engine-name {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.pg-engine-hint {
  margin-left: auto;
  overflow: hidden;
  max-width: 12rem;
  color: var(--vp-c-text-3);
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .pg-panel {
    left: 10px;
    right: 10px;
    bottom: 58px;
    width: auto;
    max-height: 76vh;
  }

  .pg-trigger {
    right: 12px;
    bottom: 12px;
  }
}
</style>
