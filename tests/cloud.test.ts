import { describe, expect, it } from 'vitest'
import {
  EMPTY_SYNC_META,
  canonicalWorkspace,
  decideSyncAction,
  diffSummary,
  diffWorkspaces,
  docsEqual,
  fingerprint,
  hasContent,
  hasPendingLocalChanges,
  hashString,
  syncStatusLabel,
  type CloudFile,
  type SyncMeta
} from '../.vitepress/theme/kerja/cloud'
import {
  createTask,
  emptyWorkspaceDoc,
  type Task,
  type WorkspaceDoc,
  type WorkspaceSettings
} from '../.vitepress/theme/kerja/model'

const device = { id: 'device-a', name: 'Firefox on Linux' }
const savedAt = '2026-11-04T08:00:00.000Z'

function doc(
  tasks: Task[] = [],
  settings: Partial<WorkspaceSettings> = {},
  overrides: Partial<WorkspaceDoc> = {}
): WorkspaceDoc {
  const base = emptyWorkspaceDoc(device, new Date(savedAt))
  return {
    ...base,
    tasks,
    settings: { ...base.settings, ...settings },
    ...overrides
  }
}

const taskA = createTask(
  { id: 'a', title: 'Write report', priority: 'high', dueAt: '2026-11-05T09:00:00.000Z' },
  new Date(savedAt)
)
const taskB = createTask(
  { id: 'b', title: 'Buy milk', priority: 'low' },
  new Date(savedAt)
)

describe('workspace fingerprints', () => {
  it('ignores volatile metadata so reloads never look like edits', () => {
    const first = doc([taskA], {}, { savedAt: '2026-11-04T08:00:00.000Z', revision: 1 })
    const second = doc([taskA], {}, {
      savedAt: '2026-11-04T09:00:00.000Z',
      revision: 9,
      device: { id: 'device-b', name: 'Chrome on Android' }
    })
    expect(canonicalWorkspace(first)).toBe(canonicalWorkspace(second))
    expect(fingerprint(first)).toBe(fingerprint(second))
    expect(docsEqual(first, second)).toBe(true)
  })

  it('ignores task updatedAt and last-notified bookkeeping', () => {
    const a = doc([taskA])
    const b = doc([
      {
        ...taskA,
        updatedAt: '2026-11-04T12:00:00.000Z',
        reminderNotifiedAt: '2026-11-04T12:00:00.000Z'
      }
    ])
    expect(docsEqual(a, b)).toBe(true)
  })

  it('detects real content edits', () => {
    const a = doc([taskA])
    const b = doc([{ ...taskA, title: 'Write final report' }])
    expect(docsEqual(a, b)).toBe(false)
    expect(fingerprint(a)).not.toBe(fingerprint(b))
  })

  it('is independent of task ordering', () => {
    expect(docsEqual(doc([taskA, taskB]), doc([taskB, taskA]))).toBe(true)
  })

  it('produces stable hashes', () => {
    expect(hashString('hello')).toBe(hashString('hello'))
    expect(hashString('hello')).not.toBe(hashString('hello!'))
  })

  it('knows when a workspace has content', () => {
    expect(hasContent(doc())).toBe(false)
    expect(hasContent(doc([taskA]))).toBe(true)
    expect(hasContent(doc([], { weatherLocation: { adm4: '63.71.01.1001', label: 'Banjarmasin' } }))).toBe(true)
  })
})

describe('pending local changes', () => {
  const meta: SyncMeta = { ...EMPTY_SYNC_META, lastSha: 'sha1', baseFingerprint: fingerprint(doc([taskA])) }

  it('is false when content matches the last sync', () => {
    expect(hasPendingLocalChanges(doc([taskA]), meta)).toBe(false)
  })

  it('is true after a local edit and for a never-synced workspace', () => {
    expect(hasPendingLocalChanges(doc([taskA, taskB]), meta)).toBe(true)
    expect(hasPendingLocalChanges(doc([taskA]), EMPTY_SYNC_META)).toBe(true)
  })

  it('is false for an empty workspace', () => {
    expect(hasPendingLocalChanges(doc(), EMPTY_SYNC_META)).toBe(false)
  })
})

describe('sync decisions', () => {
  const localDoc = doc([taskA])
  const cloudFile = (content: WorkspaceDoc, sha = 'sha1'): CloudFile => ({ sha, doc: content })

  it('uploads when the cloud file does not exist', () => {
    expect(decideSyncAction(localDoc, null, EMPTY_SYNC_META).action).toBe('create')
    expect(decideSyncAction(doc(), null, EMPTY_SYNC_META).action).toBe('nothing')
  })

  it('recognises an already identical cloud file', () => {
    const meta = { ...EMPTY_SYNC_META, lastSha: 'sha1', baseFingerprint: fingerprint(localDoc) }
    expect(decideSyncAction(localDoc, cloudFile(doc([taskA])), meta).action).toBe('up-to-date')
  })

  it('treats a first sync against existing cloud data as a conflict', () => {
    const decision = decideSyncAction(localDoc, cloudFile(doc([taskB])), EMPTY_SYNC_META)
    expect(decision.action).toBe('conflict')
    expect(decision.reason).toBe('first-sync')
  })

  it('offers a pull for an empty device that has never synced', () => {
    expect(decideSyncAction(doc(), cloudFile(doc([taskB])), EMPTY_SYNC_META).action).toBe('pull')
  })

  it('pushes when only this device changed', () => {
    const meta = { ...EMPTY_SYNC_META, lastSha: 'sha1', baseFingerprint: fingerprint(localDoc) }
    const decision = decideSyncAction(doc([taskA, taskB]), cloudFile(localDoc), meta)
    expect(decision.action).toBe('push')
    expect(decision.reason).toBe('local-changed')
  })

  it('reports a pull when only the cloud changed', () => {
    const base = doc([taskA])
    const meta = { ...EMPTY_SYNC_META, lastSha: 'sha1', baseFingerprint: fingerprint(base) }
    const cloud = cloudFile(doc([taskA, taskB]), 'sha2')
    const decision = decideSyncAction(base, cloud, meta)
    expect(decision.action).toBe('pull')
    expect(decision.reason).toBe('remote-changed')
  })

  it('reports a conflict when both sides changed', () => {
    const base = doc([taskA])
    const meta = { ...EMPTY_SYNC_META, lastSha: 'sha1', baseFingerprint: fingerprint(base) }
    const cloud = cloudFile(doc([{ ...taskA, priority: 'critical' }]), 'sha2')
    const local = doc([taskA, taskB])
    const decision = decideSyncAction(local, cloud, meta)
    expect(decision.action).toBe('conflict')
    expect(decision.message.toLowerCase()).toContain('nothing was uploaded')
  })

  it('is up to date when two devices independently produced the same content', () => {
    const base = doc([taskA])
    const meta = { ...EMPTY_SYNC_META, lastSha: 'sha1', baseFingerprint: fingerprint(base) }
    expect(decideSyncAction(doc([taskA]), cloudFile(doc([taskA]), 'sha9'), meta).action).toBe(
      'up-to-date'
    )
  })
})

describe('workspace diff', () => {
  const local = doc(
    [
      { ...taskA, title: 'Write report', priority: 'critical' },
      taskB
    ],
    { weatherLocation: { adm4: '63.71.01.1001', label: 'Banjarmasin' } }
  )
  const cloud = doc(
    [
      { ...taskA, title: 'Write report', priority: 'high' },
      createTask({ id: 'c', title: 'Book room' }, new Date(savedAt))
    ],
    {}
  )

  it('reports task and field level differences', () => {
    const diff = diffWorkspaces(local, cloud)
    expect(diff.counts.changed).toBe(1)
    expect(diff.counts.localOnly).toBe(1)
    expect(diff.counts.cloudOnly).toBe(1)
    expect(diff.counts.localTotal).toBe(2)
    expect(diff.counts.cloudTotal).toBe(2)

    const changed = diff.tasks.find((item) => item.kind === 'changed')!
    expect(changed.title).toBe('Write report')
    const priority = changed.changes.find((change) => change.field === 'priority')!
    expect(priority.local).toBe('Critical')
    expect(priority.cloud).toBe('High')
    expect(diff.settings[0]).toMatchObject({ field: 'weatherLocation', cloud: 'Not set' })
  })

  it('summarises the diff in one line', () => {
    expect(diffSummary(diffWorkspaces(local, cloud))).toContain('changed')
    expect(diffSummary(diffWorkspaces(local, local))).toBe('No task differences')
  })

  it('labels the last sync time', () => {
    const now = new Date('2026-11-04T09:00:00.000Z')
    expect(syncStatusLabel(EMPTY_SYNC_META, now)).toBe('Never synced')
    expect(
      syncStatusLabel({ ...EMPTY_SYNC_META, lastSyncedAt: '2026-11-04T08:00:00.000Z' }, now)
    ).toContain('Last synced')
  })
})
