/**
 * Manual cloud sync logic.
 *
 * GitHub is used as personal storage, never as an autosync target. These pure
 * helpers decide what a "Sync to Cloud" click should do and describe the
 * differences when two devices have diverged. The network calls live in
 * `cloud-client.ts`; the server keeps every token.
 */
import { dateTimeLabel, relativeTimeLabel } from './dates'
import {
  PRIORITY_LABEL,
  normalizeTask,
  type SavedLocation,
  type Task,
  type WorkspaceDoc,
  type WorkspaceSettings
} from './model'

export interface CloudFile {
  sha: string
  doc: WorkspaceDoc
  path?: string
  branch?: string
  size?: number
}

export interface SyncMeta {
  /** SHA of the cloud file at the last successful sync. */
  lastSha: string | null
  /** When the last successful sync happened. */
  lastSyncedAt: string | null
  /** Fingerprint of the workspace content at the last successful sync. */
  baseFingerprint: string | null
  lastResult?: 'synced' | 'restored' | null
}

export const EMPTY_SYNC_META: SyncMeta = {
  lastSha: null,
  lastSyncedAt: null,
  baseFingerprint: null,
  lastResult: null
}

/**
 * Stable representation of the *content* of a workspace.
 *
 * Volatile bookkeeping (save time, device, revision, last-notified timestamp)
 * is excluded on purpose: a reminder firing or a page reload must never make the
 * workspace look like it has unpushed changes.
 */
export function canonicalWorkspace(doc: WorkspaceDoc): string {
  const tasks = [...doc.tasks]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((task) => {
      const normalized = normalizeTask(task, new Date(task.createdAt))
      return [
        normalized.id,
        normalized.title,
        normalized.description,
        normalized.priority,
        normalized.category,
        normalized.status,
        normalized.subtasks
          .map((item) => `${item.id}:${item.done ? 1 : 0}:${item.title}`)
          .sort()
          .join('|'),
        normalized.startAt ?? '',
        normalized.dueAt ?? '',
        normalized.estimateMinutes ?? '',
        normalized.reminderAt ?? '',
        normalized.reminderSnoozedUntil ?? '',
        normalized.reminderDismissedFor ?? '',
        normalized.outdoor ? 1 : 0,
        normalized.createdAt,
        normalized.completedAt ?? ''
      ].join('\u0001')
    })
    .join('\u0002')

  const settings = canonicalSettings(doc.settings)
  return `${tasks}\u0003${settings}`
}

function canonicalLocation(location: SavedLocation | null): string {
  if (!location) return ''
  return [
    location.adm4,
    location.label,
    location.provinsi ?? '',
    location.kotkab ?? '',
    location.kecamatan ?? '',
    location.desa ?? ''
  ].join('\u0001')
}

function canonicalSettings(settings: WorkspaceSettings): string {
  return [
    canonicalLocation(settings.weatherLocation),
    settings.recentLocations.map(canonicalLocation).join('\u0002'),
    settings.defaultReminderMinutes ?? '',
    settings.inAppReminders ? 1 : 0
  ].join('\u0001')
}

/** cyrb53-style fingerprint; short, stable and good enough to detect edits. */
export function fingerprint(doc: WorkspaceDoc): string {
  return hashString(canonicalWorkspace(doc))
}

export function hashString(input: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`
}

export function docsEqual(a: WorkspaceDoc | null, b: WorkspaceDoc | null): boolean {
  if (!a || !b) return a === b
  return canonicalWorkspace(a) === canonicalWorkspace(b)
}

export function hasContent(doc: WorkspaceDoc): boolean {
  return (
    doc.tasks.length > 0 ||
    Boolean(doc.settings.weatherLocation) ||
    doc.settings.recentLocations.length > 0 ||
    doc.settings.defaultReminderMinutes !== null
  )
}

/** Does the local workspace differ from the last successfully synced content? */
export function hasPendingLocalChanges(doc: WorkspaceDoc, meta: SyncMeta): boolean {
  if (!hasContent(doc)) return false
  if (!meta.baseFingerprint) return true
  return fingerprint(doc) !== meta.baseFingerprint
}

export type SyncAction =
  | 'nothing'
  | 'create'
  | 'push'
  | 'pull'
  | 'up-to-date'
  | 'conflict'

export type SyncReason =
  | 'cloud-empty'
  | 'local-empty'
  | 'first-sync'
  | 'remote-changed'
  | 'local-changed'
  | 'in-sync'
  | 'no-changes'

export interface SyncDecision {
  action: SyncAction
  reason: SyncReason
  /** Ready-to-show explanation for the cloud panel. */
  message: string
}

/**
 * Decide what a manual sync click means.
 *
 * - `create`  writable cloud file does not exist yet and local has content
 * - `push`    the cloud file is exactly the revision this device last synced
 * - `pull`    nothing changed locally, but another device wrote a new revision
 * - `conflict` both sides changed (or a first sync found existing cloud data)
 */
export function decideSyncAction(
  local: WorkspaceDoc,
  cloud: CloudFile | null,
  meta: SyncMeta
): SyncDecision {
  const localFingerprint = fingerprint(local)
  const localEmpty = !hasContent(local)

  if (!cloud) {
    if (localEmpty) {
      return {
        action: 'nothing',
        reason: 'local-empty',
        message: 'There is nothing to upload yet.'
      }
    }
    return {
      action: 'create',
      reason: 'cloud-empty',
      message: 'The cloud file does not exist yet. Sync will create it.'
    }
  }

  if (docsEqual(local, cloud.doc)) {
    return {
      action: 'up-to-date',
      reason: 'in-sync',
      message: 'This device and the cloud already match.'
    }
  }

  if (!meta.baseFingerprint) {
    if (localEmpty) {
      return {
        action: 'pull',
        reason: 'local-empty',
        message: 'This device is empty. Restore the workspace from the cloud.'
      }
    }
    return {
      action: 'conflict',
      reason: 'first-sync',
      message:
        'This device has never synced, and the cloud already contains a workspace. Pick which side to keep.'
    }
  }

  const localChanged = localFingerprint !== meta.baseFingerprint

  if (meta.lastSha === cloud.sha) {
    if (!localChanged) {
      return {
        action: 'up-to-date',
        reason: 'in-sync',
        message: 'No local changes since the last sync.'
      }
    }
    return {
      action: 'push',
      reason: 'local-changed',
      message: 'Upload the local changes to the cloud.'
    }
  }

  // The cloud file moved since this device last synced.
  if (!localChanged) {
    return {
      action: 'pull',
      reason: 'remote-changed',
      message: 'Another device updated the cloud workspace. Restore it to catch up.'
    }
  }

  return {
    action: 'conflict',
    reason: 'remote-changed',
    message:
      'Both this device and the cloud changed since the last sync. Nothing was uploaded.'
  }
}

export interface FieldChange {
  field: string
  label: string
  local: string
  cloud: string
}

export type TaskDiffKind = 'local-only' | 'cloud-only' | 'changed'

export interface TaskDiff {
  id: string
  title: string
  kind: TaskDiffKind
  changes: FieldChange[]
}

export interface WorkspaceDiff {
  tasks: TaskDiff[]
  settings: FieldChange[]
  counts: {
    localOnly: number
    cloudOnly: number
    changed: number
    localTotal: number
    cloudTotal: number
  }
}

function taskValue(task: Task, field: string): string {
  switch (field) {
    case 'title':
      return task.title
    case 'description':
      return task.description ? task.description.slice(0, 120) : '—'
    case 'priority':
      return PRIORITY_LABEL[task.priority]
    case 'category':
      return task.category || '—'
    case 'status':
      return task.status === 'done' ? 'Completed' : 'Open'
    case 'startAt':
      return task.startAt ? dateTimeLabel(task.startAt) : '—'
    case 'dueAt':
      return task.dueAt ? dateTimeLabel(task.dueAt) : '—'
    case 'estimateMinutes':
      return task.estimateMinutes ? `${task.estimateMinutes} min` : '—'
    case 'reminderAt':
      return task.reminderAt ? dateTimeLabel(task.reminderAt) : '—'
    case 'outdoor':
      return task.outdoor ? 'Yes' : 'No'
    case 'subtasks':
      return task.subtasks.length
        ? `${task.subtasks.filter((item) => item.done).length}/${task.subtasks.length} done`
        : '—'
    default:
      return ''
  }
}

const COMPARED_FIELDS: Array<{ field: string; label: string }> = [
  { field: 'title', label: 'Title' },
  { field: 'description', label: 'Description' },
  { field: 'priority', label: 'Priority' },
  { field: 'category', label: 'Category' },
  { field: 'status', label: 'Status' },
  { field: 'startAt', label: 'Starts' },
  { field: 'dueAt', label: 'Deadline' },
  { field: 'estimateMinutes', label: 'Estimate' },
  { field: 'reminderAt', label: 'Reminder' },
  { field: 'outdoor', label: 'Outdoor' },
  { field: 'subtasks', label: 'Subtasks' }
]

/** Task- and field-level differences between the local and cloud workspaces. */
export function diffWorkspaces(local: WorkspaceDoc, cloud: WorkspaceDoc): WorkspaceDiff {
  const localTasks = new Map(local.tasks.map((task) => [task.id, task]))
  const cloudTasks = new Map(cloud.tasks.map((task) => [task.id, task]))
  const tasks: TaskDiff[] = []
  let localOnly = 0
  let cloudOnly = 0
  let changed = 0

  localTasks.forEach((task, id) => {
    const remote = cloudTasks.get(id)
    if (!remote) {
      localOnly += 1
      tasks.push({ id, title: task.title, kind: 'local-only', changes: [] })
      return
    }
    const changes: FieldChange[] = []
    COMPARED_FIELDS.forEach(({ field, label }) => {
      const localValue = taskValue(task, field)
      const cloudValue = taskValue(remote, field)
      if (localValue !== cloudValue) {
        changes.push({ field, label, local: localValue, cloud: cloudValue })
      }
    })
    if (changes.length) {
      changed += 1
      tasks.push({ id, title: task.title || remote.title, kind: 'changed', changes })
    }
  })

  cloudTasks.forEach((task, id) => {
    if (localTasks.has(id)) return
    cloudOnly += 1
    tasks.push({ id, title: task.title, kind: 'cloud-only', changes: [] })
  })

  const settings: FieldChange[] = []
  const localLocation = local.settings.weatherLocation
  const cloudLocation = cloud.settings.weatherLocation
  if ((localLocation?.adm4 ?? '') !== (cloudLocation?.adm4 ?? '')) {
    settings.push({
      field: 'weatherLocation',
      label: 'Weather location',
      local: localLocation?.label ?? 'Not set',
      cloud: cloudLocation?.label ?? 'Not set'
    })
  }
  if (local.settings.defaultReminderMinutes !== cloud.settings.defaultReminderMinutes) {
    settings.push({
      field: 'defaultReminderMinutes',
      label: 'Default reminder',
      local: local.settings.defaultReminderMinutes
        ? `${local.settings.defaultReminderMinutes} min before`
        : 'None',
      cloud: cloud.settings.defaultReminderMinutes
        ? `${cloud.settings.defaultReminderMinutes} min before`
        : 'None'
    })
  }

  tasks.sort((a, b) => {
    const order: Record<TaskDiffKind, number> = { changed: 0, 'local-only': 1, 'cloud-only': 2 }
    return order[a.kind] - order[b.kind] || a.title.localeCompare(b.title)
  })

  return {
    tasks,
    settings,
    counts: {
      localOnly,
      cloudOnly,
      changed,
      localTotal: local.tasks.length,
      cloudTotal: cloud.tasks.length
    }
  }
}

/** One-line summary for a conflict dialog. */
export function diffSummary(diff: WorkspaceDiff): string {
  const parts: string[] = []
  if (diff.counts.changed) parts.push(`${diff.counts.changed} changed`)
  if (diff.counts.localOnly) parts.push(`${diff.counts.localOnly} only here`)
  if (diff.counts.cloudOnly) parts.push(`${diff.counts.cloudOnly} only in the cloud`)
  if (!parts.length && diff.settings.length) parts.push('settings differ')
  return parts.length ? parts.join(' · ') : 'No task differences'
}

export function syncStatusLabel(meta: SyncMeta, now = new Date()): string {
  if (!meta.lastSyncedAt) return 'Never synced'
  return `Last synced ${relativeTimeLabel(meta.lastSyncedAt, now)}`
}

/* --------------------------------------------------------------- responses */

export interface SessionInfo {
  connected: boolean
  user?: { login: string; name: string | null; avatarUrl: string; profileUrl: string }
  repo?: { owner: string; name: string; url: string; private: boolean; branch: string; path: string }
  expiresAt?: string
  reason?: string
}

export interface CloudWorkspaceResponse {
  exists: boolean
  sha: string | null
  doc: WorkspaceDoc | null
  path?: string
  branch?: string
  size?: number
}
