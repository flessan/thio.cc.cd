/**
 * Flessan motion system — powered by anime.js v4.
 * ---------------------------------------------------------------------------
 * Every animation is progressive enhancement: content is readable without it,
 * and `prefers-reduced-motion` turns the whole layer off. The module owns:
 *
 *  - a staged hero entrance (timeline + text splitting + SVG line drawing)
 *  - scroll-triggered content reveals (Scroll Observer)
 *  - counters, scroll-linked parallax and a draggable sticker (home page)
 *  - short page transitions between internal routes
 *
 * Everything is torn down on navigation so nothing leaks between pages.
 */
import {
  animate,
  createDraggable,
  createScope,
  createTimeline,
  onScroll,
  scrambleText,
  splitText,
  spring,
  stagger,
  svg,
  utils,
  type JSAnimation,
  type Scope
} from 'animejs'
import type { Router } from 'vitepress'

const REVEAL_SELECTOR = [
  '.vp-doc > div > h1',
  '.vp-doc > div > h2',
  '.vp-doc > div > h3',
  '.vp-doc > div > p',
  '.vp-doc > div > ul',
  '.vp-doc > div > ol',
  '.vp-doc > div > blockquote',
  '.vp-doc > div > pre',
  '.vp-doc > div > table',
  '.vp-doc > div > div[class*="language-"]',
  '.vp-doc > div > .container',
  '.vp-doc > div > .blog-cover',
  '.vp-doc > div > .lp',
  '.vp-doc > div > .re',
  '.vp-doc > div > .gh-activity',
  '.vp-doc > div > .tg',
  '.vp-doc > div > .lu',
  '.vp-doc > div > .my-activity',
  '.vp-doc > div > .kerja-launch',
  '.vp-doc > div > .educator-invite',
  '.vp-doc > div > .post-navigation',
  '.vp-doc > div > .blog-archive',
  '.vp-doc > div > .custom-block',
  '.vp-doc > div > .VPButton'
].join(',')

const INTRO_SELECTORS = [
  '.hero-eyebrow',
  '.hero-line',
  '.hero-line-sub',
  '.hero-lead',
  '.hero-btn',
  '.hero-support',
  '.hero-stat',
  '.hero-frame',
  '[data-hero-sticker]'
].join(',')

let scope: Scope | null = null
let mutationObserver: MutationObserver | null = null
let routeAnimation: JSAnimation | null = null
let routeGuard: number | undefined
let splitters: Array<{ revert: () => void }> = []
let installed = false

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Put an element back into its stylesheet state (used by the safety net). */
function restoreElement(element: HTMLElement) {
  element.style.removeProperty('opacity')
  element.style.removeProperty('translate')
  element.style.removeProperty('scale')
  element.style.removeProperty('rotate')
  element.style.removeProperty('transform')
  delete element.dataset.motionTarget
}

/** Hand transform control back to CSS so hover states keep working after a reveal. */
function releaseTransforms(elements: HTMLElement[]) {
  elements.forEach((element) => {
    element.style.removeProperty('transform')
    element.style.removeProperty('translate')
    element.style.removeProperty('scale')
    element.style.removeProperty('rotate')
  })
}

function showEverything(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLElement>('[data-motion-target]')
    .forEach(restoreElement)
}

/** Reset every animation and observer owned by the previous page. */
function teardown() {
  if (routeGuard) {
    window.clearTimeout(routeGuard)
    routeGuard = undefined
  }
  try {
    routeAnimation?.revert()
  } catch {
    /* a vanished target should never block navigation */
  }
  routeAnimation = null
  mutationObserver?.disconnect()
  mutationObserver = null
  try {
    scope?.revert()
  } catch {
    /* ditto */
  }
  scope = null
  splitters.forEach((splitter) => {
    try {
      splitter.revert()
    } catch {
      /* ignore */
    }
  })
  splitters = []
}

/**
 * Deep-link safety net: never leave content hidden because a browser skipped
 * an animation API partway through. Anything already on screen is restored.
 */
function armVisibilityFallback() {
  window.setTimeout(() => {
    document
      .querySelectorAll<HTMLElement>('[data-motion-target]')
      .forEach((element) => {
        const rect = element.getBoundingClientRect()
        const onScreen = rect.top < window.innerHeight + 120 && rect.bottom > -120
        if (onScreen && Number(getComputedStyle(element).opacity) < 0.05) {
          restoreElement(element)
        }
      })
  }, 2600)
}

/** Draw-in helper that also handles browsers without a path length. */
function scribbleDrawable(path: SVGPathElement | null) {
  if (!path) return []
  try {
    const drawable = svg.createDrawable(path)
    utils.set(drawable, { draw: '0 0' })
    return drawable
  } catch {
    return []
  }
}

function mark(...elements: Array<HTMLElement | null>) {
  elements.forEach((element) => {
    if (element) element.dataset.motionTarget = 'true'
  })
}

/**
 * The hero is the one place where we spend the "motion budget": a short,
 * choreographed timeline instead of scattered effects.
 */
function animateHero(hero: HTMLElement) {
  const eyebrow = hero.querySelector<HTMLElement>('.hero-eyebrow')
  const eyebrowText = hero.querySelector<HTMLElement>('.hero-eyebrow-text')
  const lines = Array.from(hero.querySelectorAll<HTMLElement>('.hero-line'))
  const subtitle = hero.querySelector<HTMLElement>('.hero-line-sub')
  const scribble = hero.querySelector<SVGPathElement>('.hero-scribble path')
  const lead = hero.querySelector<HTMLElement>('.hero-lead')
  const actions = Array.from(
    hero.querySelectorAll<HTMLElement>('.hero-btn, .hero-support')
  )
  const stats = Array.from(hero.querySelectorAll<HTMLElement>('.hero-stat'))
  const frame = hero.querySelector<HTMLElement>('.hero-frame')
  const sticker = hero.querySelector<HTMLElement>('[data-hero-sticker]')

  const introTargets = [
    eyebrow,
    ...lines,
    lead,
    ...actions,
    ...stats,
    frame,
    sticker
  ].filter((element): element is HTMLElement => Boolean(element))

  introTargets.forEach((element) => (element.dataset.motionTarget = 'true'))
  utils.set(introTargets, { opacity: 0 })

  // Split the subtitle into words so it can arrive as a gentle wave.
  let words: HTMLElement[] = []
  if (subtitle) {
    try {
      const splitter = splitText(subtitle, { words: true, accessible: true })
      splitters.push(splitter)
      words = splitter.words as HTMLElement[]
      utils.set(subtitle, { opacity: 1 })
      utils.set(words, { opacity: 0, y: '0.55em', rotate: 2.5 })
    } catch {
      subtitle.style.opacity = '1'
    }
  }

  const timeline = createTimeline({ defaults: { ease: 'outQuint' } })

  if (eyebrow) {
    timeline.add(eyebrow, { opacity: [0, 1], y: [10, 0], duration: 620 }, 0)
  }
  if (lines[0]) {
    timeline.add(lines[0], { opacity: [0, 1], y: [26, 0], duration: 900 }, 90)
  }
  if (words.length) {
    timeline.add(
      words,
      {
        opacity: [0, 1],
        y: ['0.55em', 0],
        rotate: [2.5, 0],
        duration: 780,
        delay: stagger(38)
      },
      320
    )
  }
  if (lead) {
    timeline.add(lead, { opacity: [0, 1], y: [16, 0], duration: 760 }, 560)
  }
  if (actions.length) {
    timeline.add(
      actions,
      {
        opacity: [0, 1],
        y: [14, 0],
        scale: [0.97, 1],
        duration: 680,
        delay: stagger(70),
        onComplete: () => releaseTransforms(actions)
      },
      700
    )
  }
  if (stats.length) {
    timeline.add(
      stats,
      { opacity: [0, 1], y: [12, 0], duration: 640, delay: stagger(60) },
      820
    )
  }
  if (frame) {
    timeline.add(
      frame,
      {
        opacity: [0, 1],
        y: [26, 0],
        rotate: [-1.6, -0.6],
        duration: 1100,
        onComplete: () => releaseTransforms([frame])
      },
      220
    )
  }

  // Draw the hand-made underline beneath the title.
  const drawable = scribbleDrawable(scribble)
  if (drawable.length) {
    timeline.add(drawable, { draw: '0 1', duration: 900 }, 620)
  }

  // The sticker pops in with its own springy beat.
  if (sticker) {
    mark(sticker)
    utils.set(sticker, { scale: 0.4, rotate: -14 })
    timeline.add(
      sticker,
      {
        opacity: [0, 1],
        scale: [0.4, 1],
        rotate: [-14, 5],
        duration: 1000,
        ease: 'outBack(2.2)'
      },
      900
    )
  }

  // Scramble the uppercase location line in (newest anime.js text API).
  if (eyebrowText) {
    try {
      animate(eyebrowText, {
        innerHTML: scrambleText({
          chars: 'a-zA-Z#%&*+=',
          cursor: true,
          perturbation: 12
        }),
        duration: 1150,
        delay: 140,
        ease: 'linear'
      })
    } catch {
      /* text stays as-is */
    }
  }

  // Counters: animate plain objects, write the rounded value back to the DOM.
  hero.querySelectorAll<HTMLElement>('[data-count]').forEach((element) => {
    const value = Number.parseInt(element.dataset.count ?? '', 10)
    if (!Number.isFinite(value) || value <= 0) return
    const counter = { value: 0 }
    element.textContent = '0'
    animate(counter, {
      value,
      duration: 1500,
      delay: 760,
      ease: 'outExpo',
      onUpdate: () => {
        element.textContent = String(Math.round(counter.value))
      },
      onComplete: () => {
        element.textContent = String(value)
      }
    })
  })

  // Scroll-linked parallax on the atmosphere, without touching the frame hover.
  const atmosphere = hero.querySelector<HTMLElement>('.hero-atmosphere')
  if (atmosphere) {
    animate(atmosphere, {
      y: ['0%', '12%'],
      ease: 'linear',
      autoplay: onScroll({
        target: hero,
        enter: { target: 'top', container: 'top' },
        leave: { target: 'bottom', container: 'top' },
        sync: true
      })
    })
  }

  // A playful, draggable sticker — skip phones, where dragging fights scrolling.
  const touchOnly =
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(any-pointer: fine)').matches
  if (sticker && !touchOnly) {
    try {
      createDraggable(sticker, {
        container: hero.querySelector<HTMLElement>('.hero-stage') ?? hero,
        containerPadding: 8,
        releaseEase: spring({ stiffness: 90, damping: 11 }),
        onGrab: () => animate(sticker, { scale: 1.08, rotate: 8, duration: 280 }),
        onRelease: () => animate(sticker, { scale: 1, rotate: 5, duration: 500 })
      })
    } catch {
      /* dragging is a bonus, never a requirement */
    }
  }
}

/** Reveal direct children of the markdown body as they enter the viewport. */
function revealContent(hero: HTMLElement | null) {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
  ).filter((element) => !hero?.contains(element) && !element.dataset.motionSeen)

  if (!candidates.length) return

  const viewport = window.innerHeight
  const inView: HTMLElement[] = []
  const below: HTMLElement[] = []

  candidates.forEach((element) => {
    element.dataset.motionSeen = 'true'
    element.dataset.motionTarget = 'true'
    const rect = element.getBoundingClientRect()
    if (rect.top < viewport * 0.94 && rect.bottom > -40) inView.push(element)
    else below.push(element)
  })

  if (inView.length) {
    utils.set(inView, { opacity: 0, y: 18 })
    animate(inView, {
      opacity: 1,
      y: 0,
      duration: 780,
      delay: stagger(48, { start: 80 }),
      ease: 'outQuint',
      onComplete: () => releaseTransforms(inView)
    })
  }

  below.forEach((element) => {
    utils.set(element, { opacity: 0, y: 24 })
    animate(element, {
      opacity: 1,
      y: 0,
      duration: 780,
      ease: 'outQuint',
      onComplete: () => releaseTransforms([element]),
      autoplay: onScroll({
        target: element,
        enter: { target: 'top', container: 'bottom' },
        repeat: false
      })
    })
  })
}

/** Async islands (GitHub, Telegram…) mount later; reveal them when they do. */
function watchLateContent() {
  const root = document.querySelector<HTMLElement>('.vp-doc')
  if (!root || !('MutationObserver' in window)) return
  const hero = document.querySelector<HTMLElement>('[data-hero]')

  mutationObserver = new MutationObserver((records) => {
    const added: HTMLElement[] = []
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        if (node.matches(REVEAL_SELECTOR)) added.push(node)
        node
          .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
          .forEach((element) => added.push(element))
      })
    }
    const fresh = added.filter(
      (element) =>
        !hero?.contains(element) &&
        !element.dataset.motionSeen &&
        element.getBoundingClientRect().top < window.innerHeight + 200
    )
    if (!fresh.length) return
    fresh.forEach((element) => {
      element.dataset.motionSeen = 'true'
      element.dataset.motionTarget = 'true'
    })
    utils.set(fresh, { opacity: 0, y: 18 })
    animate(fresh, {
      opacity: 1,
      y: 0,
      duration: 700,
      delay: stagger(40),
      ease: 'outQuint',
      onComplete: () => releaseTransforms(fresh)
    })
  })

  mutationObserver.observe(root, { childList: true, subtree: true })
}

function runPageMotion() {
  teardown()

  if (reducedMotion()) {
    showEverything()
    return
  }

  scope = createScope({ root: document.body })

  scope.add(() => {
    const hero = document.querySelector<HTMLElement>('[data-hero]')
    if (hero) {
      try {
        animateHero(hero)
      } catch {
        hero
          .querySelectorAll<HTMLElement>(INTRO_SELECTORS)
          .forEach(restoreElement)
      }
    }
    revealContent(hero)
    watchLateContent()
    armVisibilityFallback()
  })
}

/**
 * Install the motion layer. Called once from the theme, with the VitePress
 * router so client-side navigations get the same treatment as a full load.
 */
export function installMotion(router?: Router) {
  if (typeof window === 'undefined' || installed) return
  installed = true

  const start = () =>
    window.requestAnimationFrame(() => window.requestAnimationFrame(runPageMotion))
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', () => {
    if (motionQuery.matches) {
      teardown()
      showEverything()
    } else {
      runPageMotion()
    }
  })

  if (!router) return

  // Fade the article out before the next page is mounted.
  router.onBeforeRouteChange = async (to: string) => {
    if (reducedMotion()) return
    let next: URL
    try {
      next = new URL(to, window.location.href)
    } catch {
      return
    }
    if (next.pathname === window.location.pathname) return

    const from = window.location.pathname
    routeAnimation?.revert()
    routeAnimation = animate('.vp-doc', {
      opacity: [1, 0],
      y: [0, -8],
      duration: 190,
      ease: 'inQuad'
    })
    await routeAnimation.then()

    // If the navigation stalls, do not leave the page invisible.
    routeGuard = window.setTimeout(() => {
      if (window.location.pathname === from) {
        routeAnimation?.revert()
        window
          .querySelectorAll<HTMLElement>('.vp-doc, .vp-doc [data-motion-target]')
          .forEach(restoreElement)
      }
    }, 1600)
  }

  router.onAfterRouteChanged = () => {
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(runPageMotion)
    )
  }
}
