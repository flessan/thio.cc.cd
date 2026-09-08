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
    // clipboard API unavailable (e.g. plain http) — textarea fallback
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
  <button class="copy-btn" type="button" :title="`Copy: ${text}`" @click="copy">
    <span v-if="!copied">{{ label }}</span>
    <span v-else>Copied ✓</span>
  </button>
</template>

<style scoped>
.copy-btn {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border-radius: 8px;
  padding: 0.15rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.7;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  vertical-align: middle;
  margin-left: 0.4rem;
}

.copy-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.copy-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
