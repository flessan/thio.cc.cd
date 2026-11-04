/**
 * The in-app reminder scheduler.
 *
 * A 15-second tick compares due reminders with the last time each one fired.
 * The workspace has to be open for this to do anything: there is no service
 * worker and no push subscription, so we never imply notifications arrive while
 * the browser is closed.
 */
import {
  SNOOZE_OPTIONS,
  applySnooze,
  dismissReminder,
  dueReminders,
  reminderWhen,
  resolveSnooze,
  type SnoozeOption
} from './reminders'
import { markTaskNotified, replaceTask, workspace } from './state'
import { pushToast } from './toasts'
import {
  browserNotificationsEnabled,
  browserPermission,
  notificationLimitations,
  showBrowserNotification
} from './notifications'

const TICK_MS = 15_000
let timer: number | undefined
let installed = false

const SHORT_SNOOZE = (SNOOZE_OPTIONS[1] ?? SNOOZE_OPTIONS[0]) as SnoozeOption

function channelActive(): boolean {
  const inApp = workspace.settings.inAppReminders
  const browser = browserNotificationsEnabled.value && browserPermission() === 'granted'
  return inApp || browser
}

function snooze(taskId: string, option: SnoozeOption): void {
  const task = workspace.tasks.find((item) => item.id === taskId)
  if (!task) return
  const until = resolveSnooze(option)
  const next = applySnooze(task, until)
  replaceTask(next)
  pushToast({
    tone: 'info',
    title: 'Reminder snoozed',
    message: `We will remind you again ${reminderWhen(next)}.`
  })
}

function dismiss(taskId: string): void {
  const task = workspace.tasks.find((item) => item.id === taskId)
  if (!task) return
  replaceTask(dismissReminder(task))
  pushToast({ tone: 'info', title: 'Reminder dismissed', message: task.title })
}

/** Check once and show anything that became due since the last tick. */
export function checkReminders(now = new Date()): void {
  if (!workspace.ready || !channelActive()) return
  const due = dueReminders(workspace.tasks, now)
  due.forEach((task) => {
    markTaskNotified(task, now)
    const body = task.dueAt
      ? `Deadline: ${new Date(task.dueAt).toLocaleString()}`
      : task.description || 'No deadline set'
    if (workspace.settings.inAppReminders) {
      pushToast({
        tone: 'warning',
        title: `Reminder: ${task.title}`,
        message: body,
        duration: 20_000,
        actions: [
          { label: `Snooze ${SHORT_SNOOZE.label}`, run: () => snooze(task.id, SHORT_SNOOZE) },
          { label: 'Dismiss', run: () => dismiss(task.id) }
        ]
      })
    }
    if (document.hidden) {
      showBrowserNotification(`Kerja reminder: ${task.title}`, `${body}\n${notificationLimitations()}`)
    }
  })
}

/** Install the ticker once; returns a cleanup function. */
export function installReminderScheduler(): () => void {
  if (typeof window === 'undefined' || installed) return () => undefined
  installed = true
  const trigger = () => checkReminders(new Date())
  timer = window.setInterval(trigger, TICK_MS)
  window.addEventListener('focus', trigger)
  document.addEventListener('visibilitychange', trigger)
  trigger()
  return () => {
    installed = false
    if (timer) window.clearInterval(timer)
    timer = undefined
    window.removeEventListener('focus', trigger)
    document.removeEventListener('visibilitychange', trigger)
  }
}

