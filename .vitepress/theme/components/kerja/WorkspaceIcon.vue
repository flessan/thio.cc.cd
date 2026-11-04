<script setup lang="ts">
/**
 * The workspace icon set: one inline SVG sprite, stroke-based to match the
 * Material 3 line style used across the site. Everything inherits currentColor
 * and scales with font size, so no icon font or network request is needed.
 */
import { computed } from 'vue'

type IconDef = {
  paths?: string[]
  circles?: Array<[number, number, number]>
  /** Some marks (GitHub) read better as a filled silhouette. */
  fill?: boolean
}

const ICONS: Record<string, IconDef> = {
  home: { paths: ['M4 11.5 12 4l8 7.5', 'M6.5 10.5V20h11v-9.5'] },
  today: {
    paths: [
      'M4 6h16v14H4z',
      'M8 4v4M16 4v4M4 10.5h16',
      'M8.5 15l2 2 3.5-4'
    ]
  },
  tasks: {
    paths: ['M4 7h9M4 12h9M4 17h6', 'M16.5 16.5l1.8 1.8 3.2-3.8']
  },
  weather: {
    paths: ['M8.5 18a4.2 4.2 0 0 1 .5-8.4A5.6 5.6 0 0 1 19.5 12a3.4 3.4 0 0 1-.6 6H8.5z'],
    circles: [[7, 7, 2.6]]
  },
  cloud: { paths: ['M7 18a4 4 0 0 1 .6-8A5.5 5.5 0 0 1 18 11a3.5 3.5 0 0 1-.5 7H7z'] },
  search: { paths: ['M16 16l4 4'], circles: [[11, 11, 6.5]] },
  bell: {
    paths: ['M18 16H6l1.5-2V10a4.5 4.5 0 1 1 9 0v4L18 16z', 'M10 19a2 2 0 0 0 4 0']
  },
  check: { paths: ['M5 13l4 4L19 7'] },
  plus: { paths: ['M12 5v14M5 12h14'] },
  close: { paths: ['M6 6l12 12M18 6L6 18'] },
  'chevron-down': { paths: ['M7 10l5 5 5-5'] },
  star: {
    paths: ['M12 3.8l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9-5.2-2.9-5.2 2.9 1.2-5.9L3.6 9.9l5.9-.7z']
  },
  clock: { paths: ['M12 8v4l3 2'], circles: [[12, 12, 8]] },
  alarm: {
    paths: ['M12 7.5v5l3 2', 'M5 4.5 3 7M19 4.5 21 7', 'M5 19l-1.5 1.5M19 19l1.5 1.5'],
    circles: [[12, 13, 7]]
  },
  snooze: { paths: ['M4 12a8 8 0 1 1 2.3 5.7', 'M4 20v-4h4', 'M12 8v4l2.5 1.5'] },
  trash: { paths: ['M5 7h14', 'M9 7V5h6v2', 'M7 7l1 13h8l1-13'] },
  edit: { paths: ['M4 20h4L20 8l-4-4L4 16v4z', 'M14 6l4 4'] },
  external: { paths: ['M7 17L17 7M9 7h8v8'] },
  calendar: { paths: ['M4 6h16v14H4z', 'M8 4v4M16 4v4M4 10.5h16'] },
  'map-pin': { paths: ['M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z'], circles: [[12, 11, 2.2]] },
  refresh: { paths: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v4h-4'] },
  sync: { paths: ['M4 10a8 8 0 0 1 13.5-4.5L20 8', 'M20 4v4h-4', 'M20 14a8 8 0 0 1-13.5 4.5L4 16', 'M4 20v-4h4'] },
  wind: {
    paths: ['M3 8h11a2 2 0 1 0-2-2', 'M3 12h15a2 2 0 1 1-2 2', 'M3 16h8a2 2 0 1 1-2 2']
  },
  humidity: { paths: ['M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z'] },
  eye: {
    paths: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z'],
    circles: [[12, 12, 2.4]]
  },
  umbrella: { paths: ['M3 12a9 9 0 0 1 18 0H3z', 'M12 12v7a2 2 0 0 0 4 0'] },
  warning: { paths: ['M12 4l9 16H3L12 4z', 'M12 10v4M12 17v.5'] },
  info: { paths: ['M12 11v5M12 8v.5'], circles: [[12, 12, 8.5]] },
  lock: { paths: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3'] },
  github: {
    fill: true,
    paths: [
      'M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z'
    ]
  },
  sun: {
    paths: ['M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4'],
    circles: [[12, 12, 4.2]]
  },
  moon: { paths: ['M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z'] },
  layers: {
    paths: ['M12 4l8 4.5-8 4.5-8-4.5L12 4z', 'M4 12.5 12 17l8-4.5', 'M4 16.5 12 21l8-4.5']
  },
  'arrow-left': { paths: ['M19 12H5M11 6l-6 6 6 6'] },
  'arrow-right': { paths: ['M5 12h14M13 6l6 6-6 6'] },
  download: { paths: ['M12 4v11M7.5 11 12 15.5 16.5 11', 'M5 19h14'] },
  shield: { paths: ['M12 3l7 3v6c0 4.2-3 7.5-7 9-4-1.5-7-4.8-7-9V6l7-3z', 'M9 12l2 2 4-4'] },
  sparkle: { paths: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z'] },
  filter: { paths: ['M4 6h16M7 12h10M10 18h4'] },
  list: { paths: ['M8 6h12M8 12h12M8 18h12'], circles: [[4.5, 6, 1], [4.5, 12, 1], [4.5, 18, 1]] },
  database: {
    paths: ['M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z', 'M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3']
  },
  'wifi-off': { paths: ['M3 4l18 16', 'M5 9a14 14 0 0 1 4-2.6', 'M9 13a8 8 0 0 1 3-1.2', 'M12 18v.5'] },
  link: {
    paths: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 7', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5']
  },
  target: { paths: ['M12 3v3M12 18v3M3 12h3M18 12h3'], circles: [[12, 12, 6], [12, 12, 2]] },
  play: { paths: ['M8 5l11 7-11 7V5z'] },
  more: { paths: ['M6 12h.5M12 12h.5M18 12h.5'] },
  'wifi': { paths: ['M4 9a13 13 0 0 1 16 0', 'M7 12.5a8.5 8.5 0 0 1 10 0', 'M10 16a4 4 0 0 1 4 0', 'M12 19v.5'] }
}

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    label?: string
  }>(),
  { size: 24, label: '' }
)

const icon = computed<IconDef>(() => ICONS[props.name] ?? { paths: ['M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z'] })
const size = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="icon.fill ? 'currentColor' : 'none'"
    :stroke="icon.fill ? 'none' : 'currentColor'"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <title v-if="label">{{ label }}</title>
    <circle
      v-for="(circle, index) in icon.circles ?? []"
      :key="`c${index}`"
      :cx="circle[0]"
      :cy="circle[1]"
      :r="circle[2]"
    />
    <path v-for="(path, index) in icon.paths ?? []" :key="`p${index}`" :d="path" />
  </svg>
</template>
