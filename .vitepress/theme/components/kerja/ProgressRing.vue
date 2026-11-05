<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    ratio: number
    size?: number
    label?: string
    /** Accessible description of what the ring measures. */
    ariaLabel?: string
  }>(),
  { size: 74, label: '', ariaLabel: 'Progress' }
)

const radius = 30
const circumference = 2 * Math.PI * radius
const safeRatio = computed(() => Math.max(0, Math.min(1, props.ratio || 0)))
const offset = computed(() => circumference * (1 - safeRatio.value))
const percent = computed(() => Math.round(safeRatio.value * 100))
</script>

<template>
  <div
    class="kw-ring"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="`${ariaLabel}: ${percent}%`"
  >
    <svg viewBox="0 0 72 72">
      <circle class="kw-ring-track" cx="36" cy="36" :r="radius" />
      <circle
        class="kw-ring-value"
        cx="36"
        cy="36"
        :r="radius"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
      />
    </svg>
    <span class="kw-ring-label">{{ label || `${percent}%` }}</span>
  </div>
</template>
