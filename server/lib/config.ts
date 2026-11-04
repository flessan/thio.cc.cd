/**
 * Server configuration.
 *
 * Reads Cloudflare Pages environment variables. Secrets are only ever read on
 * the server; nothing in this file is bundled into the static site.
 *
 * Required:
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET
 * Optional (defaults match the project's own setup):
 *   GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_REPO_BRANCH,
 *   GITHUB_WORKSPACE_PATH, KERJA_ALLOWED_LOGINS, GITHUB_REDIRECT_URI,
 *   KERJA_COOKIE_SECURE
 */

export interface Env {
  [key: string]: string | undefined
}

export interface CloudConfig {
  clientId: string
  clientSecret: string
  sessionSecret: string
  owner: string
  repo: string
  branch: string
  path: string
  allowedLogins: string[]
  redirectUri: string
  cookieSecure: boolean
}

export type ConfigResult =
  | { ok: true; config: CloudConfig }
  | { ok: false; missing: string[]; error: string }

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/
const BRANCH_RE = /^[A-Za-z0-9._\/-]{1,255}$/
const PATH_RE = /^[A-Za-z0-9._\/-]{1,200}\.json$/
const ADM4 = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/

function clean(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function readConfig(env: Env, requestUrl: string): ConfigResult {
  const clientId = clean(env.GITHUB_CLIENT_ID)
  const clientSecret = clean(env.GITHUB_CLIENT_SECRET)
  const sessionSecret = clean(env.SESSION_SECRET)

  const missing: string[] = []
  if (!clientId) missing.push('GITHUB_CLIENT_ID')
  if (!clientSecret) missing.push('GITHUB_CLIENT_SECRET')
  if (!sessionSecret) missing.push('SESSION_SECRET')
  if (missing.length) {
    return {
      ok: false,
      missing,
      error: `Cloud sync is not configured yet. Missing: ${missing.join(', ')}.`
    }
  }
  if (sessionSecret.length < 32) {
    return {
      ok: false,
      missing: [],
      error: 'SESSION_SECRET must be at least 32 characters long.'
    }
  }

  const owner = clean(env.GITHUB_REPO_OWNER) || 'flessan'
  const repo = clean(env.GITHUB_REPO_NAME) || 'kerja-cloud'
  const branch = clean(env.GITHUB_REPO_BRANCH) || 'main'
  const path = clean(env.GITHUB_WORKSPACE_PATH) || 'workspace/kerja-workspace.json'

  if (!OWNER_RE.test(owner)) {
    return { ok: false, missing: [], error: 'GITHUB_REPO_OWNER is not a valid GitHub login.' }
  }
  if (!REPO_RE.test(repo)) {
    return { ok: false, missing: [], error: 'GITHUB_REPO_NAME is not a valid repository name.' }
  }
  if (!BRANCH_RE.test(branch) || branch.includes('..')) {
    return { ok: false, missing: [], error: 'GITHUB_REPO_BRANCH is not a valid branch name.' }
  }
  if (!PATH_RE.test(path) || path.startsWith('/') || path.includes('..')) {
    return {
      ok: false,
      missing: [],
      error: 'GITHUB_WORKSPACE_PATH must be a relative .json path inside the repository.'
    }
  }

  const allowed = clean(env.KERJA_ALLOWED_LOGINS)
    .split(',')
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean)
  const allowedLogins = allowed.length ? allowed : [owner.toLowerCase()]

  const origin = new URL(requestUrl).origin
  const redirectUri = clean(env.GITHUB_REDIRECT_URI) || `${origin}/api/auth/github/callback`
  if (!/^https?:\/\//.test(redirectUri)) {
    return { ok: false, missing: [], error: 'GITHUB_REDIRECT_URI must be an absolute URL.' }
  }

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      sessionSecret,
      owner,
      repo,
      branch,
      path,
      allowedLogins,
      redirectUri,
      cookieSecure: clean(env.KERJA_COOKIE_SECURE) !== 'false'
    }
  }
}

export function isAllowedLogin(login: string, config: CloudConfig): boolean {
  return config.allowedLogins.includes(login.toLowerCase())
}

/** Exported for tests. */
export const CONFIG_PATTERNS = { OWNER_RE, REPO_RE, BRANCH_RE, PATH_RE, ADM4 }
