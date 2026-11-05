/**
 * Reminder rules.
 *
 * A reminder is a single timestamp on a task. Snoozing moves the effective
 * time without losing the original, and dismissing records *which* timestamp
 * was dismissed so editing the reminder later brings it back to life. All of
 * this is pure so the scheduler, the reminder sheet and the tests agree.
 */
import { MINUTE, dateTimeLabel, parseDate, relativeTimeLabel } from './dates'
import type { Task } from './model'

export type ReminderStatus = 'none' | 'upcoming' | 'snoozed' | 'due' | 'dismissed' | 'completed'

export interface SnoozeOption {
  id: string
  label: string
  minutes: number
}

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { id: '5m', label: '5 minutes', minutes: 5 },
  { id: '10m', label: '10 minutes', minutes: 10 },
  { id: '30m', label: '30 minutes', minutes: 30 },
  { id: '1h', label: '1 hour', minutes: 60 },
  { id: '3h', label: '3 hours', minutes: 180 },
  { id: 'tomorrow', label: 'Tomorrow 09:00', minutes: 24 * 60 }
]

/** When the reminder should actually fire, accounting for a snooze. */
export function effectiveReminderAt(task: Task): Date | null {
  const snoozed = parseDate(task.reminderSnoozedUntil)
  const base = parseDate(task.reminderAt)
  if (snoozed && base) return snoozed.getTime() > base.getTime() ? snoozed : base
  return snoozed ?? base
}

export function reminderStatus(task: Task, now = new Date()): ReminderStatus {
  if (task.status === 'done') return 'completed'
  const base = parseDate(task.reminderAt)
  if (!base) return 'none'
  const baseIso = base.toISOString()
  if (task.reminderDismissedFor === baseIso) return 'dismissed'
  const effective = effectiveReminderAt(task)
  if (!effective) return 'none'
  if (effective.getTime() > now.getTime()) {
    return parseDate(task.reminderSnoozedUntil) ? 'snoozed' : 'upcoming'
  }
  return 'due'
}

/**
 * Reminders the workspace should surface right now. `lastNotifiedAt` stops the
 * same occurrence from firing on every 15-second tick, while a snooze (which
 * changes the effective time) re-arms it.
 */
export function dueReminders(tasks: Task[], now = new Date()): Task[] {
  return tasks
    .filter((task) => {
      if (reminderStatus(task, now) !== 'due') return false
      const effective = effectiveReminderAt(task)
      if (!effective) return false
      const notified = parseDate(task.reminderNotifiedAt)
      return !notified || notified.getTime() < effective.getTime()
    })
    .sort((a, b) => (effectiveReminderAt(a)?.getTime() ?? 0) - (effectiveReminderAt(b)?.getTime() ?? 0))
}

/** Reminders that will fire inside the next `hours`. */
export function upcomingReminders(tasks: Task[], now = new Date(), hours = 24): Task[] {
  const horizon = now.getTime() + hours * 60 * MINUTE
  return tasks
    .filter((task) => {
      if (task.status === 'done') return false
      const effective = effectiveReminderAt(task)
      if (!effective) return false
      if (effective.getTime() <= now.getTime()) return false
      if (effective.getTime() > horizon) return false
      const base = parseDate(task.reminderAt)
      return !base || task.reminderDismissedFor !== base.toISOString()
    })
    .sort((a, b) => (effectiveReminderAt(a)?.getTime() ?? 0) - (effectiveReminderAt(b)?.getTime() ?? 0))
}

/** All future reminders, soonest first (the reminder sheet shows a short list). */
export function allUpcomingReminders(tasks: Task[], now = new Date()): Task[] {
  return tasks
    .filter((task) => {
      if (task.status === 'done') return false
      const effective = effectiveReminderAt(task)
      return Boolean(effective && effective.getTime() > now.getTime() && reminderStatus(task, now) !== 'dismissed')
    })
    .sort((a, b) => (effectiveReminderAt(a)?.getTime() ?? 0) - (effectiveReminderAt(b)?.getTime() ?? 0))
}

/** Move a reminder forward by a number of minutes. */
export function snoozeMinutes(minutes: number, now = new Date()): string {
  return new Date(now.getTime() + Math.max(1, minutes) * MINUTE).toISOString()
}

/** Resolve a snooze preset into an ISO timestamp. */
export function resolveSnooze(option: SnoozeOption, now = new Date()): string {
  if (option.id === 'tomorrow') {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString()
  }
  return new Date(now.getTime() + Math.max(1, option.minutes) * MINUTE).toISOString()
}

/** Return a copy of the task with the reminder snoozed until `until`. */
export function applySnooze(task: Task, until: string, now = new Date()): Task {
  return {
    ...task,
    reminderSnoozedUntil: until,
    reminderNotifiedAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
}

/** Dismiss the current reminder occurrence. */
export function dismissReminder(task: Task, now = new Date()): Task {
  const base = parseDate(task.reminderAt)
  return {
    ...task,
    reminderDismissedFor: base ? base.toISOString() : (task.reminderAt ?? null),
    reminderSnoozedUntil: null,
    reminderNotifiedAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
}

export function markNotified(task: Task, now = new Date()): Task {
  return { ...task, reminderNotifiedAt: now.toISOString() }
}

/** Editing the reminder timestamp re-arms it. */
export function resetReminderState(task: Task): Task {
  return {
    ...task,
    reminderSnoozedUntil: null,
    reminderDismissedFor: null,
    reminderNotifiedAt: null
  }
}

export function reminderLabel(task: Task, now = new Date()): string {
  const status = reminderStatus(task, now)
  const effective = effectiveReminderAt(task)
  if (!effective) return ''
  switch (status) {
    case 'due':
      return 'Reminder due'
    case 'snoozed':
      return `Snoozed to ${dateTimeLabel(effective, now)}`
    case 'dismissed':
      return 'Reminder dismissed'
    case 'completed':
      return 'Task completed'
    case 'upcoming':
      return `Reminds ${relativeTimeLabel(effective, now)}`
    default:
      return ''
  }
}

/** "in 2 h" style label used by the reminder sheet. */
export function reminderWhen(task: Task, now = new Date()): string {
  const effective = effectiveReminderAt(task)
  return effective ? relativeTimeLabel(effective, now) : ''
}
