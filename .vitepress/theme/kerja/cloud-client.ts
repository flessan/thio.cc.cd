/**
 * Client side of the manual GitHub sync.
 *
 * - all tokens live in an HttpOnly, encrypted server session
 * - the browser only calls same-origin `/api/*` routes
 * - nothing is uploaded unless `syncToCloud()` is called from a click
 */
import { computed, reactive } from 'vue'
import {
  diffSummary,
  diffWorkspaces,
  decideSyncAction,
  fingerprint,
  type CloudFile,
  type SessionInfo,
  type SyncDecision,
  type WorkspaceDiff
} from './cloud'
import {
  restoreWorkspaceDoc,
  snapshotDoc,
  updateSyncMeta,
  workspace
} from './state'
import { pushToast } from './toasts'

interface ConflictState {
  decision: SyncDecision
  cloud: CloudFile
  diff: WorkspaceDiff
  summary: string
}

interface CloudState {
  sessionLoading: boolean
  session: SessionInfo | null
  sessionError: string
  connected: boolean
  checking: boolean
  syncing: boolean
  restoring: boolean
  error: string
  /** Result of the last read of the cloud file (metadata only). */
  remote: { exists: boolean; sha: string | null; checkedAt: string | null } | null
  conflict: ConflictState | null
  lastActionAt: string | null
}

export const cloud = reactive<CloudState>({
  sessionLoading: false,
  session: null,
  sessionError: '',
  connected: false,
  checking: false,
  syncing: false,
  restoring: false,
  error: '',
  remote: null,
  conflict: null,
  lastActionAt: null
})

export const cloudBusy = computed(() => cloud.checking || cloud.syncing || cloud.restoring)

export const pendingUpload = computed(() =>
  cloud.connected ? workspace.meta.baseFingerprint !== fingerprint(snapshotDoc()) : false
)

interface ApiError {
  code: string
  message: string
}

class CloudApiError extends Error {
  code: string
  status: number
  payload: unknown

  constructor(message: string, code: string, status: number, payload?: unknown) {
    super(message)
    this.name = 'CloudApiError'
    this.code = code
    this.status = status
    this.payload = payload
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {})
      }
    })
  } catch {
    throw new CloudApiError(
      'Could not reach the cloud endpoint check your connection and try again.',
      'network',
      0
    )
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    const error = (body as { error?: ApiError } | null)?.error
    throw new CloudApiError(
      error?.message ?? `The server responded with ${response.status}.`,
      error?.code ?? 'http_error',
      response.status,
      body
    )
  }
  return body as T
}

function describeError(error: unknown): string {
  if (error instanceof CloudApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

/* ---------------------------------------------------------------- session */

export async function loadSession(): Promise<void> {
  cloud.sessionLoading = true
  cloud.sessionError = ''
  try {
    const info = await request<SessionInfo>('/api/auth/github/session')
    cloud.session = info
    cloud.connected = Boolean(info.connected)
  } catch (error) {
    cloud.session = null
    cloud.connected = false
    cloud.sessionError = describeError(error)
  } finally {
    cloud.sessionLoading = false
  }
}

export function connectGitHub(): void {
  if (typeof window === 'undefined') return
  const target =

    `${window.location.origin}/api/auth/github/login?return=${encodeURIComponent('/kerja')}`
  window.location.assign(target)
}

export async function disconnectGitHub(): Promise<void> {
  try {
    await request<{ ok: boolean }>('/api/auth/github/logout', { method: 'POST', body: '{}' })
  } catch {
    // Even if revocation fails server-side, clear local UI state and cookies by
    // navigating through the logout route next time.
  }
  cloud.session = null
  cloud.connected = false
  cloud.conflict = null
  cloud.remote = null
  pushToast({
    tone: 'success',
    title: 'GitHub disconnected',
    message: 'Your local workspace is untouched and still available offline.'
  })
}

/* ----------------------------------------------------------- cloud reads */

interface WorkspaceApiResponse {
  exists: boolean
  sha: string | null
  doc: CloudFile['doc'] | null
  path?: string
  branch?: string
  size?: number
}

async function readCloud(): Promise<CloudFile | null> {
  const response = await request<WorkspaceApiResponse>('/api/cloud/workspace')
  cloud.remote = {
    exists: response.exists,
    sha: response.sha ?? null,
    checkedAt: new Date().toISOString()
  }
  if (!response.exists || !response.doc) return null
  return {
    sha: response.sha ?? '',
    doc: response.doc,
    path: response.path,
    branch: response.branch,
    size: response.size
  }
}

/** Refresh session and cloud metadata without writing anything. */
export async function checkCloud(options: { silent?: boolean } = {}): Promise<void> {
  if (cloud.checking) return
  cloud.checking = true
  cloud.error = ''
  try {
    await loadSession()
    if (!cloud.connected) return
    const remote = await readCloud()
    if (!options.silent) {
      pushToast({
        tone: 'info',
        title: remote ? 'Cloud workspace found' : 'No cloud workspace yet',
        message: remote
          ? 'Use Sync to Cloud to upload local changes.'
          : 'Your first sync will create the workspace file.'
      })
    }
  } catch (error) {
    cloud.error = describeError(error)
    if (!options.silent) pushToast({ tone: 'error', title: 'Cloud check failed', message: cloud.error })
  } finally {
    cloud.checking = false
  }
}

function setConflict(decision: SyncDecision, file: CloudFile, localDoc = snapshotDoc()): void {
  const diff = diffWorkspaces(localDoc, file.doc)
  cloud.conflict = { decision, cloud: file, diff, summary: diffSummary(diff) }
}

export function clearConflict(): void {
  cloud.conflict = null
}

/* --------------------------------------------------------------- sync ops */

/**
 * The single "Sync to Cloud" action.
 *
 * It reads the current cloud file first, compares it to the last known SHA and
 * content fingerprint, and only then uploads. A changed cloud file never gets
 * overwritten silently; the visitor is asked what to do.
 */
export async function syncToCloud(options: { force?: boolean } = {}): Promise<boolean> {
  if (cloud.syncing) return false
  if (!cloud.connected) {
    await loadSession()
    if (!cloud.connected) {
      cloud.error = 'Connect GitHub before syncing.'
      return false
    }
  }
  cloud.syncing = true
  cloud.error = ''
  try {
    const remote = await readCloud()
    const localDoc = snapshotDoc()
    const decision = decideSyncAction(localDoc, remote, workspace.meta)

    if (decision.action === 'conflict' && !options.force) {
      if (remote) setConflict(decision, remote, localDoc)
      pushToast({
        tone: 'warning',
        title: 'Cloud sync needs a decision',
        message: decision.message
      })
      return false
    }

    if (decision.action === 'nothing') {
      pushToast({ tone: 'info', title: 'Nothing to upload', message: decision.message })
      return true
    }

    if (decision.action === 'pull') {
      pushToast({
        tone: 'info',
        title: 'Cloud has newer data',
        message: 'Use Restore from Cloud to bring it to this device.'
      })
      return false
    }

    if (decision.action === 'up-to-date') {
      await updateSyncMeta({
        lastSha: remote?.sha ?? workspace.meta.lastSha,
        lastSyncedAt: new Date().toISOString(),
        baseFingerprint: fingerprint(localDoc)
      })
      pushToast({ tone: 'success', title: 'Already in sync', message: decision.message })
      return true
    }

    // create / push / forced overwrite
    const expectedSha = remote?.sha ?? null
    await upload(localDoc, expectedSha, options.force)
    return true
  } catch (error) {
    cloud.error = describeError(error)
    pushToast({ tone: 'error', title: 'Sync failed', message: cloud.error })
    return false
  } finally {
    cloud.syncing = false
    cloud.lastActionAt = new Date().toISOString()
  }
}

async function upload(
  localDoc: ReturnType<typeof snapshotDoc>,
  expectedSha: string | null,
  force = false
): Promise<void> {
  const response = await request<{ ok: boolean; sha: string; savedAt: string }>(
    '/api/cloud/workspace',
    {
      method: 'PUT',
      body: JSON.stringify({ doc: localDoc, expectedSha, force })
    }
  )
  const syncedAt = new Date().toISOString()
  await updateSyncMeta({
    lastSha: response.sha,
    lastSyncedAt: syncedAt,
    baseFingerprint: fingerprint(localDoc),
    lastResult: 'synced'
  })
  cloud.remote = { exists: true, sha: response.sha, checkedAt: syncedAt }
  cloud.conflict = null
  pushToast({
    tone: 'success',
    title: 'Workspace synced',
    message: `${localDoc.tasks.length} task${localDoc.tasks.length === 1 ? '' : 's'} uploaded to your private repository.`
  })
}

/** Restore the cloud workspace after the visitor confirms. */
export async function restoreFromCloud(): Promise<boolean> {
  if (cloud.restoring) return false
  if (!cloud.connected) {
    cloud.error = 'Connect GitHub before restoring.'
    return false
  }
  cloud.restoring = true
  cloud.error = ''
  try {
    const remote = await readCloud()
    if (!remote) {
      pushToast({ tone: 'info', title: 'Nothing to restore', message: 'The cloud file does not exist yet.' })
      return false
    }
    const fingerprintOfCloud = fingerprint(remote.doc)
    await restoreWorkspaceDoc(remote.doc, {
      lastSha: remote.sha,
      lastSyncedAt: new Date().toISOString(),
      baseFingerprint: fingerprintOfCloud,
      lastResult: 'restored'
    })
    cloud.conflict = null
    cloud.lastActionAt = new Date().toISOString()
    pushToast({
      tone: 'success',
      title: 'Restored from cloud',
      message: `${remote.doc.tasks.length} task${remote.doc.tasks.length === 1 ? '' : 's'} loaded on this device.`
    })
    return true
  } catch (error) {
    cloud.error = describeError(error)
    pushToast({ tone: 'error', title: 'Restore failed', message: cloud.error })
    return false
  } finally {
    cloud.restoring = false
  }
}

export type ConflictChoice = 'keep-local' | 'use-cloud'

/** Resolve a detected conflict with the visitor's explicit choice. */
export async function resolveConflict(choice: ConflictChoice): Promise<boolean> {
  const conflict = cloud.conflict
  if (!conflict) return false
  if (choice === 'use-cloud') {
    return restoreFromCloud()
  }
  cloud.syncing = true
  cloud.error = ''
  try {
    const localDoc = snapshotDoc()
    await upload(localDoc, conflict.cloud.sha, true)
    cloud.conflict = null
    return true
  } catch (error) {
    cloud.error = describeError(error)
    pushToast({ tone: 'error', title: 'Could not upload', message: cloud.error })
    return false
  } finally {
    cloud.syncing = false
  }
}

/** Download the local workspace as a JSON backup (never uploaded). */
export function downloadLocalBackup(): void {
  if (typeof window === 'undefined') return
  const doc = snapshotDoc()
  const blob = new Blob([`${JSON.stringify(doc, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `kerja-workspace-${stamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  pushToast({ tone: 'success', title: 'Backup downloaded', message: 'A JSON copy of this workspace was saved.' })
}
