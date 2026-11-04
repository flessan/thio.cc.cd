/**
 * POST /api/auth/github/logout
 *
 * Best-effort token revocation at GitHub, then clears the encrypted session
 * cookie. Local workspace data is never touched.
 */
import { isSameOrigin, apiError, json } from '../../../../server/lib/http'
import { appendCookie } from '../../../../server/lib/http'
import { readConfig } from '../../../../server/lib/config'
import { revokeToken } from '../../../../server/lib/github'
import { clearSessionCookie, readSession } from '../../../../server/lib/session'

export const onRequestPost = async ({
  request,
  env
}: {
  request: Request
  env: Record<string, string | undefined>
}): Promise<Response> => {
  if (!isSameOrigin(request)) {
    return apiError(403, 'cross_origin', 'Cross-origin requests are not allowed.')
  }
  const result = readConfig(env, request.url)
  if (!result.ok) return apiError(503, 'not_configured', result.error)
  const config = result.config

  const session = await readSession(request, config)
  if (session) {
    // Revoking the user token is optional; a failure must not block logout.
    await revokeToken(config, session.tokens.access)
  }

  return appendCookie(json({ ok: true }), clearSessionCookie(config))
}
