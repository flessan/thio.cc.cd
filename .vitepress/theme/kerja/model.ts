/**
 * The workspace data model.
 *
 * Everything here is plain, serialisable data: tasks, settings and the versioned
 * workspace document that is written to IndexedDB and (only on request) to the
 * private GitHub repository. The normalisers are deliberately forgiving so a
 * file written by an older build, or edited by hand, can never crash the app.
 */

export const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const TASK_STATUSES = ['open', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  category: string
  status: TaskStatus
  subtasks: Subtask[]
  /** When work should begin (ISO UTC). */
  startAt: string | null
  /** Hard deadline (ISO UTC). */
  dueAt: string | null
  /** Estimate in minutes; null when unknown. */
  estimateMinutes: number | null
  /** When the reminder should fire (ISO UTC). */
  reminderAt: string | null
  /** A snooze moves the *effective* reminder time without losing the original. */
  reminderSnoozedUntil: string | null
  /** The reminder timestamp that was dismissed, so it never fires twice. */
  reminderDismissedFor: string | null
  /** Last time a notification fired for the current reminder occurrence. */
  reminderNotifiedAt: string | null
  /** Outdoor tasks get forecast hints from the BMKG integration. */
  outdoor: boolean
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface SavedLocation {
  adm4: string
  /** Human label chosen from the regency list, e.g. "Kota Banjarmasin". */
  label: string
  provinsi?: string
  kotkab?: string
  kecamatan?: string
  desa?: string
}

export interface WorkspaceSettings {
  /** The BMKG location the visitor explicitly picked. Never guessed. */
  weatherLocation: SavedLocation | null
  recentLocations: SavedLocation[]
  /** Default reminder offset applied by quick-add, in minutes. */
  defaultReminderMinutes: number | null
  /** In-app reminder banners while the workspace is open. */
  inAppReminders: boolean
}

export interface WorkspaceDoc {
  format: 'kerja-workspace'
  version: 1
  /** ISO timestamp of the last local write. */
  savedAt: string
  /** Which device produced the doc; metadata only, not content. */
  device: { id: string; name: string }
  /** Monotonic local revision, useful for debugging and UI copy. */
  revision: number
  tasks: Task[]
  settings: WorkspaceSettings
}

export const WORKSPACE_FORMAT = 'kerja-workspace'
export const WORKSPACE_VERSION = 1
export const MAX_TASKS = 5_000
export const MAX_SUBTASKS = 100

export const PRIORITY_RANK: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export const PRIORITY_HINT: Record<Priority, string> = {
  critical: 'Drop everything for this',
  high: 'Do this next',
  medium: 'Normal priority',
  low: 'Whenever there is room'
}

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  weatherLocation: null,
  recentLocations: [],
  defaultReminderMinutes: null,
  inAppReminders: true
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
}

/** Small id helper; `crypto.randomUUID` when available, random bytes otherwise. */
export function newId(prefix = 'id'): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}_${globalCrypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  }
  let out = ''
  for (let i = 0; i < 20; i += 1) out += Math.floor(Math.random() * 16).toString(16)
  return `${prefix}_${out}`
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function minutes(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded <= 0) return null
  return Math.min(rounded, 60 * 24 * 30)
}

export function normalizeSubtask(raw: unknown): Subtask {
  const source = (raw ?? {}) as Record<string, unknown>
  return {
    id: text(source.id) || newId('sub'),
    title: text(source.title).slice(0, 300),
    done: bool(source.done)
  }
}

/** Coerce anything into a safe Task. Unknown fields are dropped. */
export function normalizeTask(raw: unknown, now = new Date()): Task {
  const source = (raw ?? {}) as Record<string, unknown>
  const createdAt = isoOrNull(source.createdAt) ?? now.toISOString()
  const status: TaskStatus = source.status === 'done' ? 'done' : 'open'
  const subtasks = Array.isArray(source.subtasks)
    ? source.subtasks.slice(0, MAX_SUBTASKS).map(normalizeSubtask)
    : []
  return {
    id: text(source.id) || newId('task'),
    title: text(source.title).trim().slice(0, 300) || 'Untitled task',
    description: text(source.description).slice(0, 20_000),
    priority: isPriority(source.priority) ? source.priority : 'medium',
    category: text(source.category).trim().slice(0, 60),
    status,
    subtasks,
    startAt: isoOrNull(source.startAt),
    dueAt: isoOrNull(source.dueAt),
    estimateMinutes: minutes(source.estimateMinutes),
    reminderAt: isoOrNull(source.reminderAt),
    reminderSnoozedUntil: isoOrNull(source.reminderSnoozedUntil),
    reminderDismissedFor: isoOrNull(source.reminderDismissedFor),
    reminderNotifiedAt: isoOrNull(source.reminderNotifiedAt),
    outdoor: bool(source.outdoor),
    createdAt,
    updatedAt: isoOrNull(source.updatedAt) ?? createdAt,
    completedAt: status === 'done' ? isoOrNull(source.completedAt) ?? now.toISOString() : null
  }
}

export function normalizeLocation(raw: unknown): SavedLocation | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const adm4 = text(source.adm4).trim()
  if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(adm4)) return null
  return {
    adm4,
    label: text(source.label).trim().slice(0, 160) || adm4,
    provinsi: text(source.provinsi).trim() || undefined,
    kotkab: text(source.kotkab).trim() || undefined,
    kecamatan: text(source.kecamatan).trim() || undefined,
    desa: text(source.desa).trim() || undefined
  }
}

export function normalizeSettings(raw: unknown): WorkspaceSettings {
  const source = (raw ?? {}) as Record<string, unknown>
  const recent = Array.isArray(source.recentLocations)
    ? source.recentLocations
        .map(normalizeLocation)
        .filter((item): item is SavedLocation => Boolean(item))
        .slice(0, 8)
    : []
  return {
    weatherLocation: normalizeLocation(source.weatherLocation),
    recentLocations: recent,
    defaultReminderMinutes: minutes(source.defaultReminderMinutes),
    inAppReminders: bool(source.inAppReminders, true)
  }
}

export function createTask(input: Partial<Task> = {}, now = new Date()): Task {
  const timestamp = now.toISOString()
  return normalizeTask(
    {
      ...input,
      id: input.id ?? newId('task'),
      createdAt: input.createdAt ?? timestamp,
      updatedAt: input.updatedAt ?? timestamp
    },
    now
  )
}

export function emptyWorkspaceDoc(
  device: { id: string; name: string },
  now = new Date()
): WorkspaceDoc {
  return {
    format: WORKSPACE_FORMAT,
    version: WORKSPACE_VERSION,
    savedAt: now.toISOString(),
    device,
    revision: 1,
    tasks: [],
    settings: { ...DEFAULT_SETTINGS, recentLocations: [] }
  }
}

export interface NormalizedWorkspace {
  doc: WorkspaceDoc
  changed: boolean
  issue?: string
}

/**
 * Accepts a cloud file or an older local document and returns a valid one.
 * `changed` says whether normalisation actually had to repair anything, which
 * the cloud panel uses to warn before restoring.
 */
export function normalizeWorkspaceDoc(
  raw: unknown,
  fallbackDevice: { id: string; name: string },
  now = new Date()
): NormalizedWorkspace {
  const fallback = emptyWorkspaceDoc(fallbackDevice, now)
  if (!raw || typeof raw !== 'object') {
    return { doc: fallback, changed: true, issue: 'The workspace file is not a JSON object.' }
  }
  const source = raw as Record<string, unknown>
  if (source.format !== WORKSPACE_FORMAT) {
    return {
      doc: fallback,
      changed: true,
      issue: 'The file does not look like a Kerja workspace.'
    }
  }
  if (typeof source.version === 'number' && source.version > WORKSPACE_VERSION) {
    return {
      doc: fallback,
      changed: true,
      issue: `The file was written by a newer workspace version (${source.version}).`
    }
  }
  const tasks = Array.isArray(source.tasks)
    ? source.tasks.slice(0, MAX_TASKS).map((task) => normalizeTask(task, now))
    : []
  const device = (source.device ?? {}) as Record<string, unknown>
  const doc: WorkspaceDoc = {
    format: WORKSPACE_FORMAT,
    version: WORKSPACE_VERSION,
    savedAt: isoOrNull(source.savedAt) ?? now.toISOString(),
    device: {
      id: text(device.id) || fallbackDevice.id,
      name: text(device.name) || fallbackDevice.name
    },
    revision:
      typeof source.revision === 'number' && Number.isFinite(source.revision)
        ? Math.max(1, Math.floor(source.revision))
        : 1,
    tasks,
    settings: normalizeSettings(source.settings)
  }
  return {
    doc,
    changed: !Array.isArray(source.tasks) || source.version !== WORKSPACE_VERSION
  }
}

/** Subtask completion in the 0..1 range. */
export function subtaskProgress(task: Task): { done: number; total: number; ratio: number } {
  const total = task.subtasks.length
  const done = task.subtasks.filter((item) => item.done).length
  return { done, total, ratio: total === 0 ? 0 : done / total }
}

/** Field-level validation used by the task editor before saving. */
export interface TaskDraftErrors {
  title?: string
  estimate?: string
  reminder?: string
  dates?: string
}

export function validateTaskDraft(draft: {
  title: string
  startAt?: string | null
  dueAt?: string | null
  reminderAt?: string | null
  estimateMinutes?: number | null
}): TaskDraftErrors {
  const errors: TaskDraftErrors = {}
  if (!draft.title.trim()) errors.title = 'Give the task a short title.'
  if (
    draft.estimateMinutes !== null &&
    draft.estimateMinutes !== undefined &&
    (!Number.isFinite(draft.estimateMinutes) || draft.estimateMinutes <= 0)
  ) {
    errors.estimate = 'Use a positive number of minutes.'
  }
  const start = isoOrNull(draft.startAt)
  const due = isoOrNull(draft.dueAt)
  if (start && due && new Date(due) < new Date(start)) {
    errors.dates = 'The deadline is before the start date.'
  }
  const reminder = isoOrNull(draft.reminderAt)
  if (reminder && due && new Date(reminder) > new Date(due)) {
    errors.reminder = 'The reminder is after the deadline.'
  }
  return errors
}
