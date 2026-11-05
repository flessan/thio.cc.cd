/** JSON shapes shared between the Cloudflare Functions and the browser. */

export interface SessionInfo {
  connected: boolean
  user?: {
    login: string
    name: string | null
    avatarUrl: string
    profileUrl: string
  }
  repo?: {
    owner: string
    name: string
    url: string
    private: boolean
    branch: string
    path: string
  }
  expiresAt?: string
  reason?: string
}
