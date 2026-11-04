<script setup lang="ts">
/**
 * BMKG weather: region picker, current conditions, a three-day timeline and
 * context for outdoor tasks. Forecasts are clearly attributed to BMKG and are
 * never presented as official weather warnings.
 *
 * The picker is deliberately more than a dropdown: search ranks cities by
 * name, capital, province, nickname and adm4 prefix; islands and provinces can
 * be browsed; and an optional Leaflet atlas lets you click the actual forecast
 * point. The place is still chosen by the visitor, never guessed.
 */
import { computed, onMounted, ref, watch } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import WeatherIcon from './WeatherIcon.vue'
import RegionMap from './RegionMap.vue'
import { workspace, rememberLocation } from '../../kerja/state'
import {
  ADM4_PATTERN,
  BMKG_PORTAL,
  locationLabel,
  outdoorRainAdvice,
  toSavedLocation,
  type BmkgLocationEntry
} from '../../kerja/bmkg'
import {
  ISLANDS,
  entriesInIsland,
  formatArea,
  formatPopulation,
  highlightSegments,
  largestCities,
  provincesForIsland,
  rankRegions,
  shortRegionName,
  type IslandId,
  type ProvinceFile,
  type ProvinceMeta
} from '../../kerja/region'
import {
  chooseWeatherLocation,
  clearWeatherLocation,
  loadWeather,
  refreshWeather,
  weather,
  weatherAgeMinutes,
  weatherLocation
} from '../../kerja/useWeather'
import { dateTimeLabel, relativeTimeLabel } from '../../kerja/dates'
import { isOpen } from '../../kerja/tasks'
import { reveal } from '../../kerja/animations'
import { openTaskEditor, goToTab } from '../../kerja/ui'

interface LocationFile {
  provinces: Record<string, string>
  locations: BmkgLocationEntry[]
}

const pickerOpen = ref(false)
const query = ref('')
const province = ref('')
const island = ref<IslandId | ''>('')
const manualAdm4 = ref('')
const manualError = ref('')
const locationEntries = ref<BmkgLocationEntry[]>([])
const provinceMeta = ref<ProvinceMeta[]>([])
const loadingLocations = ref(false)
const loadError = ref('')
const mapVisible = ref(false)
const mapAvailable = ref(false)
const activeIndex = ref(0)
const now = ref(new Date())

const selected = computed(() => weatherLocation.value)
const forecast = computed(() => weather.forecast)
const current = computed(() => {
  if (!forecast.value) return null
  const nowMs = now.value.getTime()
  return (
    forecast.value.slots.find((slot) => new Date(slot.time).getTime() >= nowMs) ??
    forecast.value.slots[forecast.value.slots.length - 1]
  )
})
const age = computed(() => weatherAgeMinutes(now.value))
const updatedLabel = computed(() => {
  if (!weather.fetchedAt) return ''
  return relativeTimeLabel(weather.fetchedAt, now.value)
})

const provinceInfo = computed(() =>
  province.value ? provinceMeta.value.find((item) => item.code === province.value) ?? null : null
)
const visibleProvinces = computed(() => provincesForIsland(provinceMeta.value, island.value))
const quickCities = computed(() => largestCities(locationEntries.value, 6))
const searching = computed(() => query.value.trim().length >= 2)
const matches = computed(() =>
  searching.value ? rankRegions(locationEntries.value, query.value, 16) : []
)
const provinceEntries = computed(() => {
  if (!province.value) return []
  return locationEntries.value
    .filter((entry) => entry.provinceCode === province.value)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
})
const islandEntries = computed(() =>
  island.value ? entriesInIsland(locationEntries.value, island.value) : []
)
const resultEntries = computed(() => {
  if (searching.value) return matches.value.map((match) => match.entry)
  if (province.value) return provinceEntries.value
  return []
})
const resultAdm4s = computed(() => resultEntries.value.map((entry) => entry.adm4))
const resultsOpen = computed(() => pickerOpen.value && (searching.value || Boolean(province.value)))
const islandLabel = computed(
  () => ISLANDS.find((group) => group.id === island.value)?.label ?? 'All islands'
)

const outlook = computed(() => {
  if (!forecast.value) return []
  const first = new Date(forecast.value.slots[0].time).getTime()
  const last = new Date(forecast.value.slots[forecast.value.slots.length - 1].time).getTime()
  return workspace.tasks
    .filter((task) => {
      if (!isOpen(task) || !task.outdoor) return false
      const at = task.startAt ?? task.dueAt
      if (!at) return false
      const time = new Date(at).getTime()
      return time >= first - 12 * 3600_000 && time <= last + 12 * 3600_000
    })
    .map((task) => ({ task, advice: outdoorRainAdvice(task, forecast.value, now.value) }))
    .filter((item) => item.advice)
    .slice(0, 4)
})

async function ensureLocations() {
  if (locationEntries.value.length || loadingLocations.value) return
  loadingLocations.value = true
  loadError.value = ''
  try {
    const [locations, provinces] = await Promise.all([
      import('../../../../data/bmkg-locations.json'),
      import('../../../../data/wilayah-provinces.json')
    ])
    locationEntries.value = (locations.default as unknown as LocationFile).locations
    provinceMeta.value = (provinces.default as unknown as ProvinceFile).provinces
  } catch {
    loadError.value =
      'The region list could not be loaded. You can still enter an administrative code below.'
  } finally {
    loadingLocations.value = false
  }
}

function detectMap() {
  if (typeof window === 'undefined') return
  mapAvailable.value = window.matchMedia('(min-width: 1025px)').matches
  try {
    mapAvailable.value = mapAvailable.value && Boolean(document.createElement('canvas').getContext('2d'))
  } catch {
    mapAvailable.value = false
  }
  if (mapAvailable.value) mapVisible.value = true
}

function openPicker() {
  pickerOpen.value = true
  void ensureLocations()
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (resultEntries.value.length) {
      activeIndex.value = Math.min(activeIndex.value + 1, resultEntries.value.length - 1)
    }
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    return
  }
  if (event.key === 'Enter') {
    const entry = resultEntries.value[activeIndex.value]
    if (entry) {
      event.preventDefault()
      void pick(entry)
    }
    return
  }
  if (event.key === 'Escape' && query.value) {
    event.preventDefault()
    query.value = ''
  }
}

function setIsland(id: IslandId | '') {
  island.value = id
  province.value = ''
  query.value = ''
}

function selectProvince(code: string) {
  query.value = ''
  if (province.value === code) {
    province.value = ''
    return
  }
  province.value = code
  const meta = provinceMeta.value.find((item) => item.code === code)
  if (meta && island.value && meta.island !== island.value) island.value = meta.island
}

function onMapProvince(code: string | null) {
  if (!code) {
    province.value = ''
    return
  }
  query.value = ''
  province.value = code
  const meta = provinceMeta.value.find((item) => item.code === code)
  if (meta) island.value = meta.island
}

async function applyResolvedLabel(fallback: string) {
  const resolved = weather.forecast?.location
  if (!resolved) return
  await rememberLocation({
    adm4: resolved.adm4,
    label: resolved.kotkab || fallback,
    provinsi: resolved.provinsi,
    kotkab: resolved.kotkab,
    kecamatan: resolved.kecamatan,
    desa: resolved.desa
  })
}

async function pick(entry: BmkgLocationEntry) {
  const saved = toSavedLocation(entry)
  pickerOpen.value = false
  query.value = ''
  province.value = ''
  await chooseWeatherLocation(saved)
  await applyResolvedLabel(saved.label)
}

async function pickRecent(location: typeof selected.value) {
  if (!location) return
  pickerOpen.value = false
  await chooseWeatherLocation(location)
  await applyResolvedLabel(location.label)
}

async function applyManual() {
  manualError.value = ''
  const code = manualAdm4.value.trim()
  if (!ADM4_PATTERN.test(code)) {
    manualError.value = 'Use the format province.regency.district.village, for example 63.71.01.1001.'
    return
  }
  pickerOpen.value = false
  await chooseWeatherLocation({ adm4: code, label: code })
  await applyResolvedLabel(code)
  if (weather.error) manualError.value = weather.error
  manualAdm4.value = ''
}

watch([query, province, island], () => {
  activeIndex.value = 0
})

onMounted(async () => {
  detectMap()
  if (!selected.value) await ensureLocations()
  if (selected.value && !weather.forecast && !weather.loading) {
    await loadWeather(selected.value.adm4)
  }
  reveal(document.querySelectorAll('.kw-main .kw-reveal'), 45)
})

async function changeLocation() {
  pickerOpen.value = true
  await ensureLocations()
}

function removeLocation() {
  clearWeatherLocation()
  pickerOpen.value = true
  void ensureLocations()
}
</script>

<template>
  <div class="weather-tab">
    <header class="kw-section-head kw-reveal" style="margin-bottom: 0.8rem">
      <div>
        <span class="kw-eyebrow">Official BMKG forecast</span>
        <h1 style="margin: 0.1rem 0 0; font-size: clamp(1.4rem, 3vw, 1.8rem); letter-spacing: -0.02em">
          Weather
        </h1>
      </div>
      <div class="kw-inline">
        <button
          v-if="selected && !pickerOpen"
          type="button"
          class="kw-btn kw-btn--outlined kw-btn--small"
          @click="changeLocation"
        >
          <WorkspaceIcon name="map-pin" :size="15" />
          Change location
        </button>
        <button
          v-if="selected && !pickerOpen"
          type="button"
          class="kw-btn kw-btn--tonal kw-btn--small"
          :disabled="weather.loading"
          @click="refreshWeather()"
        >
          <WorkspaceIcon name="refresh" :size="15" />
          {{ weather.loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </header>

    <section v-if="pickerOpen || !selected" class="kw-card kw-reveal kw-region-picker">
      <header class="kw-card-head">
        <div>
          <h2>{{ selected ? 'Choose a forecast point' : 'Where should the forecast come from?' }}</h2>
          <p class="kw-hint">
            Kerja never guesses your location. Search a city, browse by island,
            pick a dot on the map, or enter a village code.
          </p>
        </div>
        <button
          v-if="selected"
          type="button"
          class="kw-icon-btn"
          aria-label="Close location picker"
          @click="pickerOpen = false"
        >
          <WorkspaceIcon name="close" />
        </button>
      </header>

      <div class="kw-region-search">
        <div class="kw-region-field">
          <WorkspaceIcon name="search" :size="18" class="kw-region-search-icon" />
          <input
            id="weather-search"
            v-model="query"
            class="kw-input"
            type="search"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="kw-region-results"
            :aria-expanded="resultsOpen"
            aria-label="Search city, regency, province, capital or adm4 code"
            placeholder="Banjarmasin, Jogja, Meulaboh, 63.71…"
            @keydown="onSearchKeydown"
          />
          <button
            v-if="query"
            type="button"
            class="kw-icon-btn kw-region-clear"
            aria-label="Clear search"
            @click="query = ''"
          >
            <WorkspaceIcon name="close" :size="16" />
          </button>
        </div>
        <button
          type="button"
          class="kw-btn kw-btn--tonal kw-btn--small kw-region-map-toggle"
          :aria-pressed="mapVisible"
          @click="mapVisible = !mapVisible"
        >
          <WorkspaceIcon :name="mapVisible ? 'layers' : 'map'" :size="15" />
          {{ mapVisible ? 'Hide map' : 'Map' }}
        </button>
      </div>

      <div v-if="!query" class="kw-region-islands" role="group" aria-label="Island group">
        <button
          type="button"
          class="kw-chip"
          :class="{ 'is-active': island === '' }"
          :aria-pressed="island === ''"
          @click="setIsland('')"
        >
          All Indonesia
        </button>
        <button
          v-for="group in ISLANDS"
          :key="group.id"
          type="button"
          class="kw-chip"
          :class="{ 'is-active': island === group.id }"
          :aria-pressed="island === group.id"
          @click="setIsland(group.id)"
        >
          {{ group.short }}
        </button>
      </div>

      <div class="kw-region-layout" :class="{ 'has-map': mapVisible && locationEntries.length }">
        <div class="kw-region-panel">
          <p v-if="loadingLocations" class="kw-hint" style="margin: 0.2rem 0">
            Loading 514 kabupaten/kota and 38 provinces…
          </p>
          <p v-else-if="loadError" class="kw-error" style="margin: 0.2rem 0">{{ loadError }}</p>

          <template v-else-if="searching">
            <div class="kw-region-head">
              <span>
                <strong>{{ resultEntries.length }}</strong>
                {{ resultEntries.length === 1 ? 'match' : 'matches' }}
                <template v-if="island !== '' && !province"> · {{ islandLabel }}</template>
              </span>
              <span class="kw-hint">↑↓ move · Enter choose</span>
            </div>
            <div
              v-if="resultEntries.length"
              id="kw-region-results"
              class="kw-location-list"
              role="listbox"
              aria-label="Matching locations"
            >
              <button
                v-for="(entry, index) in resultEntries"
                :key="entry.adm4"
                type="button"
                class="kw-location-option"
                :class="{ 'is-active': index === activeIndex }"
                role="option"
                :aria-selected="index === activeIndex"
                @mouseenter="activeIndex = index"
                @click="pick(entry)"
              >
                <span class="kw-location-kind">{{ entry.kind === 'kota' ? 'Kota' : 'Kab' }}</span>
                <span class="kw-location-body">
                  <strong>
                    <template
                      v-for="(segment, part) in highlightSegments(shortRegionName(entry.name), query)"
                      :key="part"
                    >
                      <mark v-if="segment.match">{{ segment.text }}</mark>
                      <template v-else>{{ segment.text }}</template>
                    </template>
                  </strong>
                  <span>
                    {{ entry.province }}
                    <template v-if="entry.capital && entry.capital !== shortRegionName(entry.name)">
                      · {{ entry.capital }}
                    </template>
                  </span>
                </span>
                <span class="kw-location-meta">
                  <span v-if="entry.population">{{ formatPopulation(entry.population) }}</span>
                  <code>{{ entry.adm4 }}</code>
                </span>
              </button>
            </div>
            <div v-else class="kw-empty" style="padding: 1.1rem">
              <WorkspaceIcon name="search" :size="26" />
              <strong>No location matched “{{ query }}”</strong>
              <p>
                Try a regency, a capital city, a province, a nickname such as
                “Jogja”, or the first digits of the adm4 code.
              </p>
            </div>
          </template>

          <template v-else-if="province && provinceInfo">
            <div class="kw-region-province">
              <div>
                <span class="kw-eyebrow">{{ provinceInfo.island.replace(/-/g, ' ') }}</span>
                <strong>{{ provinceInfo.name }}</strong>
                <span class="kw-region-facts">
                  <template v-if="provinceInfo.capital">{{ provinceInfo.capital }} · </template>
                  {{ provinceInfo.regencyCount }} kabupaten/kota
                  <template v-if="provinceInfo.population">
                    · {{ formatPopulation(provinceInfo.population) }} jiwa
                  </template>
                  <template v-if="provinceInfo.areaKm2">
                    · {{ formatArea(provinceInfo.areaKm2) }}
                  </template>
                </span>
              </div>
              <button type="button" class="kw-btn kw-btn--small" @click="province = ''">
                Change province
              </button>
            </div>
            <div
              v-if="provinceEntries.length"
              id="kw-region-results"
              class="kw-location-list"
              role="listbox"
              aria-label="Locations in the selected province"
            >
              <button
                v-for="(entry, index) in provinceEntries"
                :key="entry.adm4"
                type="button"
                class="kw-location-option"
                :class="{ 'is-active': index === activeIndex }"
                role="option"
                :aria-selected="index === activeIndex"
                @mouseenter="activeIndex = index"
                @click="pick(entry)"
              >
                <span class="kw-location-kind">{{ entry.kind === 'kota' ? 'Kota' : 'Kab' }}</span>
                <span class="kw-location-body">
                  <strong>{{ shortRegionName(entry.name) }}</strong>
                  <span>
                    {{ entry.capital || entry.province }}
                    <template v-if="entry.population"> · {{ formatPopulation(entry.population) }}</template>
                  </span>
                </span>
                <span class="kw-location-meta">
                  <code>{{ entry.adm4 }}</code>
                </span>
              </button>
            </div>
          </template>

          <template v-else>
            <div class="kw-region-head">
              <span>
                <strong>{{ visibleProvinces.length }}</strong>
                {{ visibleProvinces.length === 1 ? 'province' : 'provinces' }}
              </span>
              <span class="kw-hint">Pick a province, or search above</span>
            </div>
            <div class="kw-province-chips">
              <button
                v-for="item in visibleProvinces"
                :key="item.code"
                type="button"
                class="kw-province-chip"
                @click="selectProvince(item.code)"
              >
                <span>{{ item.name }}</span>
                <span class="kw-count">{{ item.regencyCount }}</span>
              </button>
            </div>

            <template v-if="!island && quickCities.length">
              <p class="kw-label" style="margin: 0.9rem 0 0">Largest cities</p>
              <div class="kw-quick-cities">
                <button
                  v-for="entry in quickCities"
                  :key="entry.adm4"
                  type="button"
                  class="kw-quick-city"
                  @click="pick(entry)"
                >
                  <strong>{{ shortRegionName(entry.name) }}</strong>
                  <span>{{ entry.province }}</span>
                </button>
              </div>
            </template>
            <p v-else-if="island" class="kw-hint" style="margin: 0.7rem 0 0">
              {{ islandEntries.length }} forecast points in {{ islandLabel }}. Pick a
              province above, or search for a city.
            </p>
          </template>
        </div>

        <RegionMap
          v-if="mapVisible && locationEntries.length"
          class="kw-region-map"
          :entries="locationEntries"
          :selected-adm4="selected?.adm4 ?? null"
          :matched-adm4s="resultAdm4s"
          :focus-province="province || null"
          :height="340"
          @pick="pick"
          @province="onMapProvince"
        />
      </div>

      <div v-if="workspace.settings.recentLocations.length" class="kw-region-recent">
        <span class="kw-hint">Recent</span>
        <button
          v-for="location in workspace.settings.recentLocations"
          :key="location.adm4"
          type="button"
          class="kw-chip"
          @click="pickRecent(location)"
        >
          {{ location.label }}
        </button>
        <button v-if="selected" type="button" class="kw-chip" @click="removeLocation">
          Clear location
        </button>
      </div>

      <details class="kw-region-advanced">
        <summary>
          <WorkspaceIcon name="code" :size="15" />
          I know the exact village code (adm4)
        </summary>
        <form class="kw-field" style="margin-top: 0.7rem" @submit.prevent="applyManual">
          <label class="kw-label" for="weather-manual">Village / kelurahan code</label>
          <div class="kw-inline">
            <input
              id="weather-manual"
              v-model="manualAdm4"
              class="kw-input"
              type="text"
              inputmode="numeric"
              placeholder="31.71.01.1001"
              style="max-width: 240px"
              autocomplete="off"
            />
            <button type="submit" class="kw-btn kw-btn--tonal" :disabled="!manualAdm4.trim()">
              Use this code
            </button>
          </div>
          <p class="kw-hint">
            Codes follow province.regency.district.village. Regency picks above use
            one representative village, so a village code is more precise.
          </p>
          <p v-if="manualError" class="kw-error">{{ manualError }}</p>
        </form>
      </details>

      <p class="kw-region-source">
        Region names, coordinates, capitals and population from
        <a href="https://github.com/cahyadsn/wilayah" target="_blank" rel="noopener">cahyadsn/wilayah</a>
        (MIT, Kepmendagri 2025). Forecast points and weather from BMKG.
      </p>
    </section>

    <template v-if="selected && !pickerOpen">
      <div v-if="weather.loading && !forecast" class="kw-card kw-reveal kw-mt-md">
        <p class="kw-hint" style="margin: 0">Loading the BMKG forecast for {{ selected.label }}…</p>
      </div>

      <div v-else-if="forecast && current">
        <section class="kw-weather-hero kw-reveal">
          <div>
            <span class="kw-eyebrow" style="color: currentColor; opacity: 0.7">
              {{ locationLabel(forecast.location) }}
            </span>
            <div class="kw-weather-now">
              <span class="kw-weather-icon">
                <WeatherIcon :kind="current.kind" :size="46" />
              </span>
              <div>
                <p class="kw-weather-temp">{{ current.temperature }}<sup>°C</sup></p>
                <span class="kw-weather-desc">{{ current.desc }}</span>
                <span class="kw-weather-sub">
                  Feels like {{ current.descEn || current.desc }} · {{ current.localTime }} local ·
                  updated {{ updatedLabel }}
                </span>
              </div>
            </div>
          </div>
          <div class="kw-weather-facts">
            <div class="kw-fact">
              <WorkspaceIcon name="humidity" :size="16" />
              <span>{{ current.humidity }}% humidity</span>
            </div>
            <div class="kw-fact">
              <WorkspaceIcon name="wind" :size="16" />
              <span>{{ current.windSpeed }} km/h {{ current.windDirection }}</span>
            </div>
            <div class="kw-fact">
              <WorkspaceIcon name="eye" :size="16" />
              <span>{{ current.visibility || 'Visibility n/a' }}</span>
            </div>
            <div class="kw-fact">
              <WorkspaceIcon name="umbrella" :size="16" />
              <span>{{ current.precipitationMm }} mm precipitation</span>
            </div>
          </div>
        </section>

        <div v-if="weather.stale || weather.fromCache" class="kw-notice kw-notice--warning kw-mt-sm">
          <WorkspaceIcon name="info" :size="18" />
          <span>
            Showing a cached forecast{{ age !== null ? ` from about ${age} minutes ago` : '' }}.
            {{ weather.error || 'BMKG could not be reached just now.' }}
            <button type="button" class="kw-btn kw-btn--small" @click="refreshWeather()">Try again</button>
          </span>
        </div>

        <section class="kw-section kw-reveal">
          <header class="kw-section-head">
            <h2>
              <WorkspaceIcon name="calendar" :size="18" />
              Three-day timeline
            </h2>
            <span class="kw-hint">Times are local to {{ forecast.location.kotkab || forecast.location.provinsi }}</span>
          </header>
          <div class="kw-days">
            <article v-for="day in forecast.days" :key="day.date" class="kw-day">
              <header class="kw-day-head">
                <strong>{{ day.label }}</strong>
                <span>{{ day.date }}</span>
              </header>
              <div class="kw-slots">
                <div v-for="slot in day.slots" :key="slot.time" class="kw-slot">
                  <time :datetime="slot.time">{{ slot.localTime }}</time>
                  <WeatherIcon :kind="slot.kind" :size="20" />
                  <span class="kw-slot-desc">{{ slot.desc }}</span>
                  <span class="kw-slot-temp">{{ slot.temperature }}°</span>
                  <span v-if="slot.precipitationMm > 0" class="kw-rain">{{ slot.precipitationMm }} mm</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="kw-section kw-reveal">
          <header class="kw-section-head">
            <h2>
              <WorkspaceIcon name="umbrella" :size="18" />
              Outdoor tasks and the forecast
            </h2>
            <button type="button" class="kw-btn kw-btn--small" @click="goToTab('tasks')">
              Open tasks
            </button>
          </header>
          <div v-if="outlook.length" class="kw-forecast-outlook">
            <div v-for="item in outlook" :key="item.task.id" class="kw-outlook-row">
              <WorkspaceIcon name="warning" :size="17" />
              <div>
                <strong>{{ item.task.title }}</strong>
                <p>
                  {{ item.advice?.detail }}
                  <span v-if="item.task.startAt" class="kw-hint">
                    Scheduled {{ dateTimeLabel(item.task.startAt, now) }}.
                  </span>
                </p>
                <button type="button" class="kw-btn kw-btn--small" @click="openTaskEditor(item.task.id)">
                  Review task
                </button>
              </div>
            </div>
          </div>
          <div v-else-if="workspace.tasks.some((task) => task.outdoor)" class="kw-empty">
            <WorkspaceIcon name="umbrella" :size="28" />
            <strong>No rain overlapping your outdoor tasks</strong>
            <p>
              Nothing in the current BMKG timeline suggests rain around the outdoor
              tasks you have scheduled. This is a forecast hint, not an official
              BMKG warning.
            </p>
          </div>
          <div v-else class="kw-empty">
            <WorkspaceIcon name="umbrella" :size="28" />
            <strong>Mark a task as outdoor</strong>
            <p>
              Open a task, switch on “Outdoor activity”, and Kerja will show a small
              rain hint when the BMKG forecast overlaps its scheduled time.
            </p>
            <button type="button" class="kw-btn kw-btn--tonal kw-btn--small" @click="goToTab('tasks')">
              Go to tasks
            </button>
          </div>
        </section>

        <footer class="kw-attribution">
          <WorkspaceIcon name="weather" :size="17" />
          <span>
            <strong>Weather data: BMKG</strong> (Badan Meteorologi, Klimatologi, dan
            Geofisika). Source:
            <a :href="BMKG_PORTAL" target="_blank" rel="noopener">data.bmkg.go.id/prakiraan-cuaca</a>
            · forecast for adm4 <code>{{ forecast.location.adm4 }}</code>. BMKG is the
            official source; this workspace only displays its public forecast.
            Forecasts are not official weather warnings.
          </span>
        </footer>
      </div>

      <div v-else class="kw-section">
        <div class="kw-empty">
          <WorkspaceIcon name="wifi-off" :size="30" />
          <strong>BMKG forecast unavailable</strong>
          <p>{{ weather.error || 'The forecast could not be loaded. Check your connection and try again.' }}</p>
          <div class="kw-inline">
            <button type="button" class="kw-btn kw-btn--filled kw-btn--small" @click="refreshWeather()">
              Retry
            </button>
            <button type="button" class="kw-btn kw-btn--outlined kw-btn--small" @click="changeLocation">
              Choose another location
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
