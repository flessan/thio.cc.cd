<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

// WITA (Waktu Indonesia Tengah) is a fixed UTC+8 offset — no DST.
// Computed manually so it also renders consistently during SSR.
const time = ref('')
let timer: ReturnType<typeof setInterval> | undefined

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function tick() {
  const wita = new Date(Date.now() + 8 * 60 * 60 * 1000)
  time.value = `${pad(wita.getUTCHours())}:${pad(wita.getUTCMinutes())}:${pad(wita.getUTCSeconds())}`
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <span class="wita">
    {{ time || '--:--:--' }} <span class="wita-zone">WITA</span>
  </span>
</template>

<style scoped>
.wita {
  font-variant-numeric: tabular-nums;
}

.wita-zone {
  color: var(--flessan-blue);
  font-weight: 700;
  margin-left: 0.2rem;
}
</style>
