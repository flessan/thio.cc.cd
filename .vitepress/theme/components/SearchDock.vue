<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ENGINES,
  ENGINE_MAP,
  ENGINE_PREFIXES,
  applySettings,
  settings,
  type EngineId
} from '../customize'
import { confetti, motionLevel, pop } from '../effects'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    heading?: string
  }>(),
  { compact: false, heading: 'Search the web' }
)

// Start from the deterministic default so SSR and hydration agree, then adopt
// the saved choice once we are on the client.
const engineId = ref<EngineId>('duckduckgo')
const query = ref('')
const input = ref<HTMLInputElement | null>(null)
const form = ref<HTMLFormElement | null>(null)

onMounted(() => {
  engineId.value = settings.value.engine
})

watch(
  () => settings.value.engine,
  (next) => {
    engineId.value = next
  }
)

const engine = computed(() => ENGINE_MAP[engineId.value] ?? ENGINE_MAP.duckduckgo)

const placeholder = computed(() =>
  engine.value.id === 'youtube'
    ? 'Search YouTube…'
    : engine.value.id === 'github'
      ? 'Search repos, issues, people…'
      : engine.value.id === 'npm'
        ? 'Search packages…'
        : `Search ${engine.value.name}…`
)

function choose(id: EngineId, event?: Event) {
  if (id === engineId.value) return
  engineId.value = id
  applySettings({ engine: id })
  pop(event?.currentTarget as HTMLElement | undefined)
  if (!props.compact) input.value?.focus({ preventScroll: true })
}

/** `!ddg anime` switches engine as you type, then searches. */
function resolvePrefix(value: string): { engine: EngineId; text: string } {
  const match = value.match(/^\s*(!\w+)\s+([\s\S]+)$/)
  if (match) {
    const mapped = ENGINE_PREFIXES[match[1].toLowerCase()]
    if (mapped) return { engine: mapped, text: match[2].trim() }
  }
  return { engine: engineId.value, text: value.trim() }
}

function open(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function submit() {
  const { engine: mapped, text } = resolvePrefix(query.value)
  if (!text) {
    input.value?.focus()
    return
  }
  if (mapped !== engineId.value) {
    engineId.value = mapped
    applySettings({ engine: mapped })
  }
  const target = ENGINE_MAP[mapped]
  open(`${target.url}${encodeURIComponent(text)}`)

  if (motionLevel() === 'playful' && form.value) {
    const rect = form.value.getBoundingClientRect()
    confetti(rect.left + rect.width - 42, rect.top + rect.height / 2, 16)
  }
  query.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    submit()
  } else if (event.key === 'Escape') {
    query.value = ''
  }
}
</script>

<template>
  <section
    class="search-dock"
    :class="{ 'is-compact': compact }"
    aria-label="Web search with a choice of engines"
  >
    <div class="dock-head">
      <div class="dock-title">
        <span class="dock-star" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
          </svg>
        </span>
        <div>
          <h2>{{ heading }}</h2>
          <p v-if="!compact" class="dock-sub">
            Pick an engine, type a question. The site remembers your choice —
            <span class="dock-hint-inline">{{ engine.hint }}</span>
          </p>
        </div>
      </div>
      <span v-if="!compact" class="dock-count">{{ ENGINES.length }} engines</span>
    </div>

    <div class="dock-engines" role="group" aria-label="Search engine">
      <button
        v-for="option in ENGINES"
        :key="option.id"
        type="button"
        class="engine-chip"
        :class="{ active: option.id === engineId }"
        :aria-pressed="option.id === engineId"
        :title="`${option.name} — ${option.hint}`"
        @click="choose(option.id, $event)"
      >
        <span
          class="engine-badge"
          :style="{ background: option.color, color: option.ink }"
          aria-hidden="true"
          >{{ option.short }}</span
        >
        <span class="engine-name">{{ option.name }}</span>
      </button>
    </div>

    <form ref="form" class="dock-form" role="search" @submit.prevent="submit">
      <label class="sr-only" for="dock-query">Search query</label>
      <div class="dock-field">
        <svg class="dock-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.4" />
          <path d="M16 16l4.4 4.4" />
        </svg>
        <input
          id="dock-query"
          ref="input"
          v-model="query"
          type="search"
          autocomplete="off"
          spellcheck="false"
          :placeholder="placeholder"
          @keydown="onKeydown"
        />
        <span class="dock-key" aria-hidden="true">↵</span>
      </div>
      <button class="dock-submit" type="submit">
        <span>Search</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>

    <p v-if="!compact" class="dock-foot">
      <span><kbd>!</kbd> shorthand: <code>!ddg</code> <code>!gh</code>
        <code>!yt</code> <code>!k</code></span>
      <span class="dock-foot-sep" aria-hidden="true">·</span>
      <span>opens in a new tab</span>
    </p>
    <p v-else class="dock-foot dock-foot-compact">
      <span>current: <strong>{{ engine.name }}</strong></span>
    </p>
  </section>
</template>

<style scoped>
.search-dock {
  position: relative;
  padding: clamp(1rem, 2.4vw, 1.4rem);
  border: 2px solid var(--fl-ink);
  border-radius: var(--flessan-radius-lg);
  background: var(--vp-c-bg-elv);
  box-shadow: 6px 6px 0 var(--fl-ink);
}

.search-dock::after {
  content: '';
  position: absolute;
  top: -0.7rem;
  right: 2.2rem;
  width: 4.5rem;
  height: 1.15rem;
  background: var(--fl-tape);
  border: 2px solid var(--fl-ink);
  transform: rotate(3deg);
}

.dock-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dock-title {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}

.dock-star {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--fl-ink);
  border-radius: 9px;
  background: var(--fl-accent);
  transform: rotate(-6deg);
}

.dock-star svg {
  width: 15px;
  height: 15px;
  fill: var(--fl-on-accent);
}

.dock-title h2 {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--vp-c-text-1);
}

/* Reset the global .vp-doc h2 decoration inside this card. */
.dock-title h2::after {
  content: none;
  display: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.dock-sub {
  margin: 0.2rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  line-height: 1.45;
}

.dock-hint-inline {
  color: var(--fl-accent-ink);
  font-weight: 650;
}

.dock-count {
  flex: 0 0 auto;
  padding: 0.2rem 0.5rem;
  border: 2px solid var(--fl-ink);
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.dock-engines {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.9rem 0 0.8rem;
}

.engine-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.05rem;
  padding: 0.22rem 0.6rem 0.22rem 0.24rem;
  border: 2px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease,
    transform 140ms var(--flessan-ease-out);
}

.engine-chip:hover {
  border-color: var(--fl-ink);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  transform: translateY(-1px);
}

.engine-chip.active {
  border-color: var(--fl-ink);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  box-shadow: 2px 2px 0 var(--fl-ink);
}

.engine-badge {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.22rem;
  border: 1.5px solid var(--fl-ink);
  border-radius: 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}

.engine-name {
  white-space: nowrap;
}

.dock-form {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.dock-field {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 2.9rem;
  padding: 0 0.7rem;
  border: 2px solid var(--fl-ink);
  border-radius: var(--flessan-radius-md);
  background: var(--vp-c-bg);
  transition: box-shadow 160ms ease, background-color 160ms ease;
}

.dock-field:focus-within {
  background: var(--vp-c-bg-elv);
  box-shadow: 3px 3px 0 var(--fl-accent);
}

.dock-search-icon {
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  fill: none;
  stroke: var(--vp-c-text-2);
  stroke-width: 2;
  stroke-linecap: round;
}

.dock-field input {
  flex: 1 1 auto;
  min-width: 0;
  height: 2.6rem;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.92rem;
}

.dock-field input::placeholder {
  color: var(--vp-c-text-3);
}

.dock-field input::-webkit-search-cancel-button {
  cursor: pointer;
}

.dock-key {
  flex: 0 0 auto;
  padding: 0.1rem 0.35rem;
  border: 1.5px solid var(--vp-c-border);
  border-radius: 5px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
}

.dock-submit {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  min-height: 2.9rem;
  padding: 0 1rem;
  border: 2px solid var(--fl-ink);
  border-radius: var(--flessan-radius-md);
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--fl-ink);
  transition:
    transform 140ms var(--flessan-ease-out),
    box-shadow 140ms var(--flessan-ease-out);
}

.dock-submit:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--fl-ink);
}

.dock-submit:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--fl-ink);
}

.dock-submit svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dock-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin: 0.75rem 0 0;
  color: var(--vp-c-text-3);
  font-size: 0.72rem;
}

.dock-foot code {
  padding: 0.05rem 0.28rem;
  border: 1.5px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-size: 0.68rem;
}

.dock-foot kbd {
  padding: 0.02rem 0.28rem;
  border: 1.5px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
}

.dock-foot-sep {
  opacity: 0.6;
}

/* Compact variant used inside the playground panel */
.search-dock.is-compact {
  padding: 0.8rem;
  box-shadow: none;
  border-radius: var(--flessan-radius-md);
  background: var(--vp-c-bg);
}

.search-dock.is-compact::after {
  display: none;
}

.is-compact .dock-title h2 {
  font-size: 0.88rem;
}

.is-compact .dock-star {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 7px;
}

.is-compact .dock-engines {
  margin: 0.6rem 0;
  gap: 0.3rem;
}

.is-compact .engine-chip {
  font-size: 0.7rem;
  min-height: 1.8rem;
}

.is-compact .engine-badge {
  min-width: 1.3rem;
  height: 1.3rem;
  font-size: 0.54rem;
}

.is-compact .dock-form {
  flex-direction: column;
}

.is-compact .dock-submit {
  justify-content: center;
  min-height: 2.4rem;
}

.is-compact .dock-foot {
  margin-top: 0.55rem;
}

@media (max-width: 620px) {
  .search-dock {
    box-shadow: 4px 4px 0 var(--fl-ink);
  }

  .search-dock::after {
    display: none;
  }

  .dock-form {
    flex-direction: column;
  }

  .dock-submit {
    justify-content: center;
  }

  .dock-engines {
    gap: 0.3rem;
  }

  .engine-chip {
    min-height: 1.95rem;
    padding-right: 0.5rem;
    font-size: 0.74rem;
  }

  .dock-count {
    display: none;
  }

}
</style>
