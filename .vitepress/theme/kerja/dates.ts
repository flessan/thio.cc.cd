/**
 * Local-time date helpers for the /kerja workspace.
 *
 * Task dates are stored as ISO-8601 UTC strings so they stay comparable and
 * sync cleanly between devices. Everything the visitor sees is rendered in
 * *their* local time, which is why the helpers below deliberately work with the
 * local Date fields instead of slicing UTC strings.
 */

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

const pad = (value: number) => String(value).padStart(2, '0')

/** Parse an ISO timestamp, returning null for empty or invalid input. */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `YYYY-MM-DD` in the visitor's local timezone. */
export function localDayKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0)
}

export function endOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999)
}

export function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(value: Date, now = new Date()): boolean {
  return isSameDay(value, now)
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MINUTE)
}

/** `HH:mm` in local time. */
export function clockTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Value for `<input type="datetime-local">` in local time. */
export function toDateTimeInput(value: Date | string | null): string {
  const date = parseDate(value)
  if (!date) return ''
  return `${localDayKey(date)}T${clockTime(date)}`
}

/** Turn a `datetime-local` input value into an ISO UTC string. */
export function fromDateTimeInput(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Human day label: Today, Tomorrow, Mon 4 Nov, or 4 Nov 2027. */
export function dayLabel(value: Date | string, now = new Date()): string {
  const date = parseDate(value)
  if (!date) return ''
  const key = localDayKey(date)
  if (key === localDayKey(now)) return 'Today'
  if (key === localDayKey(addDays(now, 1))) return 'Tomorrow'
  if (key === localDayKey(addDays(now, -1))) return 'Yesterday'
  const sameYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' })
  }).format(date)
}

/** "Today 17:00", "Tomorrow 09:30", "Mon 4 Nov 14:00". */
export function dateTimeLabel(value: Date | string | null, now = new Date()): string {
  const date = parseDate(value)
  if (!date) return ''
  return `${dayLabel(date, now)} ${clockTime(date)}`
}

export function fullDateLabel(value: Date | string, now = new Date()): string {
  const date = parseDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' })
  }).format(date)
}

/** Short, human due-date phrasing used on task rows. */
export function dueLabel(value: string | null, now = new Date()): string {
  const date = parseDate(value)
  if (!date) return ''
  const diff = date.getTime() - now.getTime()
  const absolute = Math.abs(diff)
  const key = localDayKey(date)
  const todayKey = localDayKey(now)

  if (key === todayKey) {
    if (diff < 0) return `Overdue by ${durationLabel(absolute)}`
    return `Due ${clockTime(date)}`
  }
  if (key === localDayKey(addDays(now, 1))) return `Tomorrow ${clockTime(date)}`
  if (key === localDayKey(addDays(now, -1))) return `Yesterday ${clockTime(date)}`

  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY)
  if (days > 1 && days <= 7) return `${dayLabel(date, now)} ${clockTime(date)}`
  return dateTimeLabel(date, now)
}

/** "45 min", "1 h 20 min", "3 h". */
export function durationLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

/** Compact "in 3 days" / "2 h ago" phrasing for sync and reminder rows. */
export function relativeTimeLabel(value: DateChoices, now = new Date()): string {
  const date = parseDate(value)
  if (!date) return ''
  const diff = date.getTime() - now.getTime()
  const future = diff >= 0
  const absolute = Math.abs(diff)
  let amount: string
  if (absolute < MINUTE) return future ? 'in a moment' : 'just now'
  if (absolute < HOUR) amount = `${Math.round(absolute / MINUTE)} min`
  else if (absolute < DAY) amount = `${Math.round(absolute / HOUR)} h`
  else if (absolute < 7 * DAY) amount = `${Math.round(absolute / DAY)} d`
  else return dateTimeLabel(date, now)
  return future ? `in ${amount}` : `${amount} ago`
}

type DateChoices = string | Date | null | undefined

/** Start of the ISO week (Monday) containing `value`. */
export function startOfWeek(value: Date): Date {
  const day = startOfDay(value)
  const weekday = (day.getDay() + 6) % 7
  return addDays(day, -weekday)
}
