/**
 * Server-side validation for the single workspace file.
 *
 * The server never interprets task semantics; it only makes sure the stored
 * document is the expected envelope, stays inside sensible size limits, and
 * cannot be used as arbitrary blob storage.
 */

export const WORKSPACE_FORMAT = 'kerja-workspace'
export const WORKSPACE_VERSION = 1
export const MAX_TASKS = 5_000
export const MAX_SUBTASKS = 100
export const MAX_BYTES = 2_000_000

export interface ValidationResult {
  ok: boolean
  doc?: Record<string, unknown>
  message?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function shortString(value: unknown, max: number): boolean {
  return typeof value === 'string' && value.length <= max
}

export function validateWorkspaceDoc(raw: unknown): ValidationResult {
  if (!isObject(raw)) return { ok: false, message: 'The workspace must be a JSON object.' }
  if (raw.format !== WORKSPACE_FORMAT) {
    return { ok: false, message: `Expected format "${WORKSPACE_FORMAT}".` }
  }
  if (raw.version !== WORKSPACE_VERSION) {
    return { ok: false, message: `Unsupported workspace version ${String(raw.version)}.` }
  }
  if (!Array.isArray(raw.tasks)) return { ok: false, message: 'tasks must be an array.' }
  if (raw.tasks.length > MAX_TASKS) {
    return { ok: false, message: `A workspace can hold at most ${MAX_TASKS} tasks.` }
  }

  const ids = new Set<string>()
  for (const [index, task] of raw.tasks.entries()) {
    if (!isObject(task)) return { ok: false, message: `Task ${index + 1} is not an object.` }
    if (!shortString(task.id, 100) || !(task.id as string)) {
      return { ok: false, message: `Task ${index + 1} has an invalid id.` }
    }
    if (ids.has(task.id as string)) {
      return { ok: false, message: `Duplicate task id "${String(task.id)}".` }
    }
    ids.add(task.id as string)
    if (!shortString(task.title, 300)) {
      return { ok: false, message: `Task ${index + 1} has an invalid title.` }
    }
    if (task.description !== undefined && !shortString(task.description, 20_000)) {
      return { ok: false, message: `Task ${index + 1} has an oversized description.` }
    }
    if (task.subtasks !== undefined) {
      if (!Array.isArray(task.subtasks) || task.subtasks.length > MAX_SUBTASKS) {
        return { ok: false, message: `Task ${index + 1} has too many subtasks.` }
      }
    }
  }

  if (!isObject(raw.settings)) return { ok: false, message: 'settings must be an object.' }
  if (!isObject(raw.device)) return { ok: false, message: 'device must be an object.' }
  if (!shortString(raw.savedAt, 40)) return { ok: false, message: 'savedAt must be an ISO string.' }
  if (typeof raw.revision !== 'number' || !Number.isFinite(raw.revision)) {
    return { ok: false, message: 'revision must be a number.' }
  }

  let serialized: string
  try {
    serialized = JSON.stringify(raw)
  } catch {
    return { ok: false, message: 'The workspace is not serialisable.' }
  }
  if (serialized.length > MAX_BYTES) {
    return { ok: false, message: 'The workspace is larger than 2 MB.' }
  }
  return { ok: true, doc: raw }
}

/** Parse the stored file without trusting it. */
export function parseStoredWorkspace(text: string): ValidationResult {
  if (!text.trim()) return { ok: false, message: 'The cloud file is empty.' }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, message: 'The cloud file is not valid JSON.' }
  }
  return validateWorkspaceDoc(parsed)
}

export function serializeWorkspace(doc: Record<string, unknown>): string {
  return `${JSON.stringify(doc, null, 2)}\n`
}
