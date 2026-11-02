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

/**
 * Timing knobs for the current motion level.
 *
 * Expressive ("playful") is deliberately slower than standard: longer
 * durations, longer delays, more travel and a little extra scale, which is
 * what makes the M3 Expressive choreography readable instead of twitchy.
 */
export interface MotionProfile {
  level: 'playful' | 'calm' | 'off'
  expressive: boolean
  /** multiply anime.js durations */
  duration: number
  /** multiply delays and stagger steps */
  delay: number
  /** multiply vertical travel and scale deltas */
  travel: number
}

export function motionProfile(): MotionProfile {
  const level = motionLevel()
  const expressive = level === 'playful'
  return {
    level,
    expressive,
    duration: expressive ? 1.7 : 1,
    delay: expressive ? 1.45 : 1,
    travel: expressive ? 1.45 : 1
  }
}

/**
 * CSS transitions and a JS-driven transform on the same element fight each
 * other: every frame the animation writes, the browser starts a new transition
 * towards it. Freeze the element's transitions for the duration of the scripted
 * animation so it moves at exactly the speed the timeline intends.
 */
export function freezeTransitions(elements: Iterable<Element>, duration = 1200) {
  const list = Array.from(elements)
  if (!list.length) return
  list.forEach((element) => element.classList.add('js-animating'))
  window.setTimeout(() => {
    list.forEach((element) => element.classList.remove('js-animating'))
  }, duration)
}

/** Material state layer: a springy acknowledgement for a tapped control. */
export function pop(element: Element | null | undefined) {
  const profile = motionProfile()
  if (!element || profile.level === 'off') return
  animate(element, {
    scale: profile.expressive ? [0.82, 1] : [0.86, 1],
    rotate: profile.expressive ? [3.4, 0] : [2.5, 0],
    duration: 560 * profile.duration,
    ease: 'outBack(2.4)'
  })
}

/** A short overshoot used when a chip, card or button is selected. */
export function bounce(element: Element | null | undefined) {
  const profile = motionProfile()
  if (!element || profile.level === 'off') return
  animate(element, {
    scale: profile.expressive ? [1, 1.11, 1] : [1, 1.08, 1],
    duration: 420 * profile.duration,
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

      const profile = motionProfile()
      const rect = target.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * (profile.expressive ? 2.2 : 1.9)
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
        opacity: [profile.expressive ? 0.26 : 0.22, 0],
        duration: 620 * profile.duration,
        ease: 'outQuad',
        onComplete: () => ripple.remove()
      })
    },
    { passive: true }
  )
}
