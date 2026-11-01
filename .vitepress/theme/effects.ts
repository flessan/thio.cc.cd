/**
 * Small anime.js helpers shared by the playful UI pieces.
 * Everything here is optional decoration: callers can fire and forget, and the
 * functions bail out when the visitor asked for less motion.
 */
import { animate, stagger } from 'animejs'

const CONFETTI_COLORS = ['#ffc93c', '#ff9a5c', '#63dba2', '#7fcaff', '#ffa3cf', '#c4a8ff']

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

export function confetti(x: number, y: number, count = 18) {
  if (motionLevel() !== 'playful' || typeof document === 'undefined') return
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'

  const pieces: HTMLElement[] = []
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i')
    piece.className = 'fl-confetti-piece'
    const size = 6 + Math.random() * 7
    piece.style.width = `${size}px`
    piece.style.height = `${size * (Math.random() > 0.5 ? 1 : 0.55)}px`
    piece.style.left = `${x}px`
    piece.style.top = `${y}px`
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    piece.style.borderRadius = Math.random() > 0.5 ? '999px' : '2px'
    layer.appendChild(piece)
    pieces.push(piece)
  }

  document.body.appendChild(layer)

  animate(pieces, {
    x: () => (Math.random() - 0.5) * 260,
    y: () => 60 + Math.random() * 220,
    rotate: () => (Math.random() - 0.5) * 540,
    opacity: [1, 0],
    duration: () => 700 + Math.random() * 600,
    delay: stagger(12),
    ease: 'outQuad',
    onComplete: () => layer.remove()
  })
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
