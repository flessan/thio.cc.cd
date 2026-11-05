/**
 * Minimal GitHub client for the GitHub App user-authorization flow.
 *
 * Only the endpoints needed for this project are implemented: OAuth code
 * exchange, token refresh, viewing the connected account, reading and writing a
 * single JSON file, and revoking the token on logout.
 */
import type { CloudConfig } from './config'
import type { SessionTokens, SessionUser } from './session'

const API = 'https://api.github.com'
const OAUTH = 'https://github.com/login/oauth/access_token'
const UA = 'thio-cc-cd-kerja/1.0 (+https://thio.cc.cd/kerja)'
const API_VERSION = '2022-11-28'
const TIMEOUT_MS = 15_000
export const MAX_WORKSPACE_BYTES = 2_000_000

export class GitHubError extends Error {
  status: number
  code: string

  constructor(message: string, status = 502, code = 'github_error') {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.code = code
  }
}

export interface GitHubTokenResponse {
  access_token: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

export interface GitHubViewer {
  login: string
  id: number
  name: string | null
  avatar_url: string
  html_url: string
}

export interface GitHubRepo {
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
}

export interface GitHubFile {
  sha: string
  content: string
  size: number
}

function timeoutSignal(): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(TIMEOUT_MS)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(), TIMEOUT_MS)
  return controller.signal
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const text = await response.text()
    if (!text) return {}
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function githubMessage(body: Record<string, unknown>, fallback: string): string {
  const message = body.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

async function githubFetch(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    ...init,
    signal: init.signal ?? timeoutSignal(),
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': API_VERSION,
      'user-agent': UA,
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  })
  return response
}

/* ---------------------------------------------------------------- OAuth */

async function tokenRequest(params: Record<string, string>): Promise<GitHubTokenResponse> {
  let response: Response
  try {
    response = await fetch(OAUTH, {
      method: 'POST',
      signal: timeoutSignal(),
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': UA
      },
      body: new URLSearchParams(params).toString()
    })
  } catch {
    throw new GitHubError('Could not reach GitHub. Check the connection and try again.', 502, 'network')
  }
  const body = (await parseJson(response)) as unknown as GitHubTokenResponse
  if (!response.ok || body.error || !body.access_token) {
    throw new GitHubError(
      body.error_description ?? body.error ?? 'GitHub rejected the authorization request.',
      400,
      body.error ?? 'oauth_failed'
    )
  }
  return body
}

export function authorizeUrl(config: CloudConfig, state: string): string {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('allow_signup', 'false')
  return url.toString()
}

export async function exchangeCode(
  config: CloudConfig,
  code: string
): Promise<GitHubTokenResponse> {
  if (!code.trim()) throw new GitHubError('The authorization code is missing.', 400, 'missing_code')
  return tokenRequest({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri
  })
}

export async function refreshAccessToken(
  config: CloudConfig,
  refreshToken: string
): Promise<GitHubTokenResponse> {
  return tokenRequest({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })
}

/** Best-effort token revocation during logout. */
export async function revokeToken(config: CloudConfig, token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API}/applications/${encodeURIComponent(config.clientId)}/token`,
      {
        method: 'DELETE',
        signal: timeoutSignal(),
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': API_VERSION,
          'user-agent': UA,
          authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ access_token: token })
      }
    )
    return response.status === 204 || response.ok
  } catch {
    return false
  }
}

/* ----------------------------------------------------------------- user */

export async function getViewer(token: string): Promise<GitHubViewer> {
  const response = await githubFetch('/user', token)
  const body = await parseJson(response)
  if (!response.ok) {
    throw new GitHubError(
      githubMessage(body, 'Could not read the GitHub account.'),
      response.status,
      response.status === 401 ? 'invalid_token' : 'github_error'
    )
  }
  return body as unknown as GitHubViewer
}

export async function getRepository(config: CloudConfig, token: string): Promise<GitHubRepo> {
  const response = await githubFetch(`/repos/${config.owner}/${config.repo}`, token)
  const body = await parseJson(response)
  if (response.status === 404) {
    throw new GitHubError(
      `The GitHub App cannot access ${config.owner}/${config.repo}. Install the app on that repository and grant Contents access.`,
      403,
      'repo_not_installed'
    )
  }
  if (!response.ok) {
    throw new GitHubError(
      githubMessage(body, 'Could not read the storage repository.'),
      response.status,
      'github_error'
    )
  }
  return body as unknown as GitHubRepo
}

/* --------------------------------------------------------------- contents */

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

export function decodeBase64(value: string): string {
  const clean = value.replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new TextDecoder().decode(bytes)
}

function filePath(config: CloudConfig): string {
  return config.path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

/** Read the workspace file. Returns null when it does not exist yet. */
export async function getWorkspaceFile(
  config: CloudConfig,
  token: string
): Promise<GitHubFile | null> {
  const url = `/repos/${config.owner}/${config.repo}/contents/${filePath(config)}?ref=${encodeURIComponent(config.branch)}`
  const response = await githubFetch(url, token)
  if (response.status === 404) return null
  const body = await parseJson(response)
  if (!response.ok) {
    throw new GitHubError(
      githubMessage(body, 'Could not read the workspace file.'),
      response.status,
      response.status === 403 ? 'forbidden' : 'github_error'
    )
  }
  const size = typeof body.size === 'number' ? body.size : 0
  if (size > MAX_WORKSPACE_BYTES) {
    throw new GitHubError(
      'The cloud workspace file is larger than 2 MB. Reduce the number of tasks before syncing.',
      413,
      'file_too_large'
    )
  }
  if (body.encoding !== 'base64' || typeof body.content !== 'string') {
    throw new GitHubError(
      'GitHub did not return the workspace file contents. Try again or check the file in the repository.',
      422,
      'unreadable_file'
    )
  }
  return {
    sha: String(body.sha ?? ''),
    content: decodeBase64(body.content),
    size
  }
}

export interface PutFileResult {
  sha: string
  size: number
}

export async function putWorkspaceFile(
  config: CloudConfig,
  token: string,
  content: string,
  options: { sha?: string | null; message: string }
): Promise<PutFileResult> {
  const bytes = new TextEncoder().encode(content).byteLength
  if (bytes > MAX_WORKSPACE_BYTES) {
    throw new GitHubError(
      'This workspace is larger than 2 MB. Trim it before uploading.',
      413,
      'file_too_large'
    )
  }
  const payload: Record<string, string> = {
    message: options.message,
    content: encodeBase64(content),
    branch: config.branch
  }
  if (options.sha) payload.sha = options.sha
  const url = `/repos/${config.owner}/${config.repo}/contents/${filePath(config)}`
  const response = await githubFetch(url, token, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const body = await parseJson(response)
  if (response.status === 409 || response.status === 422) {
    throw new GitHubError(
      'The cloud file changed while syncing. Reload and choose what to keep.',
      409,
      'conflict'
    )
  }
  if (!response.ok) {
    throw new GitHubError(
      githubMessage(body, 'GitHub rejected the upload.'),
      response.status,
      response.status === 403 ? 'forbidden' : 'github_error'
    )
  }
  const file = (body.content ?? {}) as Record<string, unknown>
  return {
    sha: String(file.sha ?? ''),
    size: typeof file.size === 'number' ? file.size : bytes
  }
}

/** Commit message that identifies the device without leaking anything else. */
export function syncCommitMessage(deviceName: string, taskCount: number, now = new Date()): string {
  const device = deviceName.replace(/[\r\n]/g, ' ').slice(0, 60) || 'a device'
  return `kerja: sync from ${device} (${taskCount} task${taskCount === 1 ? '' : 's'})`
}

export function toSessionUser(viewer: GitHubViewer): SessionUser {
  return {
    login: viewer.login,
    name: viewer.name ?? null,
    avatarUrl: viewer.avatar_url,
    profileUrl: viewer.html_url
  }
}

export type { SessionTokens }
