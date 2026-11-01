<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{ text: string; label?: string }>(), {
  label: 'Copy'
})

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  let ok = false
  try {
    await navigator.clipboard.writeText(props.text)
    ok = true
  } catch {
    // clipboard API unavailable (e.g. plain http) - textarea fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = props.text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ok = document.execCommand('copy')
      ta.remove()
    } catch {
      ok = false
    }
  }
  if (ok) {
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 2000)
  }
}
</script>

<template>
  <button
    class="copy-btn"
    :class="{ 'is-copied': copied }"
    type="button"
    :title="`Copy: ${text}`"
    @click="copy"
  >
    <span v-if="!copied">{{ label }}</span>
    <span v-else>Copied ✓</span>
  </button>
</template>

<style scoped>
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 22px;
  margin-left: 0.35rem;
  padding: 0 0.6rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  font-family: inherit;
  font-size: 0.71rem;
  font-weight: 500;
  line-height: 1.4;
  vertical-align: middle;
  cursor: pointer;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-short) var(--md-ease-spring);
}

.copy-btn:hover {
  background: color-mix(in srgb, var(--md-secondary-container) 82%, var(--md-on-secondary-container));
  transform: translateY(-1px);
}

.copy-btn:active {
  transform: scale(0.96);
}

.copy-btn.is-copied {
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.copy-btn:focus-visible {
  outline: 2px solid var(--md-primary);
  outline-offset: 2px;
}
</style>
