<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ENGINES,
  ENGINE_PREFIXES,
  applySettings,
  settings,
  type Engine
} from '../customize'
import { pop } from '../effects'

const props = withDefaults(defineProps<{ compact?: boolean; heading?: string }>(), {
  compact: false,
  heading: ''
})

const query = ref('')
const open = ref(false)
const active = ref(0)
const input = ref<HTMLInputElement | null>(null)
const form = ref<HTMLFormElement | null>(null)
const goButton = ref<HTMLButtonElement | null>(null)

const engine = computed<Engine>(() => ENGINES.find((item) => item.id === settings.value.engine) ?? ENGINES[0])
const narrow = ref(false)
function syncNarrow() {
  if (typeof window !== 'undefined') narrow.value = window.innerWidth < 560
}
onMounted(() => {
  syncNarrow()
  window.addEventListener('resize', syncNarrow, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('resize', syncNarrow))

const placeholder = computed(() =>
  narrow.value
    ? 'Search or paste a link'
    : `Search with ${engine.value.name} — or type a URL`
)

function selectEngine(id: Engine['id']) {
  applySettings({ engine: id })
  open.value = false
  nextTick(() => input.value?.focus())
}

function isUrl(value: string) {
  const text = value.trim()
  if (/^https?:\/\/\S+$/i.test(text)) return true
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text) && !/\s/.test(text)
}

function bang(value: string): { engine: Engine; rest: string } | null {
  const match = value.match(/^!(\w+)\s+(.+)$/)
  if (!match) return null
  const id = ENGINE_PREFIXES[match[1].toLowerCase()]
  if (!id) return null
  const found = ENGINES.find((item) => item.id === id)
  return found ? { engine: found, rest: match[2].trim() } : null
}

function go() {
  const raw = query.value.trim()
  if (!raw) {
    input.value?.focus()
    return
  }

  if (goButton.value) pop(goButton.value)

  const parsed = bang(raw)
  const target = parsed?.engine ?? engine.value
  const term = parsed?.rest ?? raw
  if (!term) return

  if (parsed && parsed.engine.id !== settings.value.engine) {
    applySettings({ engine: parsed.engine.id })
  }

  if (isUrl(term)) {
    const url = /^https?:\/\//i.test(term) ? term : `https://${term}`
    window.open(url, '_blank', 'noopener')
    return
  }

  window.open(`${target.url}${encodeURIComponent(term)}`, '_blank', 'noopener')
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && open.value) {
    event.preventDefault()
    selectEngine(ENGINES[active.value].id)
  } else if (event.key === 'ArrowDown' && open.value) {
    event.preventDefault()
    active.value = (active.value + 1) % ENGINES.length
  } else if (event.key === 'ArrowUp' && open.value) {
    event.preventDefault()
    active.value = (active.value - 1 + ENGINES.length) % ENGINES.length
  } else if (event.key === 'Escape') {
    open.value = false
    input.value?.blur()
  }
}

function onDocumentPointer(event: PointerEvent) {
  if (!open.value) return
  if (form.value && !form.value.contains(event.target as Node)) open.value = false
}

function onDocumentKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(open, (value) => {
  if (value) {
    active.value = Math.max(
      0,
      ENGINES.findIndex((item) => item.id === engine.value.id)
    )
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer)
  document.addEventListener('keydown', onDocumentKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  document.removeEventListener('keydown', onDocumentKey)
})
</script>

<template>
  <div class="dock" :class="{ 'is-compact': props.compact }">
    <p v-if="props.heading" class="dock-heading">{{ props.heading }}</p>

    <form ref="form" class="dock-bar" role="search" @submit.prevent="go">
      <div class="dock-engine-wrap">
        <button
          type="button"
          class="dock-engine"
          :aria-expanded="open"
          aria-haspopup="listbox"
          :aria-label="`Search engine: ${engine.name}. Change engine`"
          @click="open = !open"
        >
          <span class="engine-dot" :style="{ background: engine.color }" aria-hidden="true"></span>
          <span class="engine-name">{{ engine.name }}</span>
          <svg class="engine-chevron" :class="{ 'is-open': open }" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10l5 5 5-5" />
          </svg>
        </button>

        <Transition name="dock-menu">
          <div v-if="open" class="dock-menu" role="listbox" aria-label="Search engines">
            <button
              v-for="(item, index) in ENGINES"
              :key="item.id"
              type="button"
              class="dock-option"
              :class="{ 'is-active': index === active, 'is-selected': item.id === engine.id }"
              role="option"
              :aria-selected="item.id === engine.id"
              @mouseenter="active = index"
              @click="selectEngine(item.id)"
            >
              <span class="engine-dot" :style="{ background: item.color }" aria-hidden="true"></span>
              <span class="option-body">
                <span class="option-name">{{ item.name }}</span>
                <span class="option-hint">{{ item.hint }}</span>
              </span>
              <span v-if="item.id === engine.id" class="option-check" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
              </span>
            </button>
            <p class="dock-menu-note">Saved on this device for every page.</p>
          </div>
        </Transition>
      </div>

      <div class="dock-field">
        <svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4 4" />
        </svg>
        <input
          ref="input"
          v-model="query"
          class="dock-input"
          type="search"
          autocomplete="off"
          spellcheck="false"
          :placeholder="placeholder"
          aria-label="Search the web"
          @keydown="onInputKeydown"
        />
        <span v-if="!props.compact" class="dock-kbd">!bang</span>
      </div>

      <button ref="goButton" type="submit" class="dock-go" aria-label="Search">
        <span class="dock-go-label">Search</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h13M12.5 6.5L19 12l-6.5 5.5" />
        </svg>
      </button>
    </form>

    <div v-if="!props.compact" class="dock-meta">
      <span class="dock-hint">
        <span class="meta-dot" aria-hidden="true"></span>
        {{ engine.hint }}
      </span>
      <span class="dock-engines">{{ ENGINES.length }} engines · !bangs supported</span>
      <a class="dock-workspace" href="/kerja">
        Workspace
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
      </a>
    </div>
  </div>
</template>

<style scoped>
.dock {
  position: relative;
  z-index: 20;
}

.dock-heading {
  margin: 0 0 0.5rem;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.dock-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 6px;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-1);
  transition: box-shadow var(--md-duration-medium) var(--md-ease-standard),
    background-color var(--md-duration-short) var(--md-ease-standard);
}

.dock-bar:hover {
  box-shadow: var(--md-elevation-2);
}

.dock-bar:focus-within {
  background: var(--md-surface-container-highest);
  box-shadow: var(--md-elevation-2), inset 0 0 0 2px var(--md-primary);
}

.dock-engine-wrap {
  position: relative;
  flex: none;
}

.dock-engine {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 44px;
  max-width: 11rem;
  padding: 0 0.9rem;
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

.dock-engine:hover {
  background: color-mix(in srgb, var(--md-secondary-container) 88%, var(--md-on-secondary-container));
}

.engine-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.engine-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.engine-chevron {
  width: 14px;
  height: 14px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--md-duration-medium) var(--md-ease-spring);
}

.engine-chevron.is-open {
  transform: rotate(180deg);
}

.dock-field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
  gap: 0.55rem;
  padding: 0 0.4rem;
}

.field-icon {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--md-on-surface-variant);
  stroke-width: 2;
  stroke-linecap: round;
}

.dock-input {
  width: 100%;
  min-width: 0;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--md-on-surface);
  font-family: inherit;
  font-size: 1rem;
  letter-spacing: 0.15px;
  outline: none;
}

.dock-input::placeholder {
  color: var(--md-on-surface-variant);
  opacity: 1;
}

.dock-input::-webkit-search-cancel-button {
  display: none;
}

.dock-kbd {
  flex: none;
  padding: 0.2rem 0.5rem;
  border-radius: var(--md-shape-full);
  background: color-mix(in srgb, var(--md-on-surface) 9%, transparent);
  color: var(--md-on-surface);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  letter-spacing: 0.2px;
}

.dock-go {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 44px;
  padding: 0 1.15rem;
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

.dock-go:hover {
  background: color-mix(in srgb, var(--md-primary) 90%, var(--md-on-primary));
}

.dock-go:active {
  transform: scale(0.96);
}

.dock-go svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dock-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.9rem;
  margin-top: 0.65rem;
  padding-inline: 0.9rem;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  letter-spacing: 0.2px;
}

.dock-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.meta-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--md-primary);
}

.dock-engines {
  opacity: 0.9;
}

.dock-workspace {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: auto;
  min-height: 28px;
  padding: 0 0.6rem;
  border-radius: var(--md-shape-full);
  color: var(--md-primary);
  font-weight: 500;
  text-decoration: none;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.dock-workspace:hover {
  background: var(--md-primary-container);
}

.dock-workspace svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* --------------------------------------------------------------- menu */
.dock-menu {
  position: absolute;
  z-index: 40;
  top: calc(100% + 8px);
  left: 0;
  width: min(22rem, calc(100vw - 2rem));
  padding: 8px;
  border-radius: var(--md-shape-lg);
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-3);
}

.dock-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-on-surface);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.dock-option.is-active {
  background: color-mix(in srgb, var(--md-on-surface) 8%, transparent);
}

.dock-option.is-selected {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.option-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.05rem;
}

.option-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.option-hint {
  overflow: hidden;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-option.is-selected .option-hint {
  color: color-mix(in srgb, var(--md-on-secondary-container) 75%, transparent);
}

.option-check {
  margin-left: auto;
  color: var(--md-primary);
}

.option-check svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dock-menu-note {
  margin: 6px 0 0;
  padding: 0.5rem 0.65rem 0.2rem;
  border-top: 1px solid var(--md-outline-variant);
  color: var(--md-on-surface-variant);
  font-size: 0.7rem;
}

.dock-menu-enter-active,
.dock-menu-leave-active {
  transition: opacity var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring);
}

.dock-menu-enter-from,
.dock-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.94);
}

/* ------------------------------------------------------------ compact */
.is-compact .dock-bar {
  padding: 4px;
  box-shadow: none;
  background: var(--md-surface-container);
}

.is-compact .dock-engine {
  height: 36px;
  max-width: 9.5rem;
  font-size: 0.78rem;
  padding: 0 0.7rem;
}

.is-compact .dock-input {
  height: 36px;
  font-size: 0.9rem;
}

.is-compact .dock-go {
  height: 36px;
  padding: 0 0.8rem;
}

.is-compact .dock-go-label {
  display: none;
}

@media (max-width: 720px) {
  .dock-kbd {
    display: none;
  }

  .dock-bar {
    gap: 0.25rem;
    padding: 5px;
  }

  .dock-engine {
    max-width: 3rem;
    padding: 0 0.7rem;
  }

  .engine-name {
    display: none;
  }

  .dock-field {
    padding-inline: 0.15rem;
    gap: 0.4rem;
  }

  .dock-input {
    font-size: 0.92rem;
  }

  .dock-go {
    width: 44px;
    padding: 0;
  }

  .dock-go-label {
    display: none;
  }

  .dock-meta {
    padding-inline: 0.5rem;
    font-size: 0.68rem;
  }

  .dock-engines {
    display: none;
  }

  .dock-workspace {
    margin-left: 0;
  }

  .dock-menu {
    left: -4px;
  }
}
</style>
