/**
 * GitHub session handling.
 *
 * A session is an encrypted cookie holding the GitHub user-facing tokens and
 * the connected account. It is renewed by GitHub's refresh-token flow when it
 * nears expiry, so a long-lived workspace does not have to log in every day.
 */
import type { CloudConfig } from './config'
import { isAllowedLogin } from './config'
import { open, safeEqual, seal } from './crypto'
import {
  parseCookies,
  serializeCookie,
  clearCookie,
  type CookieOptions
} from './http'
import { refreshAccessToken, type GitHubTokenResponse } from './github'

export const SESSION_COOKIE = 'kerja_session'
export const OAUTH_COOKIE = 'kerja_oauth'
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60
export const OAUTH_MAX_AGE = 10 * 60

export interface SessionUser {
  login: string
  name: string | null
  avatarUrl: string
  profileUrl: string
}

export interface SessionTokens {
  access: string
  refresh: string | null
  /** ISO timestamp when the access token expires. */
  expiresAt: string
}

export interface SessionRepo {
  owner: string
  name: string
  branch: string
  path: string
}

export interface SessionPayload {
  v: 1
  createdAt: string
  /** Session expiry (not the same as the access-token expiry). */
  exp: number
  user: SessionUser
  repo?: SessionRepo
  tokens: SessionTokens
}

export interface OAuthStatePayload {
  v: 1
  state: string
  returnTo: string
  exp: number
}

function cookieOptions(config: CloudConfig, maxAge: number): CookieOptions {
  return {
    maxAge,
    secure: config.cookieSecure,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/'
  }
}

export function sessionCookie(config: CloudConfig, token: string): string {
  return serializeCookie(SESSION_COOKIE, token, cookieOptions(config, SESSION_MAX_AGE))
}

export function clearSessionCookie(config: CloudConfig): string {
  return clearCookie(SESSION_COOKIE, cookieOptions(config, 0))
}

export function oauthCookie(config: CloudConfig, token: string): string {
  return serializeCookie(OAUTH_COOKIE, token, cookieOptions(config, OAUTH_MAX_AGE))
}

export function clearOAuthCookie(config: CloudConfig): string {
  return clearCookie(OAUTH_COOKIE, cookieOptions(config, 0))
}

export async function createSessionCookie(
  payload: SessionPayload,
  config: CloudConfig
): Promise<string> {
  return sessionCookie(config, await seal(payload, config.sessionSecret))
}

export async function readSession(
  request: Request,
  config: CloudConfig
): Promise<SessionPayload | null> {
  const cookies = parseCookies(request.headers.get('cookie'))
  const raw = cookies[SESSION_COOKIE]
  if (!raw) return null
  const payload = await open<SessionPayload>(raw, config.sessionSecret)
  if (!payload || payload.v !== 1 || typeof payload.exp !== 'number') return null
  if (payload.exp * 1000 <= Date.now()) return null
  if (!payload.user?.login || !payload.tokens?.access) return null
  if (!isAllowedLogin(payload.user.login, config)) return null
  return payload
}

export async function writeOAuthState(
  request: Request,
  config: CloudConfig,
  returnTo: string
): Promise<{ cookie: string; state: string }> {
  const state = crypto.randomUUID().replace(/-/g, '')
  const payload: OAuthStatePayload = {
    v: 1,
    state,
    returnTo: safeReturnPath(returnTo),
    exp: Math.floor(Date.now() / 1000) + OAUTH_MAX_AGE
  }
  const cookie = oauthCookie(config, await seal(payload, config.sessionSecret))
  return { cookie, state }
}

export async function readOAuthState(
  request: Request,
  config: CloudConfig
): Promise<OAuthStatePayload | null> {
  const cookies = parseCookies(request.headers.get('cookie'))
  const raw = cookies[OAUTH_COOKIE]
  if (!raw) return null
  const payload = await open<OAuthStatePayload>(raw, config.sessionSecret)
  if (!payload || payload.v !== 1 || payload.exp * 1000 <= Date.now()) return null
  return payload
}

export function verifyOAuthState(expected: OAuthStatePayload, received: string): boolean {
  return Boolean(received) && safeEqual(expected.state, received)
}

/** Only allow redirects back into the workspace on this origin. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/kerja'
  if (/[\r\n]/.test(value)) return '/kerja'
  return value.slice(0, 200)
}

export function tokensFromResponse(
  response: GitHubTokenResponse,
  previous?: SessionTokens
): SessionTokens {
  const now = Date.now()
  const expiresIn = Number(response.expires_in)
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
    ? new Date(now + expiresIn * 1000).toISOString()
    : new Date(now + 8 * 60 * 60 * 1000).toISOString()
  return {
    access: response.access_token,
    refresh: response.refresh_token ?? previous?.refresh ?? null,
    expiresAt
  }
}

export function sessionExpired(tokens: SessionTokens, skewSeconds = 60): boolean {
  const expires = new Date(tokens.expiresAt).getTime()
  if (Number.isNaN(expires)) return true
  return expires - Date.now() <= skewSeconds * 1000
}

export interface RefreshedSession {
  session: SessionPayload
  refreshed: boolean
  cookie?: string
}

/**
 * Refresh the GitHub access token when it is about to expire.
 * Throws when the refresh fails, so callers can clear the cookie and ask the
 * visitor to log in again.
 */
export async function ensureFreshSession(
  session: SessionPayload,
  config: CloudConfig
): Promise<RefreshedSession> {
  if (!sessionExpired(session.tokens)) {
    return { session, refreshed: false }
  }
  if (!session.tokens.refresh) {
    throw new Error('The GitHub session expired. Please connect GitHub again.')
  }
  const response = await refreshAccessToken(config, session.tokens.refresh)
  const tokens = tokensFromResponse(response, session.tokens)
  const next: SessionPayload = {
    ...session,
    tokens,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  }
  return { session: next, refreshed: true, cookie: await createSessionCookie(next, config) }
}
