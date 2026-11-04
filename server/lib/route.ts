/**
 * Shared request/response plumbing for the authenticated cloud routes.
 */
import { readConfig, type CloudConfig, type Env } from './config'
import { apiError, appendCookie } from './http'
import {
  clearSessionCookie,
  ensureFreshSession,
  readSession,
  type SessionPayload
} from './session'

export interface PagesContext {
  request: Request
  env: Env
}

export type AuthResult =
  | { ok: true; config: CloudConfig; session: SessionPayload; cookies: string[] }
  | { ok: false; response: Response }

/**
 * Load config, verify the encrypted session cookie and refresh the GitHub
 * access token when needed. The refreshed cookie is collected so the handler
 * can attach it to its own response.
 */
export async function authenticate(context: PagesContext): Promise<AuthResult> {
  const configResult = readConfig(context.env, context.request.url)
  if (!configResult.ok) {
    return {
      ok: false,
      response: apiError(
        503,
        'not_configured',
        configResult.error,
        configResult.missing.length ? { 'x-kerja-missing': configResult.missing.join(',') } : {}
      )
    }
  }
  const config = configResult.config
  const session = await readSession(context.request, config)
  if (!session) {
    return {
      ok: false,
      response: apiError(401, 'not_connected', 'Connect GitHub to use cloud sync.')
    }
  }
  try {
    const refreshed = await ensureFreshSession(session, config)
    return {
      ok: true,
      config,
      session: refreshed.session,
      cookies: refreshed.cookie ? [refreshed.cookie] : []
    }
  } catch (error) {
    return {
      ok: false,
      response: appendCookie(
        apiError(
          401,
          'session_expired',
          error instanceof Error
            ? error.message
            : 'The GitHub session expired. Connect GitHub again.'
        ),
        clearSessionCookie(config)
      )
    }
  }
}

export function withCookies(response: Response, cookies: string[]): Response {
  return cookies.reduce((current, cookie) => appendCookie(current, cookie), response)
}
