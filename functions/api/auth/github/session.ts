/**
 * GET /api/auth/github/session
 *
 * Reports the connected account without ever returning a token. Refreshes an
 * expiring access token and re-issues the encrypted cookie when possible.
 */
import { readConfig } from '../../../../server/lib/config'
import { appendCookie, json } from '../../../../server/lib/http'
import {
  clearSessionCookie,
  ensureFreshSession,
  readSession
} from '../../../../server/lib/session'
import type { SessionInfo } from '../../../../server/lib/types'

export const onRequestGet = async ({
  request,
  env
}: {
  request: Request
  env: Record<string, string | undefined>
}): Promise<Response> => {
  const configResult = readConfig(env, request.url)
  if (!configResult.ok) {
    return json(
      {
        connected: false,
        reason: 'not_configured',
        message: configResult.error
      } satisfies SessionInfo & { message?: string },
      200
    )
  }
  const config = configResult.config
  const session = await readSession(request, config)
  if (!session) {
    return json({ connected: false } satisfies SessionInfo)
  }

  let refreshedCookie: string | undefined
  let current = session
  try {
    const refreshed = await ensureFreshSession(session, config)
    current = refreshed.session
    refreshedCookie = refreshed.cookie
  } catch {
    const response = json({
      connected: false,
      reason: 'session_expired'
    } satisfies SessionInfo)
    return appendCookie(response, clearSessionCookie(config))
  }

  const info: SessionInfo = {
    connected: true,
    user: current.user,
    repo: {
      owner: current.repo?.owner ?? config.owner,
      name: current.repo?.name ?? config.repo,
      url: `https://github.com/${current.repo?.owner ?? config.owner}/${current.repo?.name ?? config.repo}`,
      private: true,
      branch: current.repo?.branch ?? config.branch,
      path: current.repo?.path ?? config.path
    },
    expiresAt: current.tokens.expiresAt
  }

  const response = json(info)
  return refreshedCookie ? appendCookie(response, refreshedCookie) : response
}
