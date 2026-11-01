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
const placeholder = computed(() => `Search with ${engine.value.name} — or type a URL`)

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
        <kbd v-if="!props.compact" class="dock-kbd">!</kbd>
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
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.dock-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 5px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--flessan-shadow-sm);
  transition: border-color 180ms ease, box-shadow 220ms var(--flessan-ease-out);
}

.dock-bar:focus-within {
  border-color: var(--fl-accent);
  box-shadow: 0 0 0 3px var(--fl-accent-soft), var(--flessan-shadow-sm);
}

.dock-engine-wrap {
  position: relative;
  flex: none;
}

.dock-engine {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.35rem;
  max-width: 10.5rem;
  padding: 0 0.55rem 0 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: calc(var(--fl-r-md) - 4px);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease;
}

.dock-engine:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
}

.engine-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset;
}

.engine-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.engine-chevron {
  width: 13px;
  height: 13px;
  flex: none;
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 180ms var(--flessan-ease-out);
}

.engine-chevron.is-open {
  transform: rotate(180deg);
}

.dock-field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
  gap: 0.5rem;
  padding: 0 0.6rem;
}

.field-icon {
  flex: none;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 1.7;
  stroke-linecap: round;
}

.dock-input {
  width: 100%;
  min-width: 0;
  height: 2.35rem;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-1);
  font-family: inherit;
  font-size: 0.92rem;
  outline: none;
}

.dock-input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 1;
}

.dock-input::-webkit-search-cancel-button {
  display: none;
}

.dock-kbd {
  flex: none;
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  line-height: 1;
}

.dock-go {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.35rem;
  height: 2.35rem;
  padding: 0 0.85rem;
  border: 1px solid transparent;
  border-radius: calc(var(--fl-r-md) - 4px);
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 160ms ease, transform 180ms var(--flessan-ease-out);
}

.dock-go:hover {
  background: var(--fl-accent-hover);
}

.dock-go:active {
  transform: scale(0.98);
}

.dock-go svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dock-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-top: 0.6rem;
  padding-inline: 0.15rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  letter-spacing: 0.01em;
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
  background: var(--fl-accent);
}

.dock-engines {
  letter-spacing: 0.02em;
}

.dock-workspace {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-weight: 500;
  text-decoration: none;
  transition: color 150ms ease;
}

.dock-workspace:hover {
  color: var(--fl-accent-ink);
}

.dock-workspace svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

/* --------------------------------------------------------------- menu */
.dock-menu {
  position: absolute;
  z-index: 40;
  top: calc(100% + 8px);
  left: 0;
  width: min(21rem, calc(100vw - 2.5rem));
  padding: 5px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--flessan-shadow-lg);
}

.dock-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: 0;
  border-radius: calc(var(--fl-r-md) - 5px);
  background: transparent;
  color: var(--vp-c-text-1);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.dock-option.is-active {
  background: var(--vp-c-bg-alt);
}

.option-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.05rem;
}

.option-name {
  font-size: 0.83rem;
  font-weight: 550;
}

.option-hint {
  overflow: hidden;
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-check {
  margin-left: auto;
  color: var(--fl-accent-ink);
}

.option-check svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dock-menu-note {
  margin: 0;
  padding: 0.4rem 0.55rem 0.3rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.63rem;
}

.dock-menu-enter-active,
.dock-menu-leave-active {
  transition: opacity 140ms ease, transform 160ms var(--flessan-ease-out);
}

.dock-menu-enter-from,
.dock-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}

/* ------------------------------------------------------------ compact */
.is-compact .dock-bar {
  padding: 4px;
}

.is-compact .dock-engine {
  height: 2.1rem;
  max-width: 9rem;
  font-size: 0.76rem;
}

.is-compact .dock-input {
  height: 2.1rem;
  font-size: 0.86rem;
}

.is-compact .dock-go {
  height: 2.1rem;
  padding: 0 0.7rem;
}

.is-compact .dock-go-label {
  display: none;
}

@media (max-width: 720px) {
  .dock-kbd {
    display: none;
  }

  .dock-engine {
    max-width: 3rem;
    padding-inline: 0.55rem;
  }

  .engine-name {
    display: none;
  }

  .dock-field {
    padding-inline: 0.45rem;
    gap: 0.4rem;
  }

  .dock-input {
    font-size: 0.88rem;
  }

  .dock-go {
    padding: 0 0.65rem;
  }

  .dock-go-label {
    display: none;
  }

  .dock-meta {
    font-size: 0.62rem;
  }

  .dock-engines {
    display: none;
  }

  .dock-workspace {
    margin-left: 0;
  }

  .dock-menu {
    left: -5px;
  }
}
</style>
