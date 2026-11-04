<script setup lang="ts">
/** Inline weather glyphs; no external icon requests, works offline. */
import { computed } from 'vue'
import type { WeatherKind } from '../../kerja/bmkg'

const props = withDefaults(defineProps<{ kind: WeatherKind; size?: number | string }>(), {
  size: 28
})

const size = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="kind === 'clear'">
      <circle cx="24" cy="24" r="8" fill="currentColor" fill-opacity="0.14" />
      <path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M36.7 11.3l-3.5 3.5M14.8 33.2l-3.5 3.5" />
    </template>

    <template v-else-if="kind === 'partly'">
      <circle cx="18" cy="17" r="6" fill="currentColor" fill-opacity="0.14" />
      <path d="M18 6v3M7 17h3M10.5 9.5l2 2M25.5 9.5l-2 2" />
      <path d="M17 35a6.5 6.5 0 0 1 1-12.9A8.8 8.8 0 0 1 35 26a5.3 5.3 0 0 1-.9 9H17z" fill="currentColor" fill-opacity="0.08" />
    </template>

    <template v-else-if="kind === 'cloudy'">
      <path d="M17 35a6.5 6.5 0 0 1 1-12.9A8.8 8.8 0 0 1 35 26a5.3 5.3 0 0 1-.9 9H17z" fill="currentColor" fill-opacity="0.08" />
    </template>

    <template v-else-if="kind === 'overcast'">
      <path d="M14 31a5.5 5.5 0 0 1 .9-10.9A7.5 7.5 0 0 1 29 23a4.5 4.5 0 0 1-.7 8H14z" fill="currentColor" fill-opacity="0.14" />
      <path d="M20 37a5 5 0 0 1 .8-9.9A6.8 6.8 0 0 1 33 30a4 4 0 0 1-.6 7H20z" fill="currentColor" fill-opacity="0.2" />
    </template>

    <template v-else-if="kind === 'rain' || kind === 'heavy-rain'">
      <path d="M17 29a6.5 6.5 0 0 1 1-12.9A8.8 8.8 0 0 1 35 20a5.3 5.3 0 0 1-.9 9H17z" fill="currentColor" fill-opacity="0.08" />
      <path v-if="kind === 'rain'" d="M17 34l-2 4M25 34l-2 4M33 34l-2 4" />
      <path v-else d="M16 34l-3 6M24 34l-3 6M32 34l-3 6M38 34l-2 4" />
    </template>

    <template v-else-if="kind === 'storm'">
      <path d="M17 28a6.5 6.5 0 0 1 1-12.9A8.8 8.8 0 0 1 35 19a5.3 5.3 0 0 1-.9 9H17z" fill="currentColor" fill-opacity="0.08" />
      <path d="M25 32l-5 8h5l-2 6 8-9h-5l2-5z" fill="currentColor" fill-opacity="0.2" />
    </template>

    <template v-else-if="kind === 'fog'">
      <path d="M17 28a6.5 6.5 0 0 1 1-12.9A8.8 8.8 0 0 1 35 19a5.3 5.3 0 0 1-.9 9H17z" fill="currentColor" fill-opacity="0.08" />
      <path d="M10 34h28M14 39h20" />
    </template>

    <template v-else-if="kind === 'haze'">
      <circle cx="24" cy="22" r="7" fill="currentColor" fill-opacity="0.16" />
      <path d="M9 32h30M13 37h22M16 42h16" />
    </template>

    <template v-else>
      <circle cx="24" cy="24" r="9" fill="currentColor" fill-opacity="0.12" />
      <path d="M20 27a2 2 0 0 1 4 0" />
    </template>
  </svg>
</template>
