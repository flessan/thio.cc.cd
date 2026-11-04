<script setup lang="ts">
/**
 * Reminder centre: what is due, what is coming, and honest notification
 * controls. Browser notifications only work while the browser is running.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import BaseDialog from './BaseDialog.vue'
import { workspace, replaceTask, updateSettings } from '../../kerja/state'
import { closeReminderSheet, openTaskEditor, reminderSheetOpen } from '../../kerja/ui'
import {
  SNOOZE_OPTIONS,
  allUpcomingReminders,
  applySnooze,
  dismissReminder,
  dueReminders,
  reminderWhen,
  resolveSnooze,
  upcomingReminders,
  type SnoozeOption
} from '../../kerja/reminders'
import { dateTimeLabel } from '../../kerja/dates'
import { pushToast } from '../../kerja/toasts'
import {
  browserNotificationsEnabled,
  browserPermission,
  notificationLimitations,
  permissionLabel,
  requestBrowserPermission,
  setNotificationPreference,
  showBrowserNotification
} from '../../kerja/notifications'
import type { Task } from '../../kerja/model'

const now = ref(new Date())
const permission = ref(browserPermission())
let timer: number | undefined

const due = computed(() => dueReminders(workspace.tasks, now.value))
const nextDay = computed(() => upcomingReminders(workspace.tasks, now.value, 24))
const later = computed(() => {
  const ids = new Set(nextDay.value.map((task) => task.id))
  return allUpcomingReminders(workspace.tasks, now.value).filter((task) => !ids.has(task.id))
})
const anyReminders = computed(
  () => workspace.tasks.some((task) => Boolean(task.reminderAt) && task.status !== 'done')
)
const shortSnoozes: SnoozeOption[] = SNOOZE_OPTIONS.filter((option) =>
  ['10m', '1h', 'tomorrow'].includes(option.id)
)

function snooze(task: Task, option: SnoozeOption) {
  const next = applySnooze(task, resolveSnooze(option, now.value), now.value)
  replaceTask(next)
  pushToast({
    tone: 'info',
    title: 'Reminder snoozed',
    message: `We will remind you ${reminderWhen(next, now.value)}.`,
    duration: 3000
  })
}

function dismiss(task: Task) {
  replaceTask(dismissReminder(task, now.value))
  pushToast({ tone: 'info', title: 'Reminder dismissed', message: task.title, duration: 2600 })
}

async function enableNotifications() {
  const result = await requestBrowserPermission()
  permission.value = result
  if (result === 'granted') {
    setNotificationPreference(true)
    pushToast({
      tone: 'success',
      title: 'Browser notifications enabled',
      message: notificationLimitations()
    })
  } else if (result === 'denied') {
    pushToast({
      tone: 'warning',
      title: 'Notifications are blocked',
      message: 'Allow notifications for this site in your browser settings, then try again.'
    })
  }
}

function toggleBrowser() {
  const next = !browserNotificationsEnabled.value
  if (next && permission.value !== 'granted') {
    void enableNotifications()
    return
  }
  setNotificationPreference(next)
}

function testNotification() {
  if (permission.value !== 'granted') {
    void enableNotifications()
    return
  }
  setNotificationPreference(true)
  const shown = showBrowserNotification(
    'Kerja test notification',
    'If you can see this, browser reminders will appear while the browser is open.'
  )
  pushToast({
    tone: shown ? 'success' : 'info',
    title: shown ? 'Test notification sent' : 'In-app reminder test',
    message: shown
      ? notificationLimitations()
      : 'The browser did not show a system notification; in-app reminders still work.'
  })
}

function toggleInApp() {
  updateSettings({ inAppReminders: !workspace.settings.inAppReminders })
}

function edit(id: string) {
  closeReminderSheet()
  openTaskEditor(id)
}

function refreshPermission() {
  permission.value = browserPermission()
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 30_000)
  window.addEventListener('focus', refreshPermission)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  window.removeEventListener('focus', refreshPermission)
})
</script>

<template>
  <BaseDialog
    :open="reminderSheetOpen"
    title="Reminders"
    description="In-app reminders while Kerja is open, plus optional browser notifications."
    wide
    @close="closeReminderSheet"
  >
    <section class="kw-card" style="background: var(--md-surface-container)">
      <header class="kw-card-head" style="margin-bottom: 0.6rem">
        <div>
          <h2 style="font-size: 0.94rem">Notifications</h2>
          <p class="kw-hint" style="margin: 0.1rem 0 0">
            Browser permission: <strong>{{ permissionLabel(permission) }}</strong>
          </p>
        </div>
        <button
          v-if="permission === 'default' || permission === 'denied'"
          type="button"
          class="kw-btn kw-btn--tonal kw-btn--small"
          @click="enableNotifications"
        >
          <WorkspaceIcon name="bell" :size="15" />
          Enable
        </button>
      </header>

      <div class="kw-status-list">
        <div class="kw-status-row">
          <dt>In-app reminders</dt>
          <dd>
            <button
              type="button"
              class="kw-chip"
              :class="{ 'is-active': workspace.settings.inAppReminders }"
              :aria-pressed="workspace.settings.inAppReminders"
              @click="toggleInApp"
            >
              {{ workspace.settings.inAppReminders ? 'On' : 'Off' }}
            </button>
          </dd>
        </div>
        <div class="kw-status-row">
          <dt>Browser notifications</dt>
          <dd>
            <button
              type="button"
              class="kw-chip"
              :class="{ 'is-active': browserNotificationsEnabled && permission === 'granted' }"
              :aria-pressed="browserNotificationsEnabled && permission === 'granted'"
              :disabled="permission === 'unsupported'"
              @click="toggleBrowser"
            >
              {{ browserNotificationsEnabled && permission === 'granted' ? 'On' : 'Off' }}
            </button>
          </dd>
        </div>
      </div>

      <div class="kw-inline kw-mt-sm">
        <button type="button" class="kw-btn kw-btn--small" :disabled="permission === 'unsupported'" @click="testNotification">
          Send a test
        </button>
      </div>

      <div class="kw-notice kw-mt-sm">
        <WorkspaceIcon name="info" :size="18" />
        <span>{{ notificationLimitations() }}</span>
      </div>
    </section>

    <section class="kw-section">
      <header class="kw-section-head">
        <h2>
          <WorkspaceIcon name="alarm" :size="18" />
          Due now
          <span class="kw-count">{{ due.length }}</span>
        </h2>
      </header>
      <div v-if="due.length" class="kw-task-list">
        <div v-for="task in due" :key="task.id" class="kw-reminder is-due">
          <WorkspaceIcon name="bell" :size="18" style="margin-top: 0.1rem; color: var(--md-error)" />
          <div class="kw-reminder-body">
            <strong>{{ task.title }}</strong>
            <span>
              {{ task.reminderAt ? dateTimeLabel(task.reminderAt, now) : '' }}
              <template v-if="task.dueAt"> · deadline {{ dateTimeLabel(task.dueAt, now) }}</template>
            </span>
            <div class="kw-reminder-actions">
              <button
                v-for="option in shortSnoozes"
                :key="option.id"
                type="button"
                class="kw-chip"
                @click="snooze(task, option)"
              >
                <WorkspaceIcon name="snooze" :size="13" />
                {{ option.label }}
              </button>
              <button type="button" class="kw-chip" @click="dismiss(task)">Dismiss</button>
              <button type="button" class="kw-chip" @click="edit(task.id)">Open task</button>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="kw-hint" style="margin: 0">Nothing is ringing right now.</p>
    </section>

    <section class="kw-section">
      <header class="kw-section-head">
        <h2>
          <WorkspaceIcon name="clock" :size="18" />
          Next 24 hours
          <span class="kw-count">{{ nextDay.length }}</span>
        </h2>
      </header>
      <div v-if="nextDay.length" class="kw-task-list">
        <div v-for="task in nextDay" :key="task.id" class="kw-reminder">
          <WorkspaceIcon name="clock" :size="17" style="margin-top: 0.1rem; color: var(--md-primary)" />
          <div class="kw-reminder-body">
            <strong>{{ task.title }}</strong>
            <span>{{ reminderWhen(task, now) }} · {{ task.reminderAt ? dateTimeLabel(task.reminderAt, now) : '' }}</span>
            <div class="kw-reminder-actions">
              <button type="button" class="kw-chip" @click="edit(task.id)">Open task</button>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="kw-hint" style="margin: 0">No reminders in the next day.</p>
    </section>

    <details v-if="later.length" class="kw-section">
      <summary class="kw-btn kw-btn--small" style="display: inline-flex">
        Later ({{ later.length }})
      </summary>
      <div class="kw-task-list kw-mt-sm">
        <div v-for="task in later" :key="task.id" class="kw-reminder">
          <WorkspaceIcon name="calendar" :size="17" style="margin-top: 0.1rem; color: var(--md-on-surface-variant)" />
          <div class="kw-reminder-body">
            <strong>{{ task.title }}</strong>
            <span>{{ task.reminderAt ? dateTimeLabel(task.reminderAt, now) : '' }}</span>
          </div>
        </div>
      </div>
    </details>

    <div v-if="!anyReminders" class="kw-empty kw-mt-md">
      <WorkspaceIcon name="alarm" :size="30" />
      <strong>No reminders set</strong>
      <p>
        Open any task, set a reminder date and time, and it will appear here. Add
        a reminder from the task editor with one click.
      </p>
    </div>
  </BaseDialog>
</template>
