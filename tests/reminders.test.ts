import { describe, expect, it } from 'vitest'
import {
  SNOOZE_OPTIONS,
  allUpcomingReminders,
  applySnooze,
  dismissReminder,
  dueReminders,
  effectiveReminderAt,
  markNotified,
  reminderStatus,
  resetReminderState,
  resolveSnooze,
  snoozeMinutes,
  upcomingReminders
} from '../.vitepress/theme/kerja/reminders'
import { createTask } from '../.vitepress/theme/kerja/model'

const now = new Date(2026, 10, 4, 9, 0, 0)

function reminderTask(reminderAt: string, input: Record<string, unknown> = {}) {
  return createTask({ title: 'Stand up', reminderAt, ...input }, now)
}

describe('reminder status', () => {
  it('distinguishes upcoming, due, snoozed, dismissed and completed', () => {
    const future = reminderTask(new Date(2026, 10, 4, 10, 0).toISOString())
    expect(reminderStatus(future, now)).toBe('upcoming')

    const due = reminderTask(new Date(2026, 10, 4, 8, 55).toISOString())
    expect(reminderStatus(due, now)).toBe('due')

    const snoozed = applySnooze(
      reminderTask(new Date(2026, 10, 4, 8, 55).toISOString()),
      new Date(2026, 10, 4, 9, 10).toISOString(),
      now
    )
    expect(reminderStatus(snoozed, now)).toBe('snoozed')
    expect(effectiveReminderAt(snoozed)?.toISOString()).toBe(
      new Date(2026, 10, 4, 9, 10).toISOString()
    )

    const dismissed = dismissReminder(
      reminderTask(new Date(2026, 10, 4, 8, 55).toISOString()),
      now
    )
    expect(reminderStatus(dismissed, now)).toBe('dismissed')

    const done = reminderTask(new Date(2026, 10, 4, 8, 55).toISOString(), { status: 'done' })
    expect(reminderStatus(done, now)).toBe('completed')

    expect(reminderStatus(createTask({ title: 'none' }, now), now)).toBe('none')
  })

  it('does not let a snooze shorten the original reminder time', () => {
    const task = reminderTask(new Date(2026, 10, 4, 12, 0).toISOString())
    const earlier = { ...task, reminderSnoozedUntil: new Date(2026, 10, 4, 10, 0).toISOString() }
    expect(effectiveReminderAt(earlier)?.toISOString()).toBe(
      new Date(2026, 10, 4, 12, 0).toISOString()
    )
  })
})

describe('due reminder collection', () => {
  it('returns due reminders once, until they are snoozed or re-armed', () => {
    const due = reminderTask(new Date(2026, 10, 4, 8, 55).toISOString())
    expect(dueReminders([due], now)).toHaveLength(1)

    const notified = markNotified(due, now)
    expect(dueReminders([notified], now)).toHaveLength(0)

    const snoozed = applySnooze(notified, new Date(2026, 10, 4, 9, 5).toISOString(), now)
    expect(dueReminders([snoozed], now)).toHaveLength(0)
    expect(dueReminders([snoozed], new Date(2026, 10, 4, 9, 6))).toHaveLength(1)
  })

  it('ignores completed tasks and dismissed occurrences', () => {
    const done = reminderTask(new Date(2026, 10, 4, 8, 55).toISOString(), { status: 'done' })
    const dismissed = dismissReminder(
      reminderTask(new Date(2026, 10, 4, 8, 55).toISOString()),
      now
    )
    expect(dueReminders([done, dismissed], now)).toEqual([])
  })

  it('brings a reminder back when its timestamp is edited', () => {
    const dismissed = dismissReminder(
      reminderTask(new Date(2026, 10, 4, 8, 55).toISOString()),
      now
    )
    const edited = resetReminderState({
      ...dismissed,
      reminderAt: new Date(2026, 10, 4, 8, 50).toISOString()
    })
    expect(dueReminders([edited], now)).toHaveLength(1)
  })
})

describe('upcoming reminders', () => {
  it('lists the next 24 hours in order', () => {
    const soon = reminderTask(new Date(2026, 10, 4, 10, 0).toISOString())
    const later = reminderTask(new Date(2026, 10, 4, 15, 0).toISOString())
    const far = reminderTask(new Date(2026, 10, 8, 10, 0).toISOString())
    expect(upcomingReminders([later, far, soon], now, 24).map((item) => item.title)).toEqual([
      'Stand up',
      'Stand up'
    ])
    expect(allUpcomingReminders([later, far, soon], now)).toHaveLength(3)
  })

  it('skips dismissed and completed reminders', () => {
    const dismissed = dismissReminder(
      reminderTask(new Date(2026, 10, 4, 10, 0).toISOString()),
      now
    )
    const done = reminderTask(new Date(2026, 10, 4, 10, 0).toISOString(), { status: 'done' })
    expect(allUpcomingReminders([dismissed, done], now)).toEqual([])
  })
})

describe('snooze helpers', () => {
  it('offers a fixed preset list and resolves relative presets', () => {
    expect(SNOOZE_OPTIONS.map((option) => option.id)).toContain('10m')
    const option = SNOOZE_OPTIONS.find((item) => item.id === '10m')!
    expect(resolveSnooze(option, now)).toBe(new Date(2026, 10, 4, 9, 10).toISOString())
    expect(snoozeMinutes(5, now)).toBe(new Date(2026, 10, 4, 9, 5).toISOString())
  })

  it('resolves the tomorrow preset to 09:00 local time', () => {
    const option = SNOOZE_OPTIONS.find((item) => item.id === 'tomorrow')!
    const resolved = new Date(resolveSnooze(option, now))
    expect(resolved.getDate()).toBe(5)
    expect(resolved.getHours()).toBe(9)
    expect(resolved.getMinutes()).toBe(0)
  })
})
