import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  base64UrlToBytes,
  bytesToBase64Url,
  open,
  randomToken,
  safeEqual,
  seal
} from '../server/lib/crypto'
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionCookie,
  ensureFreshSession,
  readOAuthState,
  readSession,
  safeReturnPath,
  sessionExpired,
  tokensFromResponse,
  verifyOAuthState,
  writeOAuthState,
  type SessionPayload
} from '../server/lib/session'
import type { CloudConfig } from '../server/lib/config'
import { parseCookies } from '../server/lib/http'

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

function cookieValue(setCookie: string): string {
  const first = setCookie.split(';')[0]
  return first.slice(first.indexOf('=') + 1)
}

function cookieHeader(setCookie: string): string {
  return `${SESSION_COOKIE}=${cookieValue(setCookie)}`
}

function futureDate(hours = 8): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    v: 1,
    createdAt: new Date().toISOString(),
    exp: Math.floor(Date.now() / 1000) + 3600,
    user: {
      login: 'flessan',
      name: 'Flessan',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
      profileUrl: 'https://github.com/flessan'
    },
    repo: { owner: 'flessan', name: 'kerja-cloud', branch: 'main', path: 'workspace/kerja-workspace.json' },
    tokens: { access: 'ghu_token', refresh: 'ghr_refresh', expiresAt: futureDate() },
    ...overrides
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('session crypto', () => {
  it('round-trips a payload and rejects tampering', async () => {
    const payload = { hello: 'world', n: 42 }
    const token = await seal(payload, config.sessionSecret)
    expect(token.startsWith('v1.')).toBe(true)
    expect(await open(token, config.sessionSecret)).toEqual(payload)

    // Wrong secret
    expect(await open(token, 'b'.repeat(64))).toBeNull()
    // Tampered ciphertext
    const parts = token.split('.')
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}xx`
    expect(await open(tampered, config.sessionSecret)).toBeNull()
    // Malformed
    expect(await open('nope', config.sessionSecret)).toBeNull()
  })

  it('uses a different IV for every seal', async () => {
    const a = await seal({ x: 1 }, config.sessionSecret)
    const b = await seal({ x: 1 }, config.sessionSecret)
    expect(a).not.toBe(b)
  })

  it('handles base64url and constant-time comparison', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252])
    const encoded = bytesToBase64Url(bytes)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect([...base64UrlToBytes(encoded)]).toEqual([...bytes])
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(randomToken(16)).not.toBe(randomToken(16))
  })
})

describe('session cookies', () => {
  it('writes an HttpOnly, Secure, SameSite=Lax session cookie', async () => {
    const cookie = await createSessionCookie(session(), config)
    expect(cookie).toContain(`${SESSION_COOKIE}=`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
  })

  it('omits Secure only when explicitly configured for local development', () => {
    const cookie = clearSessionCookie({ ...config, cookieSecure: false })
    expect(cookie).not.toContain('Secure')
    expect(cookie).toContain('Max-Age=0')
  })

  it('reads a session back from the request cookie', async () => {
    const token = await createSessionCookie(session(), config)
    const request = new Request('https://thio.cc.cd/api/cloud/workspace', {
      headers: { cookie: cookieHeader(token) }
    })
    const payload = await readSession(request, config)
    expect(payload?.user.login).toBe('flessan')
    expect(payload?.tokens.access).toBe('ghu_token')
  })

  it('rejects expired, forged and disallowed sessions', async () => {
    const expired = await createSessionCookie(
      session({ exp: Math.floor(Date.now() / 1000) - 10 }),
      config
    )
    const request = new Request('https://thio.cc.cd/', {
      headers: { cookie: cookieHeader(expired) }
    })
    expect(await readSession(request, config)).toBeNull()

    const outsider = await createSessionCookie(
      session({
        user: {
          login: 'someone-else',
          name: null,
          avatarUrl: '',
          profileUrl: ''
        }
      }),
      config
    )
    expect(
      await readSession(
        new Request('https://thio.cc.cd/', {
          headers: { cookie: cookieHeader(outsider) }
        }),
        config
      )
    ).toBeNull()
  })
})

describe('OAuth state', () => {
  it('stores a short-lived state cookie and verifies it', async () => {
    const request = new Request('https://thio.cc.cd/api/auth/github/login')
    const { cookie, state } = await writeOAuthState(request, config, '/kerja')
    expect(cookie).toContain('Max-Age=600')
    const callback = new Request('https://thio.cc.cd/api/auth/github/callback', {
      headers: { cookie: `kerja_oauth=${cookieValue(cookie)}` }
    })
    const stored = await readOAuthState(callback, config)
    expect(stored?.state).toBe(state)
    expect(stored?.returnTo).toBe('/kerja')
    expect(verifyOAuthState(stored!, state)).toBe(true)
    expect(verifyOAuthState(stored!, 'other')).toBe(false)
  })

  it('sanitises return paths back into the workspace', () => {
    expect(safeReturnPath('/kerja')).toBe('/kerja')
    expect(safeReturnPath('https://evil.example')).toBe('/kerja')
    expect(safeReturnPath('//evil.example')).toBe('/kerja')
    expect(safeReturnPath('/kerja\nSet-Cookie: x')).toBe('/kerja')
    expect(safeReturnPath(null)).toBe('/kerja')
  })
})

describe('token expiry and refresh', () => {
  it('builds token timestamps from GitHub expiries', () => {
    const tokens = tokensFromResponse({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600
    })
    expect(tokens.refresh).toBe('r')
    expect(new Date(tokens.expiresAt).getTime()).toBeGreaterThan(Date.now() + 3_000_000)

    const inherited = tokensFromResponse({ access_token: 'b' }, { access: 'a', refresh: 'old', expiresAt: futureDate() })
    expect(inherited.refresh).toBe('old')
  })

  it('detects expiring access tokens', () => {
    expect(sessionExpired({ access: 'a', refresh: null, expiresAt: futureDate() })).toBe(false)
    expect(
      sessionExpired({ access: 'a', refresh: null, expiresAt: new Date(Date.now() - 1000).toISOString() })
    ).toBe(true)
  })

  it('refreshes an expiring token and reissues the cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            access_token: 'new_access',
            refresh_token: 'new_refresh',
            expires_in: 28800
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    )
    const stale = session({
      tokens: { access: 'old', refresh: 'r1', expiresAt: new Date(Date.now() - 1000).toISOString() }
    })
    const result = await ensureFreshSession(stale, config)
    expect(result.refreshed).toBe(true)
    expect(result.session.tokens.access).toBe('new_access')
    expect(result.session.tokens.refresh).toBe('new_refresh')
    expect(result.cookie).toBeTruthy()

    const fresh = await ensureFreshSession(session(), config)
    expect(fresh.refreshed).toBe(false)
  })

  it('throws when a stale session has no refresh token', async () => {
    await expect(
      ensureFreshSession(
        session({
          tokens: {
            access: 'old',
            refresh: null,
            expiresAt: new Date(Date.now() - 1000).toISOString()
          }
        }),
        config
      )
    ).rejects.toThrow(/expired/i)
  })
})

describe('cookie helpers', () => {
  it('parses encoded cookies', () => {
    expect(parseCookies('a=1; b=hello%20world; c=')).toEqual({
      a: '1',
      b: 'hello world',
      c: ''
    })
    expect(parseCookies(null)).toEqual({})
  })
})
