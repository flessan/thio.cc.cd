/**
 * Cloudflare's Cache API exposes `caches.default`, which the DOM lib does not
 * describe. Optional because the proxy still works (uncached) in environments
 * without it.
 */
declare global {
  interface CacheStorage {
    default?: Cache
  }
}

export {}
