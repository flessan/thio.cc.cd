/**
 * A tiny handshake so the motion layer waits for Vue to finish hydrating.
 * Mutating the server-rendered hero before hydration triggers Vue's mismatch
 * warning, so the last layout component signals when the tree is live.
 */
let marked = false

export function markHydrated() {
  if (marked || typeof window === 'undefined') return
  marked = true
  window.requestAnimationFrame(() => {
    ;(window as unknown as { __flessanHydrated?: boolean }).__flessanHydrated = true
    window.dispatchEvent(new Event('flessan:hydrated'))
  })
}

export function whenHydrated(callback: () => void, fallbackMs = 1600) {
  if (typeof window === 'undefined') return
  const already = (window as unknown as { __flessanHydrated?: boolean })
    .__flessanHydrated
  if (already) {
    callback()
    return
  }
  let ran = false
  const run = () => {
    if (ran) return
    ran = true
    callback()
  }
  window.addEventListener('flessan:hydrated', run, { once: true })
  window.setTimeout(run, fallbackMs)
}
