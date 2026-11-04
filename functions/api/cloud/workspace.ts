/**
 * GET  /api/cloud/workspace  read the versioned workspace file + its SHA
 * PUT  /api/cloud/workspace  upload a workspace, guarded by the expected SHA
 *
 * The SHA check is what makes manual syncing safe: if another device wrote in
 * the meantime, GitHub rejects the write and this endpoint returns a 409 with
 * the current cloud copy so the UI can offer keep-local / use-cloud / review.
 */
import { apiError, errorFromUnknown, isSameOrigin, json, readJson } from '../../../server/lib/http'
import { authenticate, withCookies, type PagesContext } from '../../../server/lib/route'
import {
  GitHubError,
  getWorkspaceFile,
  putWorkspaceFile,
  syncCommitMessage
} from '../../../server/lib/github'
import {
  parseStoredWorkspace,
  serializeWorkspace,
  validateWorkspaceDoc
} from '../../../server/lib/workspace'
import type { CloudConfig } from '../../../server/lib/config'

interface ParsedCloud {
  doc: Record<string, unknown> | null
  sha: string
  size: number
  corrupt?: string
}

async function readCloud(config: CloudConfig, token: string): Promise<ParsedCloud | null> {
  const file = await getWorkspaceFile(config, token)
  if (!file) return null
  const parsed = parseStoredWorkspace(file.content)
  return {
    doc: parsed.ok ? (parsed.doc as Record<string, unknown>) : null,
    sha: file.sha,
    size: file.size,
    corrupt: parsed.ok ? undefined : parsed.message
  }
}

function cloudPayload(cloud: ParsedCloud | null, path: string, branch: string): Record<string, unknown> {
  if (!cloud) {
    return { exists: false, sha: null, doc: null, path, branch }
  }
  if (!cloud.doc) {
    return {
      exists: true,
      sha: cloud.sha,
      doc: null,
      path,
      branch,
      size: cloud.size,
      error: {
        code: 'invalid_workspace',
        message: cloud.corrupt ?? 'The cloud workspace file is not valid.'
      }
    }
  }
  return {
    exists: true,
    sha: cloud.sha,
    doc: cloud.doc,
    path,
    branch,
    size: cloud.size
  }
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const auth = await authenticate(context)
  if (!auth.ok) return auth.response
  const { config, session } = auth

  try {
    const cloud = await readCloud(config, session.tokens.access)
    if (cloud && !cloud.doc) {
      return withCookies(
        json(
          {
            ok: false,
            exists: true,
            sha: cloud.sha,
            error: {
              code: 'invalid_workspace',
              message: cloud.corrupt ?? 'The cloud workspace file is not valid.'
            }
          },
          422
        ),
        auth.cookies
      )
    }
    return withCookies(json(cloudPayload(cloud, config.path, config.branch)), auth.cookies)
  } catch (error) {
    if (error instanceof GitHubError) {
      return withCookies(apiError(error.status, error.code, error.message), auth.cookies)
    }
    return withCookies(errorFromUnknown(error), auth.cookies)
  }
}

interface PutBody {
  doc?: unknown
  expectedSha?: string | null
  force?: boolean
}

export const onRequestPut = async (context: PagesContext): Promise<Response> => {
  if (!isSameOrigin(context.request)) {
    return apiError(403, 'cross_origin', 'Cross-origin requests are not allowed.')
  }
  const auth = await authenticate(context)
  if (!auth.ok) return auth.response
  const { config, session } = auth

  try {
    const body = await readJson<PutBody>(context.request)
    const validation = validateWorkspaceDoc(body.doc)
    if (!validation.ok || !validation.doc) {
      return withCookies(
        apiError(422, 'invalid_workspace', validation.message ?? 'Invalid workspace.'),
        auth.cookies
      )
    }

    const force = body.force === true
    const expectedSha =
      typeof body.expectedSha === 'string' && body.expectedSha.trim()
        ? body.expectedSha.trim()
        : null

    let current = await readCloud(config, session.tokens.access)

    if (current) {
      if (!force) {
        if (!expectedSha || expectedSha !== current.sha) {
          return withCookies(
            json(
              {
                ok: false,
                error: {
                  code: 'conflict',
                  message: 'The cloud workspace changed since this device last synced.'
                },
                cloud: cloudPayload(current, config.path, config.branch)
              },
              409
            ),
            auth.cookies
          )
        }
      }
    } else if (expectedSha && !force) {
      return withCookies(
        json(
          {
            ok: false,
            error: {
              code: 'conflict',
              message: 'The cloud workspace was removed since the last sync.'
            },
            cloud: { exists: false, sha: null, doc: null }
          },
          409
        ),
        auth.cookies
      )
    }

    const device = validation.doc.device as { name?: unknown } | undefined
    const deviceName =
      typeof device?.name === 'string' && device.name ? device.name : session.user.login
    const taskCount = Array.isArray(validation.doc.tasks) ? validation.doc.tasks.length : 0
    const message = syncCommitMessage(deviceName, taskCount)
    let result
    try {
      result = await putWorkspaceFile(config, session.tokens.access, serializeWorkspace(validation.doc), {
        sha: current?.sha ?? null,
        message
      })
    } catch (error) {
      // A racing write is a normal conflict; fetch the new state and report it.
      if (error instanceof GitHubError && error.code === 'conflict') {
        if (force) {
          current = await readCloud(config, session.tokens.access)
          result = await putWorkspaceFile(
            config,
            session.tokens.access,
            serializeWorkspace(validation.doc),
            { sha: current?.sha ?? null, message }
          )
        } else {
          const latest = await readCloud(config, session.tokens.access)
          return withCookies(
            json(
              {
                ok: false,
                error: {
                  code: 'conflict',
                  message: 'The cloud workspace changed while uploading. Nothing was overwritten.'
                },
                cloud: cloudPayload(latest, config.path, config.branch)
              },
              409
            ),
            auth.cookies
          )
        }
      } else {
        throw error
      }
    }

    return withCookies(
      json({
        ok: true,
        sha: result.sha,
        savedAt: new Date().toISOString(),
        size: result.size,
        path: config.path,
        branch: config.branch
      }),
      auth.cookies
    )
  } catch (error) {
    if (error instanceof GitHubError) {
      return withCookies(apiError(error.status, error.code, error.message), auth.cookies)
    }
    return withCookies(errorFromUnknown(error), auth.cookies)
  }
}
