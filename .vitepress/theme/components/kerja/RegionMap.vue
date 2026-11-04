<script setup lang="ts">
/**
 * A self-contained atlas of Indonesia for the weather location picker.
 *
 * Leaflet is loaded lazily only when the map is actually shown. The base map is
 * drawn from the bundled cahyadsn/wilayah province polygons — no third-party
 * tile requests by default. The "Street map" button is the explicit opt-in that
 * adds OpenStreetMap raster tiles (with attribution) for people who want a
 * familiar basemap.
 *
 * Dots are the BMKG forecast points (one representative desa per kabupaten/kota),
 * sized by population from the same MIT-licensed region dataset. Clicking a dot
 * chooses that forecast point; clicking a province filters the list.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type {
  CircleMarker,
  Control,
  GeoJSON as LeafletGeoJSON,
  LatLngBoundsExpression,
  Map as LeafletMap,
  Path,
  PathOptions,
  Polyline,
  TileLayer
} from 'leaflet'
import type { BmkgLocationEntry } from '../../kerja/bmkg'
import {
  ISLANDS,
  formatArea,
  formatPopulation,
  islandColour,
  shortRegionName
} from '../../kerja/region'
import { isDark } from '../../kerja/appearance'
import { prefersReducedMotion } from '../../effects'

interface ProvinceProperties {
  code: string
  name: string
  island: string
  capital: string
  population: number
}

interface ProvinceFeature {
  type: 'Feature'
  properties: ProvinceProperties
  geometry: { type: string; coordinates: unknown }
}

interface ProvinceCollection {
  type: 'FeatureCollection'
  features: ProvinceFeature[]
}

type Hover =
  | { kind: 'city'; entry: BmkgLocationEntry }
  | { kind: 'province'; code: string; name: string; capital: string; population: number }
  | null

const props = withDefaults(
  defineProps<{
    entries: BmkgLocationEntry[]
    selectedAdm4?: string | null
    matchedAdm4s?: string[]
    focusProvince?: string | null
    height?: number
  }>(),
  {
    selectedAdm4: null,
    matchedAdm4s: () => [],
    focusProvince: null,
    height: 330
  }
)

const emit = defineEmits<{
  pick: [entry: BmkgLocationEntry]
  province: [code: string | null]
}>()

const host = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const provinceWarning = ref('')
const hover = ref<Hover>(null)
const streetMap = ref(false)
const legendOpen = ref(false)
const zoom = ref(3)

const map = shallowRef<LeafletMap | null>(null)
const leaflet = shallowRef<typeof import('leaflet') | null>(null)
const provinceLayer = shallowRef<LeafletGeoJSON | null>(null)
const gridLayer = shallowRef<Polyline | null>(null)
const tileLayer = shallowRef<TileLayer | null>(null)
const provinceFeatures = shallowRef<ProvinceFeature[]>([])
const markers = new Map<string, CircleMarker>()
const entryByAdm4 = new Map<string, BmkgLocationEntry>()
let sizeObserver: ResizeObserver | null = null
let destroyed = false

const BOUNDS: LatLngBoundsExpression = [
  [94.5, -11.6],
  [141.6, 6.4]
]

const hoverInfo = computed(() => {
  if (!hover.value) return null
  if (hover.value.kind === 'city') {
    const entry = hover.value.entry
    return {
      title: shortRegionName(entry.name),
      kind: entry.kind === 'kota' ? 'Kota' : 'Kabupaten',
      province: entry.province,
      detail: [formatPopulation(entry.population), formatArea(entry.areaKm2)]
        .filter(Boolean)
        .join(' · '),
      hint: 'Click to use this forecast point'
    }
  }
  const province = hover.value
  return {
    title: province.name,
    kind: 'Provinsi',
    province: province.capital ? `Capital ${province.capital}` : '',
    detail: formatPopulation(province.population),
    hint: 'Click to filter the list to this province'
  }
})

function palette() {
  return isDark.value
    ? {
        ocean: '#0d161c',
        grid: '#1d303c',
        line: '#3c5968',
        dot: '#9fc3d6',
        dim: '#5d7a89',
        surface: '#0d161c'
      }
    : {
        ocean: '#eaf3f4',
        grid: '#d6e5e7',
        line: '#a9c1bd',
        dot: '#4f6b78',
        dim: '#8aa2ad',
        surface: '#f8fbfb'
      }
}

function accent(): string {
  if (typeof window === 'undefined') return '#6750a4'
  const value = getComputedStyle(document.documentElement).getPropertyValue('--md-primary').trim()
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : '#6750a4'
}

function radiusFor(entry: BmkgLocationEntry): number {
  const population = entry.population ?? 0
  return Math.min(7.5, 2.8 + Math.sqrt(population) / 620)
}

function markerStyle(entry: BmkgLocationEntry): PathOptions & { radius?: number } {
  const matched = props.matchedAdm4s.includes(entry.adm4)
  const selected = entry.adm4 === props.selectedAdm4
  const dim = props.matchedAdm4s.length > 0 && !matched && !selected
  const colors = palette()
  if (selected) {
    return {
      radius: radiusFor(entry) + 2.6,
      color: colors.surface,
      weight: 2,
      fillColor: accent(),
      fillOpacity: 1,
      bubblingMouseEvents: false
    }
  }
  if (matched) {
    return {
      radius: radiusFor(entry) + 0.8,
      color: accent(),
      weight: 1,
      fillColor: accent(),
      fillOpacity: 0.95,
      bubblingMouseEvents: false
    }
  }
  return {
    radius: radiusFor(entry),
    color: colors.ocean,
    weight: 0.6,
    fillColor: dim ? colors.dim : colors.dot,
    fillOpacity: dim ? 0.35 : 0.7,
    bubblingMouseEvents: false
  }
}

function provinceStyle(feature: ProvinceFeature, hovered = false, focused = false): PathOptions {
  const colors = palette()
  const fill = streetMap.value ? 0 : focused ? 0.16 : hovered ? 0.32 : 0.26
  return {
    color: focused ? accent() : colors.line,
    weight: focused ? 2.2 : hovered ? 1.8 : 0.8,
    opacity: streetMap.value ? 0.55 : 0.9,
    fillColor: islandColour(feature.properties.island),
    fillOpacity: fill,
    bubblingMouseEvents: false
  }
}

function restyleMarker(adm4: string) {
  const marker = markers.get(adm4)
  const entry = entryByAdm4.get(adm4)
  if (!marker || !entry) return
  const style = markerStyle(entry)
  marker.setStyle(style)
  marker.setRadius(style.radius ?? radiusFor(entry))
}

function restyleMarkers() {
  for (const adm4 of markers.keys()) restyleMarker(adm4)
}

function restyleProvinces() {
  provinceLayer.value?.setStyle((feature) => {
    const typed = feature as unknown as ProvinceFeature
    return provinceStyle(typed, false, typed.properties.code === props.focusProvince)
  })
}

function fitCountry() {
  map.value?.fitBounds(BOUNDS, {
    padding: [8, 8],
    animate: !prefersReducedMotion(),
    duration: 0.4
  })
}

function boundsForProvince(code: string): LatLngBoundsExpression | null {
  const feature = provinceFeatures.value.find((item) => item.properties.code === code)
  if (!feature) return null
  const points: Array<[number, number]> = []
  const walk = (value: unknown) => {
    if (!Array.isArray(value)) return
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      points.push([value[1], value[0]])
      return
    }
    value.forEach(walk)
  }
  walk(feature.geometry.coordinates)
  if (!points.length) return null
  const lats = points.map((point) => point[0])
  const lngs = points.map((point) => point[1])
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  ]
}

function focusProvince(code: string | null) {
  const instance = map.value
  if (!instance) return
  if (!code) {
    fitCountry()
    return
  }
  const bounds = boundsForProvince(code)
  if (!bounds) return
  instance.fitBounds(bounds, {
    padding: [26, 26],
    maxZoom: 6.5,
    animate: !prefersReducedMotion(),
    duration: 0.45
  })
}

function applyStreetMap() {
  const L = leaflet.value
  const instance = map.value
  if (!L || !instance) return
  if (streetMap.value) {
    if (!tileLayer.value) {
      tileLayer.value = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
        crossOrigin: true
      })
    }
    tileLayer.value.addTo(instance)
    gridLayer.value?.remove()
  } else {
    tileLayer.value?.remove()
    if (gridLayer.value && !instance.hasLayer(gridLayer.value)) gridLayer.value.addTo(instance)
  }
  restyleProvinces()
  restyleMarkers()
}

function resetView() {
  streetMap.value = false
  applyStreetMap()
  focusProvince(null)
}

function toggleStreetMap() {
  streetMap.value = !streetMap.value
  applyStreetMap()
}

function drawMarkers() {
  const L = leaflet.value
  const instance = map.value
  if (!L || !instance) return

  for (const marker of markers.values()) marker.remove()
  markers.clear()
  entryByAdm4.clear()

  for (const entry of props.entries) {
    if (typeof entry.lat !== 'number' || typeof entry.lon !== 'number') continue
    if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lon)) continue
    entryByAdm4.set(entry.adm4, entry)
    const marker = L.circleMarker([entry.lat, entry.lon], markerStyle(entry))
    marker.bindTooltip(shortRegionName(entry.name), {
      direction: 'top',
      className: 'kw-map-tip',
      offset: [0, -2]
    })
    marker.on('click', () => emit('pick', entry))
    marker.on('mouseover', () => {
      hover.value = { kind: 'city', entry }
      marker.setStyle({ weight: 2.2, color: palette().surface })
    })
    marker.on('mouseout', () => {
      if (hover.value?.kind === 'city' && hover.value.entry.adm4 === entry.adm4) hover.value = null
      marker.setStyle(markerStyle(entry))
    })
    marker.addTo(instance)
    markers.set(entry.adm4, marker)
  }
}

function drawProvinces(collection: ProvinceCollection) {
  const L = leaflet.value
  const instance = map.value
  if (!L || !instance) return

  provinceFeatures.value = collection.features
  provinceLayer.value = L.geoJSON(collection as never, {
    style: (feature) => provinceStyle(feature as unknown as ProvinceFeature),
    onEachFeature: (feature, layer) => {
      const typed = feature as unknown as ProvinceFeature
      const code = typed.properties.code
      const path = layer as Path
      path.bindTooltip(typed.properties.name, {
        sticky: true,
        direction: 'auto',
        className: 'kw-map-tip'
      })
      path.on('mouseover', () => {
        hover.value = {
          kind: 'province',
          code,
          name: typed.properties.name,
          capital: typed.properties.capital,
          population: typed.properties.population
        }
        path.setStyle(provinceStyle(typed, true, code === props.focusProvince))
      })
      path.on('mouseout', () => {
        if (hover.value?.kind === 'province' && hover.value.code === code) hover.value = null
        path.setStyle(provinceStyle(typed, false, code === props.focusProvince))
      })
      path.on('click', () => emit('province', code))
    }
  }).addTo(instance)
  provinceLayer.value.bringToBack()
}

function drawGrid() {
  const L = leaflet.value
  const instance = map.value
  if (!L || !instance) return
  const lines: Array<Array<[number, number]>> = []
  for (let lat = -10; lat <= 10; lat += 5) {
    lines.push([
      [lat, 94],
      [lat, 142]
    ])
  }
  for (let lng = 95; lng <= 140; lng += 5) {
    lines.push([
      [-12, lng],
      [7, lng]
    ])
  }
  gridLayer.value = L.polyline(lines, {
    color: palette().grid,
    weight: 0.6,
    opacity: 0.7,
    interactive: false
  }).addTo(instance)
}

async function loadProvinces(): Promise<ProvinceCollection | null> {
  try {
    const base = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${base}geo/indonesia-provinces.geojson`, { cache: 'force-cache' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as ProvinceCollection
  } catch {
    provinceWarning.value = 'Province outlines could not be loaded; the points still work.'
    return null
  }
}

async function init() {
  if (destroyed || !host.value) return
  if (typeof window === 'undefined') return
  if (host.value.clientWidth < 40) return

  status.value = 'loading'
  errorMessage.value = ''
  try {
    const [module] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
    const L = ((module as unknown as { default?: typeof import('leaflet') }).default ??
      module) as typeof import('leaflet')
    if (destroyed || !host.value) return
    leaflet.value = L

    const instance = L.map(host.value, {
      attributionControl: false,
      zoomControl: false,
      minZoom: 3,
      maxZoom: 10,
      maxBounds: [
        [-18, 88],
        [14, 150]
      ],
      maxBoundsViscosity: 0.55,
      worldCopyJump: false,
      preferCanvas: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      scrollWheelZoom: false,
      touchZoom: true,
      doubleClickZoom: true
    })
    map.value = instance
    instance.fitBounds(BOUNDS, { padding: [8, 8], animate: false })

    drawGrid()
    const collection = await loadProvinces()
    if (destroyed) return
    if (collection) drawProvinces(collection)
    drawMarkers()

    L.control.zoom({ position: 'bottomright' }).addTo(instance)
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 80 }).addTo(instance)

    instance.on('zoomend', () => {
      zoom.value = instance.getZoom()
    })
    instance.on('click', () => emit('province', null))

    status.value = 'ready'
    if (props.focusProvince) focusProvince(props.focusProvince)
  } catch (error) {
    status.value = 'error'
    errorMessage.value =
      error instanceof Error ? error.message : 'The map library could not be loaded.'
  }
}

function watchSize() {
  if (typeof ResizeObserver === 'undefined' || !host.value) return
  sizeObserver = new ResizeObserver(() => {
    if (map.value) {
      map.value.invalidateSize()
      return
    }
    if (status.value !== 'error' && host.value && host.value.clientWidth >= 40) void init()
  })
  sizeObserver.observe(host.value)
}

let lastMatched = new Set<string>()

watch(
  () => props.matchedAdm4s,
  (next) => {
    const nextSet = new Set(next)
    for (const adm4 of new Set([...nextSet, ...lastMatched])) restyleMarker(adm4)
    lastMatched = nextSet
  }
)

watch(
  () => props.selectedAdm4,
  (adm4) => {
    restyleMarkers()
    const entry = adm4 ? entryByAdm4.get(adm4) : null
    if (entry && typeof entry.lat === 'number' && typeof entry.lon === 'number') {
      map.value?.panInside([entry.lat, entry.lon], {
        padding: [48, 48],
        animate: !prefersReducedMotion()
      })
    }
  }
)

watch(
  () => props.focusProvince,
  (code) => {
    restyleProvinces()
    focusProvince(code ?? null)
  }
)

watch(isDark, () => {
  restyleProvinces()
  restyleMarkers()
  gridLayer.value?.setStyle({ color: palette().grid })
})

watch(
  () => props.entries,
  () => {
    if (status.value === 'ready') drawMarkers()
  }
)

onMounted(() => {
  watchSize()
  void init()
})

onBeforeUnmount(() => {
  destroyed = true
  sizeObserver?.disconnect()
  sizeObserver = null
  map.value?.remove()
  map.value = null
  markers.clear()
  entryByAdm4.clear()
})
</script>

<template>
  <div
    class="kw-map"
    :style="{ height: `${height}px`, background: palette().ocean }"
    :data-status="status"
  >
    <div
      ref="host"
      class="kw-map-canvas"
      role="region"
      aria-label="Map of Indonesia. Each dot is a BMKG forecast point. The same locations are listed next to the map."
    />

    <div v-if="status === 'loading'" class="kw-map-placeholder">
      <span class="kw-map-spinner" aria-hidden="true" />
      <p>Drawing the archipelago…</p>
    </div>

    <div v-else-if="status === 'error'" class="kw-map-placeholder kw-map-placeholder--error">
      <p>Map unavailable{{ errorMessage ? `: ${errorMessage}` : '.' }}</p>
      <p class="kw-hint">The searchable list beside the map works without it.</p>
      <button type="button" class="kw-btn kw-btn--small" @click="init">Try again</button>
    </div>

    <div class="kw-map-toolbar">
      <button
        type="button"
        class="kw-map-toggle"
        :aria-pressed="streetMap"
        :title="streetMap ? 'Switch back to the offline atlas' : 'Load OpenStreetMap tiles'"
        @click="toggleStreetMap"
      >
        {{ streetMap ? 'Atlas' : 'Street map' }}
      </button>
      <button type="button" class="kw-map-toggle" title="Reset the map view" @click="resetView">
        Reset
      </button>
      <button
        type="button"
        class="kw-map-toggle"
        :aria-pressed="legendOpen"
        title="Show what the colours mean"
        @click="legendOpen = !legendOpen"
      >
        Legend
      </button>
    </div>

    <div v-if="legendOpen" class="kw-map-legend">
      <span class="kw-map-legend-title">Island groups</span>
      <span v-for="group in ISLANDS" :key="group.id" class="kw-map-legend-item">
        <i :style="{ background: islandColour(group.id) }" aria-hidden="true" />
        {{ group.label }}
      </span>
      <span class="kw-map-legend-item kw-map-legend-item--dot">
        <i class="kw-map-legend-dot" aria-hidden="true" />
        BMKG forecast point
      </span>
    </div>

    <Transition name="kw-fade">
      <div v-if="hoverInfo" class="kw-map-info" aria-live="polite">
        <span class="kw-map-kind">{{ hoverInfo.kind }}</span>
        <strong>{{ hoverInfo.title }}</strong>
        <span class="kw-map-sub">{{ hoverInfo.province }}</span>
        <span v-if="hoverInfo.detail" class="kw-map-sub">{{ hoverInfo.detail }}</span>
        <span class="kw-map-hint">{{ hoverInfo.hint }}</span>
      </div>
    </Transition>

    <p v-if="provinceWarning" class="kw-map-warning">{{ provinceWarning }}</p>

    <div class="kw-map-credit">
      <span>z{{ zoom.toFixed(1) }}</span>
      <span>
        Regions: <a href="https://github.com/cahyadsn/wilayah" target="_blank" rel="noopener">cahyadsn/wilayah</a>
        (MIT) · Points: BMKG
        <template v-if="streetMap">
          · Tiles © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>
        </template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.kw-map {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-shape-lg);
  isolation: isolate;
}

.kw-map-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.kw-map-placeholder {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.4rem;
  padding: 1rem;
  color: var(--md-on-surface-variant);
  background: color-mix(in srgb, var(--md-surface) 60%, transparent);
  font-size: 0.78rem;
  text-align: center;
}

.kw-map-placeholder p {
  margin: 0;
}

.kw-map-placeholder--error {
  gap: 0.55rem;
}

.kw-map-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid color-mix(in srgb, var(--md-primary) 25%, transparent);
  border-top-color: var(--md-primary);
  border-radius: 50%;
  animation: kw-map-spin 900ms linear infinite;
}

@keyframes kw-map-spin {
  to {
    transform: rotate(360deg);
  }
}

.kw-map-toolbar {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 3;
  display: flex;
  gap: 0.3rem;
}

.kw-map-toggle {
  min-height: 26px;
  padding: 0.15rem 0.55rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: color-mix(in srgb, var(--md-surface) 88%, transparent);
  color: var(--md-on-surface);
  box-shadow: var(--md-elevation-1);
  font-family: inherit;
  font-size: 0.66rem;
  font-weight: 500;
  cursor: pointer;
}

.kw-map-toggle:hover,
.kw-map-toggle[aria-pressed='true'] {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.kw-map-legend {
  position: absolute;
  top: 2.55rem;
  left: 0.5rem;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.18rem 0.7rem;
  max-width: 260px;
  padding: 0.5rem 0.65rem;
  border-radius: var(--md-shape-sm);
  background: color-mix(in srgb, var(--md-surface) 94%, transparent);
  box-shadow: var(--md-elevation-2);
  color: var(--md-on-surface);
  font-size: 0.62rem;
}

.kw-map-legend-title {
  grid-column: 1 / -1;
  margin-bottom: 0.1rem;
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kw-map-legend-item {
  display: flex;
  align-items: center;
  gap: 0.32rem;
}

.kw-map-legend-item i {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  opacity: 0.75;
}

.kw-map-legend-item--dot {
  grid-column: 1 / -1;
}

.kw-map-legend-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: var(--md-primary);
}

.kw-map-info {
  position: absolute;
  left: 0.5rem;
  bottom: 2.1rem;
  z-index: 3;
  display: grid;
  gap: 0.05rem;
  max-width: 230px;
  padding: 0.45rem 0.65rem;
  border-radius: var(--md-shape-sm);
  background: color-mix(in srgb, var(--md-surface) 92%, transparent);
  box-shadow: var(--md-elevation-2);
  color: var(--md-on-surface);
  pointer-events: none;
}

.kw-map-kind {
  color: var(--md-primary);
  font-family: var(--vp-font-family-mono);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kw-map-info strong {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
}

.kw-map-sub {
  color: var(--md-on-surface-variant);
  font-size: 0.66rem;
}

.kw-map-hint {
  margin-top: 0.15rem;
  color: var(--md-primary);
  font-size: 0.6rem;
}

.kw-map-warning {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 3;
  max-width: 200px;
  margin: 0;
  padding: 0.3rem 0.5rem;
  border-radius: var(--md-shape-sm);
  background: color-mix(in srgb, var(--md-error-container) 85%, transparent);
  color: var(--md-on-error-container);
  font-size: 0.6rem;
}

.kw-map-credit {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.55rem;
  background: linear-gradient(to top, color-mix(in srgb, var(--md-surface) 92%, transparent), transparent);
  color: var(--md-on-surface-variant);
  font-size: 0.56rem;
  line-height: 1.35;
  pointer-events: none;
}

.kw-map-credit a {
  color: inherit;
  text-decoration: underline;
  pointer-events: auto;
}

@media (max-width: 640px) {
  .kw-map-legend {
  position: absolute;
  top: 2.55rem;
  left: 0.5rem;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.18rem 0.7rem;
  max-width: 260px;
  padding: 0.5rem 0.65rem;
  border-radius: var(--md-shape-sm);
  background: color-mix(in srgb, var(--md-surface) 94%, transparent);
  box-shadow: var(--md-elevation-2);
  color: var(--md-on-surface);
  font-size: 0.62rem;
}

.kw-map-legend-title {
  grid-column: 1 / -1;
  margin-bottom: 0.1rem;
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.54rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kw-map-legend-item {
  display: flex;
  align-items: center;
  gap: 0.32rem;
}

.kw-map-legend-item i {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  opacity: 0.75;
}

.kw-map-legend-item--dot {
  grid-column: 1 / -1;
}

.kw-map-legend-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: var(--md-primary);
}

.kw-map-info {
    display: none;
  }

  .kw-map-credit {
    font-size: 0.52rem;
  }
}
</style>
