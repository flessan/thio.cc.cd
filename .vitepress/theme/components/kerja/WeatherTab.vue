<script setup lang="ts">
/**
 * BMKG weather: location picker, current conditions, a three-day timeline and
 * context for outdoor tasks. Forecasts are clearly attributed to BMKG and are
 * never presented as official weather warnings.
 */
import { computed, onMounted, ref } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import WeatherIcon from './WeatherIcon.vue'
import { workspace, rememberLocation } from '../../kerja/state'
import {
  ADM4_PATTERN,
  BMKG_PORTAL,
  locationLabel,
  outdoorRainAdvice,
  searchLocations,
  toSavedLocation,
  type BmkgLocationEntry
} from '../../kerja/bmkg'
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
const manualAdm4 = ref('')
const manualError = ref('')
const locationEntries = ref<BmkgLocationEntry[]>([])
const provinceNames = ref<Record<string, string>>({})
const loadingLocations = ref(false)
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

const results = computed(() => {
  if (query.value.trim().length >= 2) return searchLocations(locationEntries.value, query.value, 8)
  if (province.value) {
    return locationEntries.value.filter((entry) => entry.provinceCode === province.value).slice(0, 60)
  }
  return []
})

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
  try {
    const mod = (await import('../../../../data/bmkg-locations.json')) as unknown as {
      default: LocationFile
    }
    locationEntries.value = mod.default.locations
    provinceNames.value = mod.default.provinces
  } catch {
    manualError.value = 'The location list could not be loaded. Enter an administrative code instead.'
  } finally {
    loadingLocations.value = false
  }
}

function openPicker() {
  pickerOpen.value = true
  void ensureLocations()
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

onMounted(async () => {
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

    <section v-if="pickerOpen || !selected" class="kw-card kw-reveal">
      <header class="kw-card-head">
        <div>
          <h2>{{ selected ? 'Choose a location' : 'Where should the forecast come from?' }}</h2>
          <p class="kw-hint">
            Kerja never guesses your location. Search for a city or regency, or
            enter the village-level administrative code (adm4) yourself.
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

      <div class="kw-row-2">
        <div class="kw-field">
          <label class="kw-label" for="weather-search">Search city or regency</label>
          <input
            id="weather-search"
            v-model="query"
            class="kw-input"
            type="search"
            placeholder="e.g. Banjarmasin, Bandung, Jayapura"
            autocomplete="off"
          />
        </div>
        <div class="kw-field">
          <label class="kw-label" for="weather-province">Or browse a province</label>
          <select id="weather-province" v-model="province" class="kw-select">
            <option value="">All provinces</option>
            <option v-for="(name, code) in provinceNames" :key="code" :value="code">
              {{ name }}
            </option>
          </select>
        </div>
      </div>

      <p v-if="loadingLocations" class="kw-hint kw-mt-sm">Loading the location list…</p>

      <div v-if="selected" class="kw-inline kw-mt-sm">
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
        <button type="button" class="kw-chip" @click="removeLocation">Clear location</button>
      </div>

      <div v-if="results.length" class="kw-location-list">
        <button
          v-for="entry in results"
          :key="entry.adm4"
          type="button"
          class="kw-location-option"
          @click="pick(entry)"
        >
          <span>
            <strong>{{ entry.name }}</strong>
            <span>{{ entry.province }} · representative forecast point</span>
          </span>
          <code>{{ entry.adm4 }}</code>
        </button>
      </div>
      <p v-else-if="!loadingLocations && (query || province)" class="kw-hint kw-mt-sm">
        No location matched. Try a different spelling, or enter the code below.
      </p>

      <div class="kw-divider" />

      <form class="kw-field" @submit.prevent="applyManual">
        <label class="kw-label" for="weather-manual">Village / kelurahan code (adm4)</label>
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
