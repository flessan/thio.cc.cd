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

/** A quick, springy acknowledgement for a tapped control. */
export function pop(element: Element | null | undefined) {
  if (!element || motionLevel() === 'off') return
  animate(element, {
    scale: [0.9, 1],
    rotate: [2, 0],
    duration: 520,
    ease: 'outBack(2)'
  })
}
