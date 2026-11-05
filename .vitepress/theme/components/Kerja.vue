<script setup lang="ts">
/**
 * /kerja — the workspace shell.
 *
 * Home keeps the original browser start page (search, shortcuts, pins, recent
 * searches). Today, Tasks, Weather and Cloud are the productivity additions,
 * all reading the same local-first store. Cloud access is manual by design.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import KerjaHome from './KerjaHome.vue'
import TodayTab from './kerja/TodayTab.vue'
import TasksTab from './kerja/TasksTab.vue'
import WeatherTab from './kerja/WeatherTab.vue'
import CloudTab from './kerja/CloudTab.vue'
import WorkspaceIcon from './kerja/WorkspaceIcon.vue'
import ToastHost from './kerja/ToastHost.vue'
import ReminderSheet from './kerja/ReminderSheet.vue'
import TaskEditorDialog from './kerja/TaskEditorDialog.vue'
import {
  ACCENTS,
  DENSITIES,
  PAPERS,
  applySettings,
  bootCustomization,
  settings
} from '../customize'
import { initAppearance, isDark, cycleTheme, mode, pickMode, THEME_OPTIONS } from '../kerja/appearance'
import {
  WORKSPACE_TABS,
  activeTab,
  focusGlobalSearch,
  goToTab,
  openReminderSheet,
  openTaskEditor,
  reminderSheetOpen,
  taskEditor,
  type WorkspaceTab
} from '../kerja/ui'
import { initWorkspace, workspace } from '../kerja/state'
import { cloud, connectGitHub, loadSession, pendingUpload, syncToCloud } from '../kerja/cloud-client'
import { loadWeather, refreshWeather, weather } from '../kerja/useWeather'
import { installReminderScheduler } from '../kerja/useReminders'
import { dueReminders } from '../kerja/reminders'
import { pushToast } from '../kerja/toasts'
import { reveal, tabEnter } from '../kerja/animations'
import '../kerja.css'

const TABS: Record<WorkspaceTab, unknown> = {
  home: KerjaHome,
  today: TodayTab,
  tasks: TasksTab,
  weather: WeatherTab,
  cloud: CloudTab
}

const TAB_ICONS: Record<WorkspaceTab, string> = {
  home: 'home',
  today: 'today',
  tasks: 'tasks',
  weather: 'weather',
  cloud: 'cloud'
}

const main = ref<HTMLElement | null>(null)
const fab = ref<HTMLButtonElement | null>(null)
const lookOpen = ref(false)
const lookWrap = ref<HTMLElement | null>(null)
const clock = ref('')
const now = ref(new Date())
const connected = computed(() => cloud.connected)
const cloudLabel = computed(() => {
  if (!connected.value) return 'Local only'
  return pendingUpload.value ? 'Unsynced' : 'Synced'
})
const cloudDot = computed(() => {
  if (!connected.value) return 'kw-dot--idle'
  return pendingUpload.value ? 'kw-dot--pending' : 'kw-dot--ok'
})
const reminderCount = computed(() => dueReminders(workspace.tasks, now.value).length)
const activeComponent = computed(() => TABS[activeTab.value])
const activeLabel = computed(
  () => WORKSPACE_TABS.find((tab) => tab.id === activeTab.value)?.label ?? 'Workspace'
)
const isHome = computed(() => activeTab.value === 'home')
const fabIcon = computed(() => {
  switch (activeTab.value) {
    case 'today':
    case 'tasks':
      return 'plus'
    case 'weather':
      return 'refresh'
    case 'cloud':
      return connected.value ? 'sync' : 'github'
    default:
      return 'search'
  }
})
const fabLabel = computed(() => {
  switch (activeTab.value) {
    case 'today':
    case 'tasks':
      return 'New task'
    case 'weather':
      return 'Refresh the BMKG forecast'
    case 'cloud':
      return connected.value ? 'Sync to Cloud' : 'Connect GitHub'
    default:
      return 'Search the workspace'
  }
})

let clockTimer: number | undefined
let reminderCleanup: (() => void) | null = null
let hashLock = false

function updateClock() {
  const date = new Date()
  now.value = date
  try {
    clock.value = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    clock.value = date.toTimeString().slice(0, 5)
  }
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return Boolean(
    element &&
      (element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT' ||
        element.isContentEditable)
  )
}

function dialogOpen(): boolean {
  return taskEditor.open || reminderSheetOpen.value
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    focusGlobalSearch()
    return
  }
  if (event.key === '/' && !isTyping(event.target) && !dialogOpen()) {
    event.preventDefault()
    focusGlobalSearch()
    return
  }
  if (event.altKey && /^[1-5]$/.test(event.key)) {
    event.preventDefault()
    const tab = WORKSPACE_TABS[Number(event.key) - 1]
    if (tab) goToTab(tab.id)
    return
  }
  if (dialogOpen() || isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
  if (event.key === 'n') {
    event.preventDefault()
    openTaskEditor()
  } else if (event.key === 'r') {
    event.preventDefault()
    openReminderSheet()
  } else if (event.key === 'Escape' && lookOpen.value) {
    lookOpen.value = false
  }
}

function onPointerDown(event: PointerEvent) {
  if (!lookOpen.value) return
  const node = event.target as Node
  if (lookWrap.value && !lookWrap.value.contains(node)) lookOpen.value = false
}

function activateTab(tab: WorkspaceTab) {
  goToTab(tab)
}

function runFab() {
  switch (activeTab.value) {
    case 'today':
    case 'tasks':
      openTaskEditor()
      return
    case 'weather':
      void refreshWeather()
      return
    case 'cloud':
      if (connected.value) void syncToCloud()
      else connectGitHub()
      return
    default:
      focusGlobalSearch()
  }
}

function tabFromHash(): WorkspaceTab {
  const value = window.location.hash.replace(/^#/, '')
  const found = WORKSPACE_TABS.find((tab) => tab.id === value)
  return found ? found.id : 'home'
}

function readCloudQuery() {
  const url = new URL(window.location.href)
  const status = url.searchParams.get('cloud')
  if (!status) return
  const reason = url.searchParams.get('reason') ?? ''
  if (status === 'connected') {
    pushToast({
      tone: 'success',
      title: 'GitHub connected',
      message: 'Cloud sync is ready. Nothing is uploaded until you press Sync to Cloud.'
    })
    goToTab('cloud')
  } else if (status === 'error') {
    const messages: Record<string, string> = {
      state: 'The sign-in request expired. Start again from the Cloud tab.',
      denied: 'GitHub authorization was cancelled.',
      missing_code: 'GitHub did not return an authorization code.',
      oauth: 'GitHub rejected the authorization. Check the App client ID and secret.',
      account: 'The GitHub account could not be read.',
      forbidden: 'That GitHub account is not allowed to use this workspace.',
      repository: 'The GitHub App is not installed on the storage repository.'
    }
    pushToast({
      tone: 'error',
      title: 'Could not connect GitHub',
      message: messages[reason] ?? 'The GitHub connection failed. Try again.'
    })
    goToTab('cloud')
  }
  url.searchParams.delete('cloud')
  url.searchParams.delete('reason')
  hashLock = true
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  window.setTimeout(() => {
    hashLock = false
  }, 50)
}

watch(activeTab, async (tab) => {
  if (typeof window === 'undefined') return
  if (!hashLock) {
    try {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#${tab}`
      )
    } catch {
      /* ignore */
    }
  }
  await nextTick()
  tabEnter(main.value?.querySelector('.kw-main-inner') ?? null)
  window.scrollTo({ top: 0, behavior: 'auto' })
})

onMounted(async () => {
  if (typeof window === 'undefined') return
  bootCustomization()
  initAppearance()
  updateClock()
  clockTimer = window.setInterval(updateClock, 20_000)

  await Promise.all([initWorkspace(), loadSession()])
  activeTab.value = tabFromHash()
  readCloudQuery()

  if (workspace.settings.weatherLocation && !weather.forecast) {
    void loadWeather(workspace.settings.weatherLocation.adm4)
  }

  reminderCleanup = installReminderScheduler()
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown)

  await nextTick()
  reveal(document.querySelectorAll('.kw-app [data-intro]'), 55)
})

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer)
  reminderCleanup?.()
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown)
})
</script>

<template>
  <div class="kw-app">
    <header class="kw-bar" data-intro>
      <div class="kw-bar-inner">
        <a class="kw-icon-btn" href="/" aria-label="Back to thio.cc.cd">
          <WorkspaceIcon name="arrow-left" />
        </a>

        <div class="kw-brand">
          <span class="kw-brand-mark" aria-hidden="true">K</span>
          <span class="kw-brand-text">
            <strong>Kerja</strong>
            <span>{{ activeLabel }} · personal workspace</span>
          </span>
        </div>

        <span class="kw-clock" :title="new Date().toString()">{{ clock }} local</span>

        <div class="kw-bar-actions">
          <button
            type="button"
            class="kw-cloud-chip"
            :aria-label="`Cloud status: ${cloudLabel}. Open cloud settings`"
            @click="activateTab('cloud')"
          >
            <span class="kw-dot" :class="cloudDot" aria-hidden="true" />
            <span>{{ cloudLabel }}</span>
          </button>

          <button
            type="button"
            class="kw-icon-btn"
            :aria-label="`Reminders${reminderCount ? `, ${reminderCount} due` : ''}`"
            @click="openReminderSheet"
          >
            <WorkspaceIcon name="bell" />
            <span v-if="reminderCount" class="kw-badge" aria-hidden="true">{{ reminderCount }}</span>
          </button>

          <div ref="lookWrap" class="kw-pop-wrap">
            <button
              type="button"
              class="kw-icon-btn"
              :aria-expanded="lookOpen"
              aria-haspopup="dialog"
              aria-label="Appearance"
              @click="lookOpen = !lookOpen"
            >
              <WorkspaceIcon name="layers" />
            </button>

            <Transition name="kw-fade">
              <div v-if="lookOpen" class="kw-pop" role="dialog" aria-label="Appearance">
                <div class="kw-pop-group">
                  <span class="kw-pop-label">Seed colour</span>
                  <div class="kw-swatches">
                    <button
                      v-for="accent in ACCENTS"
                      :key="accent.id"
                      type="button"
                      class="kw-swatch"
                      :class="{ active: settings.accent === accent.id }"
                      :style="{ '--swatch': accent.swatch }"
                      :aria-label="accent.label"
                      :aria-pressed="settings.accent === accent.id"
                      @click="applySettings({ accent: accent.id })"
                    >
                      <WorkspaceIcon v-if="settings.accent === accent.id" name="check" :size="15" />
                    </button>
                  </div>
                </div>

                <div class="kw-pop-group">
                  <span class="kw-pop-label">Surface</span>
                  <div class="kw-options">
                    <button
                      v-for="paper in PAPERS"
                      :key="paper.id"
                      type="button"
                      class="kw-option"
                      :class="{ active: settings.paper === paper.id }"
                      @click="applySettings({ paper: paper.id })"
                    >
                      {{ paper.label }}
                    </button>
                  </div>
                </div>

                <div class="kw-pop-group">
                  <span class="kw-pop-label">Theme</span>
                  <div class="kw-options">
                    <button
                      v-for="option in THEME_OPTIONS"
                      :key="option.id"
                      type="button"
                      class="kw-option"
                      :class="{ active: mode === option.id }"
                      @click="pickMode(option.id)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <div class="kw-pop-group">
                  <span class="kw-pop-label">Grid</span>
                  <div class="kw-options">
                    <button
                      v-for="density in DENSITIES"
                      :key="density.id"
                      type="button"
                      class="kw-option"
                      :class="{ active: settings.density === density.id }"
                      @click="applySettings({ density: density.id })"
                    >
                      {{ density.label }}
                    </button>
                  </div>
                </div>

                <p class="kw-hint" style="margin: 0.8rem 0 0">
                  Saved with the rest of the site’s settings on this device.
                </p>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            class="kw-icon-btn"
            :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
            @click="cycleTheme"
          >
            <WorkspaceIcon :name="isDark ? 'sun' : 'moon'" />
          </button>
        </div>
      </div>
    </header>

    <div class="kw-body">
      <nav class="kw-rail" aria-label="Workspace sections" data-intro>
        <button
          v-for="tab in WORKSPACE_TABS"
          :key="tab.id"
          type="button"
          class="kw-rail-item"
          :class="{ 'is-active': activeTab === tab.id }"
          :aria-current="activeTab === tab.id ? 'page' : undefined"
          :title="tab.hint"
          @click="activateTab(tab.id)"
        >
          <WorkspaceIcon :name="TAB_ICONS[tab.id]" :size="22" />
          {{ tab.short }}
        </button>
        <div class="kw-rail-footer">
          <strong>Local-first</strong>
          {{ workspace.storage === 'indexeddb' ? 'IndexedDB' : workspace.storage === 'localstorage' ? 'localStorage' : 'Session' }}
        </div>
      </nav>

      <main ref="main" class="kw-main">
        <div class="kw-main-inner">
          <KeepAlive>
            <component :is="activeComponent" :key="activeTab" />
          </KeepAlive>
        </div>
      </main>
    </div>

    <nav class="kw-bottom-nav" aria-label="Workspace sections">
      <button
        v-for="tab in WORKSPACE_TABS"
        :key="tab.id"
        type="button"
        class=""
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        @click="activateTab(tab.id)"
      >
        <WorkspaceIcon :name="TAB_ICONS[tab.id]" :size="21" />
        {{ tab.short }}
      </button>
    </nav>

    <button
      ref="fab"
      type="button"
      class="kerja-fab"
      :class="{ 'is-search': isHome }"
      :aria-label="fabLabel"
      :title="fabLabel"
      @click="runFab"
    >
      <WorkspaceIcon :name="fabIcon" :size="24" />
    </button>

    <ToastHost />
    <ReminderSheet />
    <TaskEditorDialog />
  </div>
</template>

<style scoped>
.kerja-fab {
  position: fixed;
  right: clamp(14px, 3vw, 26px);
  bottom: calc(76px + env(safe-area-inset-bottom));
  z-index: 54;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 0;
  border-radius: var(--md-shape-lg);
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  box-shadow: var(--md-elevation-3);
  cursor: pointer;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring),
    box-shadow var(--md-duration-medium) var(--md-ease-standard);
}

.kerja-fab:hover {
  background: var(--md-primary);
  color: var(--md-on-primary);
  transform: translateY(-2px);
  box-shadow: var(--md-elevation-4);
}

.kerja-fab:active {
  transform: scale(0.96);
}

@media (min-width: 1025px) {
  .kerja-fab {
    bottom: clamp(18px, 3vw, 30px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .kerja-fab {
    transition: none;
  }

  .kerja-fab:hover {
    transform: none;
  }
}
</style>
