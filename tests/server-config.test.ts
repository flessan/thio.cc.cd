import { describe, expect, it } from 'vitest'
import { isAllowedLogin, readConfig } from '../server/lib/config'
import { cacheRequest, isSameOrigin, readJson, HttpError } from '../server/lib/http'
import {
  parseStoredWorkspace,
  serializeWorkspace,
  validateWorkspaceDoc
} from '../server/lib/workspace'

const baseEnv = {
  GITHUB_CLIENT_ID: 'client',
  GITHUB_CLIENT_SECRET: 'secret',
  SESSION_SECRET: 's'.repeat(48)
}
const url = 'https://thio.cc.cd/api/auth/github/callback'

function validDoc() {
  return {
    format: 'kerja-workspace',
    version: 1,
    savedAt: new Date().toISOString(),
    revision: 1,
    device: { id: 'd1', name: 'Test' },
    tasks: [
      {
        id: 't1',
        title: 'Task',
        description: '',
        priority: 'high',
        category: 'Work',
        status: 'open',
        subtasks: [] as { id: string; title: string; done: boolean }[],
        startAt: null,
        dueAt: null,
        estimateMinutes: 30,
        reminderAt: null,
        reminderSnoozedUntil: null,
        reminderDismissedFor: null,
        reminderNotifiedAt: null,
        outdoor: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      }
    ],
    settings: {
      weatherLocation: null,
      recentLocations: [],
      defaultReminderMinutes: null,
      inAppReminders: true
    }
  }
}

describe('server configuration', () => {
  it('reports every missing secret by name', () => {
    const result = readConfig({}, url)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual([
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'SESSION_SECRET'
      ])
    }
  })

  it('requires a strong session secret', () => {
    const result = readConfig({ ...baseEnv, SESSION_SECRET: 'short' }, url)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('32 characters')
  })

  it('applies the documented defaults', () => {
    const result = readConfig(baseEnv, url)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config).toMatchObject({
        owner: 'flessan',
        repo: 'kerja-cloud',
        branch: 'main',
        path: 'workspace/kerja-workspace.json',
        redirectUri: 'https://thio.cc.cd/api/auth/github/callback',
        cookieSecure: true
      })
      expect(result.config.allowedLogins).toEqual(['flessan'])
    }
  })

  it('accepts overrides and an allow-list', () => {
    const result = readConfig(
      {
        ...baseEnv,
        GITHUB_REPO_OWNER: 'someone',
        GITHUB_REPO_NAME: 'notes',
        GITHUB_REPO_BRANCH: 'data',
        GITHUB_WORKSPACE_PATH: 'backup/kerja.json',
        KERJA_ALLOWED_LOGINS: 'someone, OtherPerson',
        KERJA_COOKIE_SECURE: 'false'
      },
      url
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.repo).toBe('notes')
      expect(result.config.path).toBe('backup/kerja.json')
      expect(result.config.allowedLogins).toEqual(['someone', 'otherperson'])
      expect(result.config.cookieSecure).toBe(false)
      expect(isAllowedLogin('OtherPerson', result.config)).toBe(true)
      expect(isAllowedLogin('stranger', result.config)).toBe(false)
    }
  })

  it('rejects path traversal and unsafe repository names', () => {
    expect(readConfig({ ...baseEnv, GITHUB_WORKSPACE_PATH: '../secrets.json' }, url).ok).toBe(false)
    expect(readConfig({ ...baseEnv, GITHUB_WORKSPACE_PATH: 'workspace/file.txt' }, url).ok).toBe(false)
    expect(readConfig({ ...baseEnv, GITHUB_REPO_NAME: 'bad name' }, url).ok).toBe(false)
    expect(readConfig({ ...baseEnv, GITHUB_REPO_BRANCH: 'a..b' }, url).ok).toBe(false)
  })
})

describe('HTTP helpers', () => {
  it('checks same-origin and Sec-Fetch-Site', () => {
    const same = new Request('https://thio.cc.cd/api/cloud/workspace', {
      headers: { origin: 'https://thio.cc.cd' }
    })
    const cross = new Request('https://thio.cc.cd/api/cloud/workspace', {
      headers: { origin: 'https://evil.example' }
    })
    const hint = new Request('https://thio.cc.cd/api/cloud/workspace', {
      headers: { 'sec-fetch-site': 'cross-site' }
    })
    expect(isSameOrigin(same)).toBe(true)
    expect(isSameOrigin(cross)).toBe(false)
    expect(isSameOrigin(hint)).toBe(false)
  })

  it('validates JSON bodies', async () => {
    const good = new Request('https://thio.cc.cd/api/cloud/workspace', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true })
    })
    expect(await readJson(good)).toEqual({ ok: true })

    const wrongType = new Request('https://thio.cc.cd/api/cloud/workspace', {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: '{}'
    })
    await expect(readJson(wrongType)).rejects.toMatchObject({ status: 415 })

    const badJson = new Request('https://thio.cc.cd/api/cloud/workspace', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{nope'
    })
    await expect(readJson(badJson)).rejects.toBeInstanceOf(HttpError)
  })

  it('builds namespaced cache keys', () => {
    const request = new Request('https://thio.cc.cd/api/cuaca?adm4=31.71.01.1001')
    const key = cacheRequest(request, 'bmkg-fresh-31.71.01.1001')
    expect(key.url).toBe('https://thio.cc.cd/__kerja-cache/bmkg-fresh-31.71.01.1001')
    expect(key.url).not.toContain('adm4')
  })
})

describe('workspace validation', () => {
  it('accepts a well-formed workspace', () => {
    const doc = validDoc()
    expect(validateWorkspaceDoc(doc).ok).toBe(true)
    const serialized = serializeWorkspace(doc)
    expect(serialized.endsWith('\n')).toBe(true)
    expect(parseStoredWorkspace(serialized).ok).toBe(true)
  })

  it('rejects the wrong envelope and duplicate ids', () => {
    expect(validateWorkspaceDoc({ format: 'other' })).toMatchObject({ ok: false })
    const duplicate = validDoc()
    duplicate.tasks.push({ ...duplicate.tasks[0] })
    expect(validateWorkspaceDoc(duplicate).message).toContain('Duplicate')
  })

  it('rejects oversized text and too many subtasks', () => {
    const doc = validDoc()
    doc.tasks[0].description = 'x'.repeat(20_001)
    expect(validateWorkspaceDoc(doc).ok).toBe(false)

    const subtasks = validDoc()
    subtasks.tasks[0].subtasks = Array.from({ length: 101 }, (_, index) => ({
      id: `s${index}`,
      title: 's',
      done: false
    }))
    expect(validateWorkspaceDoc(subtasks).ok).toBe(false)
  })

  it('rejects invalid stored JSON', () => {
    expect(parseStoredWorkspace('').ok).toBe(false)
    expect(parseStoredWorkspace('not json').ok).toBe(false)
    expect(parseStoredWorkspace('{"format":"kerja-workspace"}').ok).toBe(false)
  })
})
