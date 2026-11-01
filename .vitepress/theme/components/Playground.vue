<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ACCENTS,
  CORNERS,
  DENSITIES,
  MOTIONS,
  PAPERS,
  applySettings,
  bootCustomization,
  randomizeSettings,
  resetSettings,
  settings,
  type AccentId,
  type CornerId,
  type DensityId,
  type MotionId,
  type PaperId
} from '../customize'
import { animate, stagger } from 'animejs'
import { confetti, motionLevel, pop } from '../effects'
import SearchDock from './SearchDock.vue'

type Tab = 'style' | 'search' | 'keys'

const open = ref(false)
const tab = ref<Tab>('style')
const panel = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
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

function show() {
  if (open.value) return
  lastFocus = document.activeElement as HTMLElement | null
  tab.value = 'style'
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

function surprise(event: MouseEvent) {
  randomizeSettings()
  confetti(event.clientX, event.clientY, 26)
  pop(panel.value?.querySelector('.pg-surprise') ?? null)
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
  const shortcut = (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p'
  if (shortcut) {
    event.preventDefault()
    toggle()
    return
  }
  if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault()
    show()
    tab.value = 'keys'
  }
}

watch(open, async (value) => {
  if (!value) return
  await nextTick()
  if (!panel.value) return
  if (motionLevel() === 'off') return
  animate(panel.value, {
    opacity: [0, 1],
    y: [18, 0],
    scale: [0.96, 1],
    rotate: [1.2, 0],
    duration: 420,
    ease: 'outBack(1.6)'
  })
  animate(panel.value.querySelectorAll('.pg-section'), {
    opacity: [0, 1],
    y: [10, 0],
    duration: 340,
    delay: stagger(50, { start: 90 }),
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
      ref="trigger"
      class="pg-trigger"
      type="button"
      :aria-expanded="open"
      aria-controls="flessan-playground"
      aria-label="Open the playground"
      @click="toggle"
    >
      <span class="pg-trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <circle cx="8.6" cy="9.6" r="1.2" />
          <circle cx="14.4" cy="8.2" r="1.2" />
          <circle cx="16.4" cy="13.6" r="1.2" />
          <circle cx="9.2" cy="14.8" r="1.2" />
          <path d="M12 21a3 3 0 0 0 0-6h-1.2" />
        </svg>
      </span>
      <span class="pg-trigger-label">Playground</span>
    </button>

    <aside
      v-if="open"
      id="flessan-playground"
      ref="panel"
      class="pg-panel"
      role="dialog"
      aria-modal="false"
      aria-label="Site playground"
    >
      <header class="pg-head">
        <div>
          <p class="pg-kicker">make it yours</p>
          <h2>Playground</h2>
        </div>
        <button class="pg-close" type="button" aria-label="Close playground" @click="hide">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="pg-tabs" role="tablist" aria-label="Playground sections">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'style'"
          :class="{ active: tab === 'style' }"
          @click="tab = 'style'"
        >
          Style
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'search'"
          :class="{ active: tab === 'search' }"
          @click="tab = 'search'"
        >
          Search
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'keys'"
          :class="{ active: tab === 'keys' }"
          @click="tab = 'keys'"
        >
          Keys
        </button>
      </div>

      <div class="pg-body">
        <template v-if="tab === 'style'">
          <section class="pg-section">
            <div class="pg-label">
              <h3>Accent</h3>
              <span>{{ settings.accent }}</span>
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
                :style="{ background: accent.swatch }"
                @click="pickAccent(accent.id, $event)"
              >
                <svg v-if="settings.accent === accent.id" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              </button>
            </div>
          </section>

          <section class="pg-section">
            <div class="pg-label">
              <h3>Paper</h3>
              <span>{{ settings.paper }}</span>
            </div>
            <div class="pg-row" role="radiogroup" aria-label="Paper tint">
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
            <div class="pg-label">
              <h3>Corners</h3>
              <span>{{ settings.corners }}</span>
            </div>
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
            <div class="pg-label">
              <h3>Motion</h3>
              <span>{{ settings.motion }}</span>
            </div>
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
            <div class="pg-label">
              <h3>Density</h3>
              <span>{{ settings.density }}</span>
            </div>
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

          <section class="pg-section pg-actions">
            <button class="pg-surprise" type="button" @click="surprise">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
                <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
              </svg>
              Surprise me
            </button>
            <button class="pg-reset" type="button" @click="reset">Reset</button>
          </section>
        </template>

        <template v-else-if="tab === 'search'">
          <section class="pg-section pg-search-section">
            <SearchDock compact heading="Quick search" />
          </section>
          <p class="pg-note">
            Your engine choice is saved on this device and is also used by the
            search bar on the home page.
          </p>
        </template>

        <template v-else>
          <section class="pg-section">
            <div class="pg-label"><h3>Keyboard</h3></div>
            <ul class="pg-keys">
              <li>
                <span><kbd>⌘</kbd><kbd>K</kbd> or <kbd>/</kbd></span>
                <span>search this site</span>
              </li>
              <li>
                <span><kbd>?</kbd></span>
                <span>open these shortcuts</span>
              </li>
              <li>
                <span><kbd>⌘</kbd><kbd>⇧</kbd><kbd>P</kbd></span>
                <span>open the playground</span>
              </li>
              <li>
                <span><kbd>esc</kbd></span>
                <span>close a panel</span>
              </li>
            </ul>
          </section>
          <section class="pg-section">
            <div class="pg-label"><h3>Search shorthand</h3></div>
            <p class="pg-note">
              Start a query with an engine prefix to jump straight there:
              <code>!ddg</code>, <code>!gh</code>, <code>!yt</code>,
              <code>!k</code>, <code>!w</code>, <code>!npm</code>.
            </p>
          </section>
          <section class="pg-section">
            <div class="pg-label"><h3>Little things</h3></div>
            <p class="pg-note">
              Drag the “say hi!” sticker on the home page. Change accent, paper,
              corners, motion and density here — it all persists. Press
              <kbd>?</kbd> any time.
            </p>
          </section>
        </template>
      </div>

      <footer class="pg-foot">
        <span class="pg-foot-dot" aria-hidden="true"></span>
        Saved on this device · no account, no tracking
      </footer>
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
  right: clamp(16px, 3vw, 34px);
  bottom: clamp(16px, 3vw, 30px);
  z-index: 61;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 44px;
  padding: 0 0.85rem;
  border: 2px solid var(--fl-ink);
  border-radius: 14px;
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--fl-ink);
  transition:
    transform 160ms var(--flessan-ease-out),
    box-shadow 160ms var(--flessan-ease-out);
}

.pg-trigger:hover {
  transform: translate(-2px, -2px) rotate(-2deg);
  box-shadow: 5px 5px 0 var(--fl-ink);
}

.pg-trigger:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--fl-ink);
}

.pg-trigger-icon {
  display: grid;
  place-items: center;
}

.pg-trigger-icon svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
}

.panel,
.pg-panel {
  position: fixed;
  right: clamp(16px, 3vw, 34px);
  bottom: calc(clamp(16px, 3vw, 30px) + 58px);
  z-index: 63;
  display: flex;
  flex-direction: column;
  width: min(23rem, calc(100vw - 32px));
  max-height: min(78vh, 44rem);
  border: 2px solid var(--fl-ink);
  border-radius: var(--flessan-radius-lg);
  background: var(--vp-c-bg);
  box-shadow: 8px 8px 0 var(--fl-ink);
  overflow: hidden;
}

.pg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem 0.7rem;
  border-bottom: 2px dashed var(--vp-c-border);
  background: var(--vp-c-bg-alt);
}

.pg-kicker {
  margin: 0;
  color: var(--fl-accent-ink);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.pg-head h2 {
  margin: 0.1rem 0 0;
  font-size: 1.2rem;
  font-weight: 850;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--vp-c-text-1);
}

.pg-close {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--fl-ink);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--fl-ink);
}

.pg-close:hover {
  background: var(--fl-accent);
  color: var(--fl-on-accent);
}

.pg-close svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
}

.pg-tabs {
  display: flex;
  gap: 0.35rem;
  padding: 0.6rem 1rem;
  border-bottom: 2px solid var(--vp-c-divider);
}

.pg-tabs button {
  flex: 1 1 0;
  min-height: 1.9rem;
  padding: 0.2rem 0.5rem;
  border: 2px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;
}

.pg-tabs button:hover {
  background: var(--vp-c-bg-alt);
}

.pg-tabs button.active {
  border-color: var(--fl-ink);
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  box-shadow: 2px 2px 0 var(--fl-ink);
}

.pg-body {
  flex: 1 1 auto;
  padding: 0.9rem 1rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.pg-section + .pg-section {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1.5px dashed var(--vp-c-divider);
}

.pg-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.pg-label h3 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-1);
}

.pg-label span {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  text-transform: lowercase;
}

.pg-swatches {
  display: flex;
  gap: 0.45rem;
}

.pg-swatch {
  position: relative;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 2px solid var(--fl-ink);
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--fl-ink);
  transition: transform 160ms var(--flessan-ease-out);
}

.pg-swatch:hover {
  transform: translate(-2px, -2px) rotate(-4deg);
}

.pg-swatch svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: #1e1a14;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
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
  min-height: 1.95rem;
  padding: 0.18rem 0.6rem;
  border: 2px solid var(--vp-c-border);
  border-radius: 999px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.pg-pill:hover {
  border-color: var(--fl-ink);
  color: var(--vp-c-text-1);
}

.pg-pill.active {
  border-color: var(--fl-ink);
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  box-shadow: 2px 2px 0 var(--fl-ink);
}

.pg-paper-dot {
  width: 0.8rem;
  height: 0.8rem;
  border: 1.5px solid var(--fl-ink);
  border-radius: 3px;
}

.pg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.pg-surprise,
.pg-reset {
  min-width: 0;
  padding: 0 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex: 1 1 0;
  min-height: 2.4rem;
  border: 2px solid var(--fl-ink);
  border-radius: 10px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--fl-ink);
  transition: transform 140ms var(--flessan-ease-out), box-shadow 140ms var(--flessan-ease-out);
}

.pg-surprise {
  background: var(--fl-accent);
  color: var(--fl-on-accent);
}

.pg-surprise svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linejoin: round;
}

.pg-surprise:hover,
.pg-reset:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--fl-ink);
}

.pg-reset {
  flex: 0 0 auto;
  font-weight: 700;
}

.pg-keys {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pg-keys li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}

.pg-keys li > span:last-child {
  text-align: right;
}

.pg-keys kbd,
.pg-note kbd {
  display: inline-block;
  min-width: 1.25rem;
  margin-right: 0.12rem;
  padding: 0.02rem 0.28rem;
  border: 1.5px solid var(--vp-c-border);
  border-bottom-width: 3px;
  border-radius: 5px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  text-align: center;
}

.pg-note {
  margin: 0.5rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  line-height: 1.55;
}

.pg-note code {
  padding: 0.04rem 0.26rem;
  border: 1.5px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-elv);
  font-size: 0.7rem;
  color: var(--vp-c-text-1);
}

.pg-search-section {
  margin: 0;
  padding: 0;
  border-top: 0;
}

.pg-foot {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-top: 2px dashed var(--vp-c-border);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  letter-spacing: 0.04em;
}

.pg-foot-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2fbe7b;
  border: 1.5px solid var(--fl-ink);
}

@media (max-width: 720px) {
  .pg-trigger {
    padding: 0 0.6rem;
  }

  .pg-trigger-label {
    display: none;
  }

  .pg-panel {
    left: 16px;
    right: 16px;
    width: auto;
    max-height: 76vh;
  }
}
</style>
