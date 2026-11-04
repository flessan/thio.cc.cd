/**
 * Local persistence: IndexedDB first, localStorage as a last resort.
 *
 * Only the workspace document and a small device-local sync bookkeeping record
 * are stored. Nothing here ever talks to the network — GitHub only receives data
 * when the visitor presses "Sync to Cloud".
 */
import type { WorkspaceDoc } from './model'
import { EMPTY_SYNC_META, type SyncMeta } from './cloud'

const DB_NAME = 'kerja-workspace'
const DB_VERSION = 1
const STATE_STORE = 'state'
const META_STORE = 'meta'
const STATE_KEY = 'workspace'
const META_KEY = 'sync'
const LS_STATE = 'kerja-workspace-v1'
const LS_META = 'kerja-sync-meta-v1'

export type StorageMode = 'indexeddb' | 'localstorage' | 'memory'

let database: Promise<IDBDatabase | null> | null = null
let mode: StorageMode = 'memory'
const memoryState = new Map<string, unknown>()

export function storageMode(): StorageMode {
  return mode
}

export function indexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && typeof IDBKeyRange !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (database) return database
  database = new Promise((resolve) => {
    if (!indexedDbAvailable()) {
      resolve(null)
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE)
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
  return database
}

function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeLocalStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or quota exceeded: keep the in-memory copy */
  }
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDatabase()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).get(key)
      request.onsuccess = () => resolve((request.result as T) ?? null)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbPut(store: string, key: string, value: unknown): Promise<boolean> {
  const db = await openDatabase()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(value, key)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

export async function loadWorkspace(): Promise<WorkspaceDoc | null> {
  if (typeof window === 'undefined') return null
  const fromDb = await idbGet<WorkspaceDoc>(STATE_STORE, STATE_KEY)
  if (fromDb) {
    mode = 'indexeddb'
    return fromDb
  }
  if (indexedDbAvailable()) {
    mode = 'indexeddb'
    return null
  }
  const fallback = readLocalStorage<WorkspaceDoc>(LS_STATE)
  mode = fallback ? 'localstorage' : 'memory'
  return fallback
}

export async function saveWorkspace(doc: WorkspaceDoc): Promise<StorageMode> {
  if (typeof window === 'undefined') return 'memory'
  const saved = await idbPut(STATE_STORE, STATE_KEY, doc)
  if (saved) {
    mode = 'indexeddb'
    return mode
  }
  writeLocalStorage(LS_STATE, doc)
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem(LS_STATE)) {
        mode = 'localstorage'
        return mode
      }
    } catch {
      /* ignore */
    }
  }
  memoryState.set(STATE_KEY, doc)
  mode = 'memory'
  return mode
}

export async function loadSyncMeta(): Promise<SyncMeta> {
  if (typeof window === 'undefined') return { ...EMPTY_SYNC_META }
  const stored =
    (await idbGet<SyncMeta>(META_STORE, META_KEY)) ?? readLocalStorage<SyncMeta>(LS_META)
  if (!stored || typeof stored !== 'object') return { ...EMPTY_SYNC_META }
  return {
    lastSha: typeof stored.lastSha === 'string' ? stored.lastSha : null,
    lastSyncedAt: typeof stored.lastSyncedAt === 'string' ? stored.lastSyncedAt : null,
    baseFingerprint: typeof stored.baseFingerprint === 'string' ? stored.baseFingerprint : null,
    lastResult: stored.lastResult === 'synced' || stored.lastResult === 'restored' ? stored.lastResult : null
  }
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  if (typeof window === 'undefined') return
  const saved = await idbPut(META_STORE, META_KEY, meta)
  if (!saved) writeLocalStorage(LS_META, meta)
}

/** Remove every local trace of the workspace (used by "reset this device"). */
export async function clearLocalWorkspace(): Promise<void> {
  if (typeof window === 'undefined') return
  memoryState.clear()
  try {
    window.localStorage.removeItem(LS_STATE)
    window.localStorage.removeItem(LS_META)
  } catch {
    /* ignore */
  }
  const db = await openDatabase()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction([STATE_STORE, META_STORE], 'readwrite')
      tx.objectStore(STATE_STORE).clear()
      tx.objectStore(META_STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}

/** Friendly device label used in the cloud commit message and the panel. */
export function detectDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Server'
  const ua = navigator.userAgent
  const platform = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Browser'
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Chrome\//i.test(ua)
          ? 'Chrome'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Browser'
  return `${browser} on ${platform}`
}

/** A per-device id, stored with the sync metadata. */
export async function loadDeviceId(): Promise<string> {
  const key = 'kerja-device-id-v1'
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
  } catch {
    /* ignore */
  }
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  try {
    window.localStorage.setItem(key, id)
  } catch {
    /* ignore */
  }
  return id
}
