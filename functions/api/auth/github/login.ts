/**
 * GET /api/auth/github/login
 *
 * Starts the GitHub App user-authorization flow. A short-lived, encrypted state
 * cookie protects the callback from CSRF; the client secret never leaves the
 * server.
 */
import { readConfig } from '../../../../server/lib/config'
import { apiError, redirect } from '../../../../server/lib/http'
import { authorizeUrl } from '../../../../server/lib/github'
import { safeReturnPath, writeOAuthState } from '../../../../server/lib/session'
import type { PagesContext } from '../../../../server/lib/route'

export const onRequestGet = async ({ request, env }: PagesContext): Promise<Response> => {
  const result = readConfig(env, request.url)
  if (!result.ok) return apiError(503, 'not_configured', result.error)

  const url = new URL(request.url)
  const returnTo = safeReturnPath(url.searchParams.get('return'))
  const { cookie, state } = await writeOAuthState(request, result.config, returnTo)

  const response = redirect(authorizeUrl(result.config, state))
  response.headers.append('set-cookie', cookie)
  return response
}
