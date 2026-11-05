import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GitHubError,
  authorizeUrl,
  decodeBase64,
  encodeBase64,
  exchangeCode,
  getRepository,
  getViewer,
  getWorkspaceFile,
  putWorkspaceFile,
  revokeToken,
  syncCommitMessage,
  toSessionUser
} from '../server/lib/github'
import type { CloudConfig } from '../server/lib/config'

const config: CloudConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  sessionSecret: 'a'.repeat(64),
  owner: 'flessan',
  repo: 'kerja-cloud',
  branch: 'main',
  path: 'workspace/kerja-workspace.json',
  allowedLogins: ['flessan'],
  redirectUri: 'https://thio.cc.cd/api/auth/github/callback',
  cookieSecure: true
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GitHub authorization', () => {
  it('builds an authorize URL with state and redirect but no scopes', () => {
    const url = new URL(authorizeUrl(config, 'state-123'))
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('state')).toBe('state-123')
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri)
    expect(url.searchParams.get('scope')).toBeNull()
  })

  it('exchanges a code for tokens', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ access_token: 'ghu_1', refresh_token: 'ghr_1', expires_in: 28800 })
    )
    const tokens = await exchangeCode(config, 'code-1')
    expect(tokens.access_token).toBe('ghu_1')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(String(init.body)).toContain('client_secret=client-secret')
    expect(String(init.body)).toContain('code=code-1')
  })

  it('surfaces OAuth errors without leaking the secret', async () => {
    mockFetch(() =>
      jsonResponse({ error: 'bad_verification_code', error_description: 'The code expired.' }, 200)
    )
    await expect(exchangeCode(config, 'expired')).rejects.toThrow('The code expired.')
  })

  it('rejects an empty code before calling GitHub', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    await expect(exchangeCode(config, '  ')).rejects.toBeInstanceOf(GitHubError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('revokes a token with client credentials', async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 204 }))
    expect(await revokeToken(config, 'ghu_1')).toBe(true)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(String(init.headers && JSON.stringify(init.headers))).toContain('Basic')
    expect(String(init.body)).toContain('ghu_1')
  })
})

describe('GitHub account and repository', () => {
  it('reads the connected account', async () => {
    mockFetch(() =>
      jsonResponse({
        login: 'flessan',
        id: 1,
        name: 'Flessan',
        avatar_url: 'https://example.com/a.png',
        html_url: 'https://github.com/flessan'
      })
    )
    const viewer = await getViewer('token')
    expect(toSessionUser(viewer)).toMatchObject({ login: 'flessan', name: 'Flessan' })
  })

  it('explains a missing app installation', async () => {
    mockFetch(() => jsonResponse({ message: 'Not Found' }, 404))
    await expect(getRepository(config, 'token')).rejects.toMatchObject({
      code: 'repo_not_installed',
      status: 403
    })
  })

  it('returns the repository details', async () => {
    mockFetch(() =>
      jsonResponse({
        full_name: 'flessan/kerja-cloud',
        private: true,
        html_url: 'https://github.com/flessan/kerja-cloud',
        default_branch: 'main'
      })
    )
    const repo = await getRepository(config, 'token')
    expect(repo.full_name).toBe('flessan/kerja-cloud')
    expect(repo.private).toBe(true)
  })
})

describe('workspace file contents', () => {
  it('encodes and decodes UTF-8 safely', () => {
    const text = 'Kerja: café ☕ — 保存'
    expect(decodeBase64(encodeBase64(text))).toBe(text)
  })

  it('returns null when the file does not exist', async () => {
    mockFetch(() => jsonResponse({ message: 'Not Found' }, 404))
    expect(await getWorkspaceFile(config, 'token')).toBeNull()
  })

  it('reads and decodes an existing file', async () => {
    const content = '{"format":"kerja-workspace"}'
    mockFetch(() =>
      jsonResponse({
        sha: 'abc123',
        encoding: 'base64',
        size: content.length,
        content: `${encodeBase64(content)}\n`
      })
    )
    const file = await getWorkspaceFile(config, 'token')
    expect(file).toMatchObject({ sha: 'abc123', content })
  })

  it('refuses unreadable or oversized files', async () => {
    mockFetch(() =>
      jsonResponse({ sha: 'x', encoding: 'none', size: 5_000_000, content: '' })
    )
    await expect(getWorkspaceFile(config, 'token')).rejects.toMatchObject({ code: 'file_too_large' })

    mockFetch(() => jsonResponse({ sha: 'x', encoding: 'none', size: 100, content: '' }))
    await expect(getWorkspaceFile(config, 'token')).rejects.toMatchObject({ code: 'unreadable_file' })
  })

  it('uploads with the expected SHA and returns the new SHA', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ content: { sha: 'new-sha', size: 42 } }, 200)
    )
    const result = await putWorkspaceFile(config, 'token', '{"a":1}', {
      sha: 'old-sha',
      message: 'kerja: sync'
    })
    expect(result).toEqual({ sha: 'new-sha', size: 42 })
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(body.sha).toBe('old-sha')
    expect(body.branch).toBe('main')
    expect(decodeBase64(body.content)).toBe('{"a":1}')
  })

  it('maps a 409 from GitHub to a conflict error', async () => {
    mockFetch(() => jsonResponse({ message: 'sha does not match' }, 409))
    await expect(
      putWorkspaceFile(config, 'token', '{}', { sha: 'stale', message: 'sync' })
    ).rejects.toMatchObject({ code: 'conflict', status: 409 })
  })

  it('rejects uploads larger than the limit', async () => {
    const huge = 'x'.repeat(2_000_001)
    await expect(
      putWorkspaceFile(config, 'token', huge, { message: 'sync' })
    ).rejects.toMatchObject({ code: 'file_too_large' })
  })

  it('writes a readable commit message without newlines', () => {
    expect(syncCommitMessage('Firefox on Linux', 3)).toContain('Firefox on Linux')
    expect(syncCommitMessage('Evil\nInjected', 1)).not.toContain('\n')
  })
})
