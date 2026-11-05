/**
 * Anime.js helpers for the workspace.
 *
 * Every helper is a no-op when the visitor reduced motion, so animation is
 * always decoration on top of a working interface.
 */
import { animate, stagger } from 'animejs'
import { motionLevel, motionProfile } from '../effects'

function allowed(): boolean {
  return typeof window !== 'undefined' && motionLevel() !== 'off'
}

/** A springy acknowledgement for a button or field. */
export function bump(element: Element | null | undefined): void {
  if (!element || !allowed()) return
  const profile = motionProfile()
  animate(element, {
    scale: profile.expressive ? [1, 1.06, 1] : [1, 1.04, 1],
    duration: 320 * profile.duration,
    ease: 'inOutQuad'
  })
}

/** Reveal a group of elements with a small stagger. */
export function reveal(elements: Element[] | NodeListOf<Element>, step = 45): void {
  if (!allowed() || !elements.length) return
  const profile = motionProfile()
  const list = Array.from(elements)
  animate(list, {
    opacity: [0, 1],
    y: [12 * profile.travel, 0],
    duration: 420 * profile.duration,
    delay: stagger(Math.round(step * profile.delay), { start: 40 }),
    ease: 'outQuint',
    onComplete: () => {
      list.forEach((item) => {
        ;(item as HTMLElement).style.removeProperty('opacity')
        ;(item as HTMLElement).style.removeProperty('translate')
      })
    }
  })
}

/** Slide the newly selected tab into view. */
export function tabEnter(element: Element | null | undefined): void {
  if (!element || !allowed()) return
  const profile = motionProfile()
  animate(element, {
    opacity: [0, 1],
    y: [profile.expressive ? 18 : 10, 0],
    duration: 380 * profile.duration,
    ease: 'outQuint'
  })
}

/** A restrained success pulse, used after a manual sync. */
export function successPulse(element: Element | null | undefined): void {
  if (!element || !allowed()) return
  animate(element, {
    boxShadow: [
      '0 0 0 0 color-mix(in srgb, var(--md-primary) 40%, transparent)',
      '0 0 0 8px transparent'
    ],
    duration: 620,
    ease: 'outQuad'
  })
}
