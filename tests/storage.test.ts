/**
 * IndexedDB persistence, exercised with fake-indexeddb.
 *
 * The storage module prefers `window.localStorage` only as a fallback, so the
 * test provides a minimal window/localStorage shim before importing it.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  clear(): void {
    this.map.clear()
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }
  get length(): number {
    return this.map.size
  }
}

let storage: typeof import('../.vitepress/theme/kerja/storage')

beforeAll(async () => {
  await import('fake-indexeddb/auto')
  const shim = {
    localStorage: new MemoryStorage(),
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  }
  ;(globalThis as unknown as { window: unknown }).window = Object.assign(
    globalThis,
    shim,
    (globalThis as unknown as { window?: object }).window ?? {}
  )
  storage = await import('../.vitepress/theme/kerja/storage')
})

describe('local workspace storage', () => {
  it('round-trips a workspace document through IndexedDB', async () => {
    const { createTask, emptyWorkspaceDoc } = await import('../.vitepress/theme/kerja/model')
    const doc = emptyWorkspaceDoc({ id: 'device-a', name: 'Test device' })
    doc.tasks = [createTask({ id: 't1', title: 'Persist me' })]

    const mode = await storage.saveWorkspace(doc)
    expect(mode).toBe('indexeddb')
    expect(storage.storageMode()).toBe('indexeddb')

    const loaded = await storage.loadWorkspace()
    expect(loaded?.tasks[0].title).toBe('Persist me')
    expect(loaded?.device.name).toBe('Test device')
  })

  it('returns null when nothing has been stored', async () => {
    await storage.clearLocalWorkspace()
    expect(await storage.loadWorkspace()).toBeNull()
  })

  it('stores and reads sync metadata with defensive defaults', async () => {
    expect(await storage.loadSyncMeta()).toMatchObject({
      lastSha: null,
      lastSyncedAt: null,
      baseFingerprint: null
    })
    await storage.saveSyncMeta({
      lastSha: 'sha-1',
      lastSyncedAt: '2026-11-04T08:00:00.000Z',
      baseFingerprint: 'abc',
      lastResult: 'synced'
    })
    expect(await storage.loadSyncMeta()).toMatchObject({
      lastSha: 'sha-1',
      baseFingerprint: 'abc',
      lastResult: 'synced'
    })
  })

  it('falls back to localStorage when IndexedDB is unavailable', async () => {
    const original = globalThis.indexedDB
    // @ts-expect-error deliberately simulate a browser without IndexedDB
    delete globalThis.indexedDB
    vi.resetModules()
    try {
      const fresh = await import('../.vitepress/theme/kerja/storage')
      const { emptyWorkspaceDoc } = await import('../.vitepress/theme/kerja/model')
      const doc = emptyWorkspaceDoc({ id: 'device-b', name: 'Safari' })
      doc.tasks = []
      const mode = await fresh.saveWorkspace(doc)
      expect(mode).toBe('localstorage')
      const loaded = await fresh.loadWorkspace()
      expect(loaded?.device.name).toBe('Safari')
    } finally {
      globalThis.indexedDB = original
    }
  })
})
