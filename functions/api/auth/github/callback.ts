/**
 * GET /api/auth/github/callback
 *
 * Verifies the OAuth state, exchanges the code for a GitHub App user token,
 * confirms the account is allowed and the App is installed on the storage
 * repository, then stores everything in an encrypted HttpOnly session cookie.
 */
import { isAllowedLogin, readConfig } from '../../../../server/lib/config'
import { apiError, redirect } from '../../../../server/lib/http'
import {
  exchangeCode,
  getRepository,
  getViewer,
  revokeToken,
  toSessionUser
} from '../../../../server/lib/github'
import {
  SESSION_MAX_AGE,
  clearOAuthCookie,
  createSessionCookie,
  readOAuthState,
  tokensFromResponse,
  verifyOAuthState,
  type SessionPayload
} from '../../../../server/lib/session'

const BACK = '/kerja'

function failure(reason: string, extraHeaders: Record<string, string> = {}): Response {
  const response = redirect(`${BACK}?cloud=error&reason=${encodeURIComponent(reason)}`, extraHeaders)
  return response
}

export const onRequestGet = async ({
  request,
  env
}: {
  request: Request
  env: Record<string, string | undefined>
}): Promise<Response> => {
  const result = readConfig(env, request.url)
  if (!result.ok) return apiError(503, 'not_configured', result.error)
  const config = result.config
  const url = new URL(request.url)
  const code = url.searchParams.get('code') ?? ''
  const state = url.searchParams.get('state') ?? ''

  const stored = await readOAuthState(request, config)
  // The state cookie is single-use, whatever happens next.
  const headers = { 'set-cookie': clearOAuthCookie(config) }

  if (!stored || !verifyOAuthState(stored, state)) {
    return failure('state', headers)
  }
  if (url.searchParams.get('error')) {
    return failure('denied', headers)
  }
  if (!code) return failure('missing_code', headers)

  let tokens
  try {
    tokens = await exchangeCode(config, code)
  } catch {
    return failure('oauth', headers)
  }

  let viewer
  try {
    viewer = await getViewer(tokens.access_token)
  } catch {
    await revokeToken(config, tokens.access_token)
    return failure('account', headers)
  }

  if (!isAllowedLogin(viewer.login, config)) {
    await revokeToken(config, tokens.access_token)
    return failure('forbidden', headers)
  }

  try {
    await getRepository(config, tokens.access_token)
  } catch {
    await revokeToken(config, tokens.access_token)
    return failure('repository', headers)
  }

  const now = Math.floor(Date.now() / 1000)
  const session: SessionPayload = {
    v: 1,
    createdAt: new Date().toISOString(),
    exp: now + SESSION_MAX_AGE,
    user: toSessionUser(viewer),
    repo: {
      owner: config.owner,
      name: config.repo,
      branch: config.branch,
      path: config.path
    },
    tokens: tokensFromResponse(tokens)
  }

  const sessionCookie = await createSessionCookie(session, config)
  const response = redirect(`${stored.returnTo}?cloud=connected`, headers)
  response.headers.append('set-cookie', sessionCookie)
  return response
}
