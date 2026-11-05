/**
 * The reactive workspace store.
 *
 * One module-level singleton keeps the task list, settings and sync bookkeeping
 * in memory, writes to IndexedDB on a short debounce, and hands out plain
 * `WorkspaceDoc` snapshots for the manual cloud sync. Cloud writes are never
 * triggered here; `cloud-client.ts` owns that decision.
 */
import { computed, reactive } from 'vue'
import {
  DEFAULT_SETTINGS,
  WORKSPACE_FORMAT,
  WORKSPACE_VERSION,
  createTask,
  emptyWorkspaceDoc,
  normalizeTask,
  normalizeWorkspaceDoc,
  type SavedLocation,
  type Subtask,
  type Task,
  type WorkspaceDoc,
  type WorkspaceSettings
} from './model'
import { EMPTY_SYNC_META, hasPendingLocalChanges, fingerprint, type SyncMeta } from './cloud'
import { resetReminderState } from './reminders'
import {
  detectDeviceName,
  loadDeviceId,
  loadSyncMeta,
  loadWorkspace,
  saveSyncMeta,
  saveWorkspace,
  storageMode,
  type StorageMode
} from './storage'

interface WorkspaceState {
  ready: boolean
  loading: boolean
  error: string
  tasks: Task[]
  settings: WorkspaceSettings
  meta: SyncMeta
  device: { id: string; name: string }
  revision: number
  savedAt: string | null
  storage: StorageMode
  saving: boolean
}

export const workspace = reactive<WorkspaceState>({
  ready: false,
  loading: false,
  error: '',
  tasks: [],
  settings: { ...DEFAULT_SETTINGS, recentLocations: [] },
  meta: { ...EMPTY_SYNC_META },
  device: { id: '', name: 'Device' },
  revision: 1,
  savedAt: null,
  storage: 'memory',
  saving: false
})

let initialized = false
let saveTimer: number | undefined
let resolveReady: (() => void) | null = null
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export const whenWorkspaceReady = (): Promise<void> => readyPromise

export const pendingLocalChanges = computed(() =>
  hasPendingLocalChanges(snapshotDoc(), workspace.meta)
)

/** Plain snapshot for IndexedDB, GitHub uploads and fingerprinting. */
export function snapshotDoc(now = new Date()): WorkspaceDoc {
  return {
    format: WORKSPACE_FORMAT,
    version: WORKSPACE_VERSION,
    savedAt: workspace.savedAt ?? now.toISOString(),
    device: { ...workspace.device },
    revision: workspace.revision,
    tasks: workspace.tasks.map((task) => ({ ...task, subtasks: task.subtasks.map((item) => ({ ...item })) })),
    settings: {
      ...workspace.settings,
      weatherLocation: workspace.settings.weatherLocation
        ? { ...workspace.settings.weatherLocation }
        : null,
      recentLocations: workspace.settings.recentLocations.map((item) => ({ ...item }))
    }
  }
}

export function currentFingerprint(): string {
  return fingerprint(snapshotDoc())
}

function applyDoc(doc: WorkspaceDoc): void {
  workspace.tasks = doc.tasks.map((task) => normalizeTask(task))
  workspace.settings = doc.settings
  workspace.revision = doc.revision
  workspace.savedAt = doc.savedAt
  workspace.device = doc.device
}

export async function initWorkspace(): Promise<void> {
  if (initialized) return readyPromise
  initialized = true
  workspace.loading = true
  try {
    const [stored, meta, deviceId] = await Promise.all([
      loadWorkspace(),
      loadSyncMeta(),
      loadDeviceId()
    ])
    workspace.device = { id: deviceId, name: detectDeviceName() }
    workspace.meta = meta
    if (stored) {
      const normalized = normalizeWorkspaceDoc(stored, workspace.device)
      applyDoc(normalized.doc)
      workspace.revision = normalized.doc.revision
    } else {
      const doc = emptyWorkspaceDoc(workspace.device)
      applyDoc(doc)
      workspace.savedAt = doc.savedAt
      await saveWorkspace(doc)
    }
    workspace.storage = storageMode()
    workspace.ready = true
  } catch (error) {
    workspace.error = error instanceof Error ? error.message : 'Could not open local storage.'
  } finally {
    workspace.loading = false
    resolveReady?.()
    resolveReady = null
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => void flushSave())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushSave()
    })
  }
  return readyPromise
}

function scheduleSave(): void {
  if (typeof window === 'undefined') return
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    void flushSave()
  }, 220)
}

export async function flushSave(): Promise<void> {
  if (saveTimer && typeof window !== 'undefined') {
    window.clearTimeout(saveTimer)
    saveTimer = undefined
  }
  const doc = snapshotDoc()
  doc.savedAt = new Date().toISOString()
  workspace.savedAt = doc.savedAt
  workspace.saving = true
  try {
    workspace.storage = await saveWorkspace(doc)
    // Keep the fingerprint baseline honest when nothing was ever synced: no
    // metadata update, just a storage mode refresh.
  } finally {
    workspace.saving = false
  }
}

function touch(): void {
  workspace.revision += 1
  scheduleSave()
}

/* ------------------------------------------------------------------- tasks */

export function addTask(input: Partial<Task>): Task {
  const task = createTask(input)
  workspace.tasks = [task, ...workspace.tasks]
  touch()
  return task
}

export function updateTask(id: string, patch: Partial<Task>): Task | null {
  const index = workspace.tasks.findIndex((task) => task.id === id)
  if (index === -1) return null
  const current = workspace.tasks[index]
  let next = normalizeTask({ ...current, ...patch }, new Date())
  next.updatedAt = new Date().toISOString()

  if (patch.reminderAt !== undefined && patch.reminderAt !== current.reminderAt) {
    next = resetReminderState(next)
  }
  if (next.status === 'done' && current.status !== 'done') {
    next.completedAt = next.completedAt ?? new Date().toISOString()
  }
  if (next.status === 'open') next.completedAt = null

  workspace.tasks.splice(index, 1, next)
  touch()
  return next
}

export function removeTask(id: string): boolean {
  const before = workspace.tasks.length
  workspace.tasks = workspace.tasks.filter((task) => task.id !== id)
  if (workspace.tasks.length === before) return false
  touch()
  return true
}

export function toggleTaskDone(id: string): Task | null {
  const task = workspace.tasks.find((item) => item.id === id)
  if (!task) return null
  return updateTask(id, { status: task.status === 'done' ? 'open' : 'done' })
}

export function toggleSubtask(taskId: string, subtaskId: string): Task | null {
  const task = workspace.tasks.find((item) => item.id === taskId)
  if (!task) return null
  const subtasks = task.subtasks.map((item) =>
    item.id === subtaskId ? { ...item, done: !item.done } : item
  )
  return updateTask(taskId, { subtasks })
}

export function addSubtask(taskId: string, title: string): Task | null {
  const task = workspace.tasks.find((item) => item.id === taskId)
  if (!task || !title.trim()) return null
  const subtask: Subtask = {
    id: `sub_${Math.random().toString(36).slice(2, 10)}`,
    title: title.trim().slice(0, 300),
    done: false
  }
  return updateTask(taskId, { subtasks: [...task.subtasks, subtask] })
}

export function removeSubtask(taskId: string, subtaskId: string): Task | null {
  const task = workspace.tasks.find((item) => item.id === taskId)
  if (!task) return null
  return updateTask(taskId, { subtasks: task.subtasks.filter((item) => item.id !== subtaskId) })
}

export function replaceTask(task: Task): void {
  const index = workspace.tasks.findIndex((item) => item.id === task.id)
  if (index === -1) workspace.tasks = [task, ...workspace.tasks]
  else workspace.tasks.splice(index, 1, task)
  touch()
}

export function markTaskNotified(task: Task, now = new Date()): void {
  const index = workspace.tasks.findIndex((item) => item.id === task.id)
  if (index === -1) return
  // Notification bookkeeping is device-local and excluded from the sync
  // fingerprint, so it deliberately does not bump the revision.
  workspace.tasks.splice(index, 1, { ...task, reminderNotifiedAt: now.toISOString() })
  scheduleSave()
}

/* ---------------------------------------------------------------- settings */

export function updateSettings(patch: Partial<WorkspaceSettings>): void {
  workspace.settings = { ...workspace.settings, ...patch }
  touch()
}

export function rememberLocation(location: SavedLocation | null): void {
  const recent = location
    ? [
        location,
        ...workspace.settings.recentLocations.filter((item) => item.adm4 !== location.adm4)
      ].slice(0, 8)
    : workspace.settings.recentLocations
  workspace.settings = {
    ...workspace.settings,
    weatherLocation: location,
    recentLocations: recent
  }
  touch()
}

/* -------------------------------------------------------- cloud hydration */

/** Replace the whole workspace from the cloud after explicit confirmation. */
export async function restoreWorkspaceDoc(
  doc: WorkspaceDoc,
  meta: SyncMeta,
  options: { keepRevision?: boolean } = {}
): Promise<void> {
  const normalized = normalizeWorkspaceDoc(doc, workspace.device)
  applyDoc(normalized.doc)
  if (!options.keepRevision) workspace.revision = normalized.doc.revision
  workspace.meta = { ...meta }
  await saveSyncMeta(workspace.meta)
  await flushSave()
}

export async function updateSyncMeta(patch: Partial<SyncMeta>): Promise<void> {
  workspace.meta = { ...workspace.meta, ...patch }
  await saveSyncMeta(workspace.meta)
}

/** Wipe local data but keep the device id and cloud connection. */
export async function resetLocalWorkspace(): Promise<void> {
  const doc = emptyWorkspaceDoc(workspace.device)
  applyDoc(doc)
  workspace.meta = { ...EMPTY_SYNC_META }
  await saveSyncMeta(workspace.meta)
  await flushSave()
}

export { DEFAULT_SETTINGS }
