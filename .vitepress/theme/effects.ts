/**
 * Small anime.js helpers shared by the interactive pieces.
 * Everything here is optional decoration: callers can fire and forget, and the
 * functions bail out when the visitor asked for less motion.
 */
import { animate } from 'animejs'

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** "playful" | "calm" | "off" from the playground, honoring the OS setting. */
export function motionLevel(): 'playful' | 'calm' | 'off' {
  if (typeof document === 'undefined' || prefersReducedMotion()) return 'off'
  const level = document.documentElement.dataset.motion
  return level === 'calm' || level === 'off' ? level : 'playful'
}

/** Material state layer: a springy acknowledgement for a tapped control. */
export function pop(element: Element | null | undefined) {
  if (!element || motionLevel() === 'off') return
  animate(element, {
    scale: [0.86, 1],
    rotate: [2.5, 0],
    duration: 560,
    ease: 'outBack(2.4)'
  })
}

/** A short overshoot used when a chip, card or button is selected. */
export function bounce(element: Element | null | undefined) {
  if (!element || motionLevel() === 'off') return
  animate(element, {
    scale: [1, 1.08, 1],
    duration: 420,
    ease: 'inOutQuad'
  })
}

const RIPPLE_HOSTS =
  'button, .VPButton, .VPNavBarMenuLink, .VPSidebarItem .item, .md-interactive, [data-ripple]'

/**
 * Material ripple, installed once. The pressed element gets a transient span
 * that inherits its text colour, so it works on every tonal surface.
 */
export function installRipple() {
  if (typeof document === 'undefined') return
  let last = 0

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (motionLevel() === 'off') return
      const target = (event.target as Element | null)?.closest<HTMLElement>(RIPPLE_HOSTS)
      if (!target || target.hasAttribute('data-no-ripple')) return

      // Avoid stacking ripples on rapid double presses.
      const now = Date.now()
      if (now - last < 30) return
      last = now

      const rect = target.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 1.9
      const ripple = document.createElement('span')
      ripple.className = 'md-ripple'
      ripple.setAttribute('aria-hidden', 'true')
      ripple.style.width = `${size}px`
      ripple.style.height = `${size}px`
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`
      target.appendChild(ripple)

      animate(ripple, {
        scale: [0, 1],
        opacity: [0.22, 0],
        duration: 620,
        ease: 'outQuad',
        onComplete: () => ripple.remove()
      })
    },
    { passive: true }
  )
}
