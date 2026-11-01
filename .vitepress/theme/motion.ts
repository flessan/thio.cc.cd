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
import { whenHydrated } from './hydration'
import { motionProfile } from './effects'

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
  '.hero-chip',
  '.hero-line',
  '.hero-line-sub',
  '.hero-lead',
  '.hero-btn',
  '.hero-meta',
  '.hero-stat',
  '.hero-art',
  '.hero-badge',
  '.hero-search',
  '[data-hero-shape]'
].join(',')

let scope: Scope | null = null
let mutationObserver: MutationObserver | null = null
let routeAnimation: JSAnimation | null = null
let routeGuard: number | undefined
let splitters: Array<{ revert: () => void }> = []
let tickerTimer: number | undefined
let installed = false

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** "Still" from the playground turns the whole layer off. */
const motionOff = () =>
  typeof document !== 'undefined' &&
  document.documentElement.dataset.motion === 'off'

const TICKER_PHRASES = [
  'shipping small, useful tools',
  'reading other people\u2019s source code',
  'tuning the GDIPS server',
  'making the web a little calmer',
  'probably writing a build script'
]

/** Rotate the hero "right now" line with a scramble, anime.js style. */
function startTicker(hero: HTMLElement) {
  const element = hero.querySelector<HTMLElement>('[data-ticker]')
  if (!element || reducedMotion() || motionOff()) return
  const profile = motionProfile()
  const scrambleDuration = Math.round(900 * profile.duration)
  let index = 0
  tickerTimer = window.setInterval(() => {
    index = (index + 1) % TICKER_PHRASES.length
    try {
      animate(element, {
        innerHTML: scrambleText({
          text: TICKER_PHRASES[index],
          chars: 'a-z0-9!?',
          perturbation: profile.expressive ? 6 : 8
        }),
        duration: scrambleDuration,
        ease: 'linear'
      })
    } catch {
      element.textContent = TICKER_PHRASES[index]
    }
  }, 3600 + scrambleDuration)
}

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
  if (tickerTimer) {
    window.clearInterval(tickerTimer)
    tickerTimer = undefined
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
  // Expressive entrances are deliberately longer, so the rescue net waits too.
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
  }, Math.round(2600 * motionProfile().duration))
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
  const profile = motionProfile()
  // Expressive mode gets slower, longer travel — standard keeps today's pace.
  const D = (value: number) => Math.round(value * profile.duration)
  const T = (value: number) => Math.round(value * profile.delay)
  const V = (value: number) => Math.round(value * profile.travel)

  const chip = hero.querySelector<HTMLElement>('.hero-chip')
  const chipText = hero.querySelector<HTMLElement>('.hero-chip-text')
  const lines = Array.from(hero.querySelectorAll<HTMLElement>('.hero-line'))
  const subtitle = hero.querySelector<HTMLElement>('.hero-line-sub')
  const lead = hero.querySelector<HTMLElement>('.hero-lead')
  const actions = Array.from(hero.querySelectorAll<HTMLElement>('.hero-btn'))
  const meta = hero.querySelector<HTMLElement>('.hero-meta')
  const stats = Array.from(hero.querySelectorAll<HTMLElement>('.hero-stat'))
  const art = hero.querySelector<HTMLElement>('.hero-art')
  const figure = hero.querySelector<HTMLElement>('.hero-figure')
  const badge = hero.querySelector<HTMLElement>('.hero-badge')
  const search = hero.querySelector<HTMLElement>('.hero-search')
  const shapes = Array.from(hero.querySelectorAll<HTMLElement>('[data-hero-shape]'))

  const introTargets = [
    chip,
    ...lines,
    lead,
    ...actions,
    meta,
    ...stats,
    art,
    badge,
    search
  ].filter((element): element is HTMLElement => Boolean(element))

  introTargets.forEach((element) => (element.dataset.motionTarget = 'true'))
  utils.set(introTargets, { opacity: 0 })

  // Split the subtitle so it can arrive as a soft wave.
  let words: HTMLElement[] = []
  if (subtitle) {
    try {
      const splitter = splitText(subtitle, { words: true, accessible: true })
      splitters.push(splitter)
      words = splitter.words as HTMLElement[]
      utils.set(subtitle, { opacity: 1 })
      utils.set(words, { opacity: 0, y: `${0.6 * profile.travel}em`, scale: 0.94 })
    } catch {
      subtitle.style.opacity = '1'
    }
  }

  // M3 expressive shapes: visible, slowly breathing behind the photo.
  shapes.forEach((shape) => {
    shape.dataset.motionTarget = 'true'
    utils.set(shape, { opacity: 0, scale: 0.6, rotate: -18 })
  })

  const timeline = createTimeline({ defaults: { ease: 'outQuint' } })

  if (chip) {
    timeline.add(
      chip,
      {
        opacity: [0, 1],
        y: [V(16), 0],
        scale: [0.9, 1],
        duration: D(640),
        ease: 'outBack(1.7)'
      },
      0
    )
  }
  if (lines[0]) {
    timeline.add(
      lines[0],
      {
        opacity: [0, 1],
        y: [V(40), 0],
        scale: [0.96, 1],
        duration: D(920),
        ease: 'outExpo'
      },
      T(90)
    )
  }
  if (words.length) {
    timeline.add(
      words,
      {
        opacity: [0, 1],
        y: [`${0.6 * profile.travel}em`, 0],
        scale: [0.94, 1],
        duration: D(760),
        delay: stagger(Math.round(26 * profile.delay))
      },
      T(300)
    )
  }
  if (lead) {
    timeline.add(lead, { opacity: [0, 1], y: [V(20), 0], duration: D(760) }, T(460))
  }
  if (actions.length) {
    timeline.add(
      actions,
      {
        opacity: [0, 1],
        y: [V(18), 0],
        scale: [0.92, 1],
        duration: D(720),
        delay: stagger(Math.round(80 * profile.delay)),
        ease: 'outBack(1.5)',
        onComplete: () => releaseTransforms(actions)
      },
      T(520)
    )
  }
  if (meta) {
    timeline.add(meta, { opacity: [0, 1], y: [V(12), 0], duration: D(620) }, T(640))
  }
  if (art) {
    timeline.add(
      art,
      {
        opacity: [0, 1],
        y: [V(44), 0],
        scale: [0.9, 1],
        rotate: [-3.5 * profile.travel, 0],
        duration: D(1180),
        ease: 'outBack(1.25)',
        onComplete: () => releaseTransforms([art])
      },
      T(160)
    )
  }
  if (shapes.length) {
    timeline.add(
      shapes,
      {
        opacity: [0, 1],
        scale: [0.6, 1],
        rotate: [-18, 0],
        duration: D(1000),
        delay: stagger(Math.round(120 * profile.delay)),
        ease: 'outBack(1.5)',
        onComplete: () => releaseTransforms(shapes)
      },
      T(120)
    )
  }
  if (badge) {
    timeline.add(
      badge,
      {
        opacity: [0, 1],
        y: [V(14), 0],
        scale: [0.9, 1],
        duration: D(700),
        ease: 'outBack(1.6)'
      },
      T(760)
    )
  }
  if (stats.length) {
    timeline.add(
      stats,
      {
        opacity: [0, 1],
        y: [V(18), 0],
        scale: [0.97, 1],
        duration: D(640),
        delay: stagger(Math.round(70 * profile.delay)),
        onComplete: () => releaseTransforms(stats)
      },
      T(720)
    )
  }
  if (search) {
    timeline.add(
      search,
      {
        opacity: [0, 1],
        y: [V(26), 0],
        scale: [0.97, 1],
        duration: D(900),
        onComplete: () => releaseTransforms([search])
      },
      T(860)
    )
  }

  // Uppercase status line scrambles in (anime.js text API).
  if (chipText) {
    try {
      animate(chipText, {
        innerHTML: scrambleText({
          chars: 'a-z#%&*+=',
          cursor: true,
          perturbation: 10
        }),
        duration: D(1100),
        delay: T(180),
        ease: 'linear'
      })
    } catch {
      /* text stays as-is */
    }
  }

  // Counters: animate a plain object, write the rounded value back.
  hero.querySelectorAll<HTMLElement>('[data-count]').forEach((element) => {
    const value = Number.parseInt(element.dataset.count ?? '', 10)
    if (!Number.isFinite(value) || value <= 0) return
    const counter = { value: 0 }
    element.textContent = '0'
    animate(counter, {
      value,
      duration: D(1500),
      delay: T(780),
      ease: 'outExpo',
      onUpdate: () => {
        element.textContent = String(Math.round(counter.value))
      },
      onComplete: () => {
        element.textContent = String(value)
      }
    })
  })

  // Ambient shape morph — the Material Expressive signature.
  shapes.forEach((shape, index) => {
    try {
      animate(shape, {
        borderRadius: [
          '42% 58% 63% 37% / 41% 44% 56% 59%',
          '58% 42% 38% 62% / 55% 39% 61% 45%',
          '42% 58% 63% 37% / 41% 44% 56% 59%'
        ],
        duration: Math.round(
          (9000 + index * 1600) * (profile.expressive ? 1.7 : 1)
        ),
        loop: true,
        ease: 'inOutSine',
        delay: T(900 + index * 220)
      })
      animate(shape, {
        rotate: index % 2 === 0 ? [0, 24] : [0, -20],
        scale: [1, profile.expressive ? 1.06 : 1.04],
        duration: Math.round(
          (6400 + index * 900) * (profile.expressive ? 1.7 : 1)
        ),
        loop: true,
        alternate: true,
        ease: 'inOutSine',
        delay: T(1000 + index * 260)
      })
      if (profile.expressive) {
        // Extra layer: the blobs drift up and down like slow lava. The
        // draggable blob owns its own translate, so it is left alone.
        if (shape.classList.contains('hero-shape-a')) return
        animate(shape, {
          y: [-(6 + index * 5), 6 + index * 5],
          duration: Math.round((5200 + index * 900) * profile.duration),
          loop: true,
          alternate: true,
          ease: 'inOutSine',
          delay: T(1800 + index * 300)
        })
      }
    } catch {
      /* ambient motion is a bonus */
    }
  })

  // Scroll-linked drift on the art panel, without fighting the entrance.
  if (art) {
    animate(art, {
      y: ['0%', profile.expressive ? '11%' : '7%'],
      ease: 'linear',
      autoplay: onScroll({
        target: hero,
        enter: { target: 'top', container: 'top' },
        leave: { target: 'bottom', container: 'top' },
        sync: 0.35
      })
    })
  }

  // Expressive gets a second, quieter layer of ambient motion on the art.
  if (profile.expressive && figure) {
    try {
      animate(figure, {
        scale: [1, 1.035],
        duration: 9600,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
        delay: 2400
      })
      if (badge) {
        animate(badge, {
          y: [-4, 4],
          rotate: [-1.4, 1.4],
          duration: 5600,
          loop: true,
          alternate: true,
          ease: 'inOutSine',
          delay: 2600
        })
      }
      if (search) {
        // A single soft settle after the entrance, not a loop.
        animate(search, {
          scale: [1, 1.008, 1],
          duration: 1200,
          delay: 2800,
          ease: 'inOutQuad'
        })
      }
    } catch {
      /* ambient motion is a bonus */
    }
  }

  // Expressive: one draggable shape on precise pointers.
  const touchOnly =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const draggableShape = hero.querySelector<HTMLElement>('.hero-shape-a')
  if (draggableShape && !touchOnly && motionLevelPlayful()) {
    try {
      draggableShape.dataset.motionTarget = 'true'
      createDraggable(draggableShape, {
        container: hero.querySelector<HTMLElement>('.hero-art') ?? hero,
        releaseEase: spring({ stiffness: 220, damping: 18 }),
        onGrab: () => animate(draggableShape, { scale: 1.12, duration: 260 }),
        onRelease: () => animate(draggableShape, { scale: 1, duration: 520 })
      })
    } catch {
      /* dragging is a bonus, never a requirement */
    }
  }
}

const motionLevelPlayful = () =>
  typeof document !== 'undefined' && (document.documentElement.dataset.motion ?? 'playful') === 'playful'

/** Reveal direct children of the markdown body as they enter the viewport. */
function revealContent(hero: HTMLElement | null) {
  const profile = motionProfile()
  const duration = Math.round(780 * profile.duration)
  const travel = Math.round(18 * profile.travel)

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
    utils.set(inView, {
      opacity: 0,
      y: travel,
      scale: profile.expressive ? 0.985 : 1
    })
    animate(inView, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      delay: stagger(Math.round(48 * profile.delay), {
        start: Math.round(80 * profile.delay)
      }),
      ease: 'outQuint',
      onComplete: () => releaseTransforms(inView)
    })
  }

  below.forEach((element) => {
    utils.set(element, { opacity: 0, y: Math.round(24 * profile.travel) })
    animate(element, {
      opacity: 1,
      y: 0,
      duration,
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
    const profile = motionProfile()
    utils.set(fresh, { opacity: 0, y: Math.round(18 * profile.travel) })
    animate(fresh, {
      opacity: 1,
      y: 0,
      duration: Math.round(700 * profile.duration),
      delay: stagger(Math.round(40 * profile.delay)),
      ease: 'outQuint',
      onComplete: () => releaseTransforms(fresh)
    })
  })

  mutationObserver.observe(root, { childList: true, subtree: true })
}

function runPageMotion() {
  teardown()

  if (reducedMotion() || motionOff()) {
    showEverything()
    return
  }

  scope = createScope({ root: document.body })

  scope.add(() => {
    const hero = document.querySelector<HTMLElement>('[data-hero]')
    if (hero) {
      try {
        animateHero(hero)
        startTicker(hero)
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

  // Wait for hydration before touching the server-rendered DOM, otherwise Vue
  // reports a hydration mismatch on the hero.
  const start = () =>
    whenHydrated(() =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(runPageMotion)
      )
    )
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

  // The playground can switch motion between playful / calm / still.
  let lastMotion = document.documentElement.dataset.motion ?? 'playful'
  window.addEventListener('flessan:settings', () => {
    const next = document.documentElement.dataset.motion ?? 'playful'
    if (next === lastMotion) return
    lastMotion = next
    runPageMotion()
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

    const profile = motionProfile()
    const from = window.location.pathname
    routeAnimation?.revert()
    routeAnimation = animate('.vp-doc', {
      opacity: [1, 0],
      y: [0, -8 * profile.travel],
      scale: profile.expressive ? [1, 0.985] : 1,
      duration: Math.round(190 * profile.duration),
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
      window.requestAnimationFrame(() => {
        runPageMotion()
        const profile = motionProfile()
        if (!profile.expressive || reducedMotion()) return
        const shell =
          document.querySelector<HTMLElement>('#VPContent') ??
          document.querySelector<HTMLElement>('.VPContent')
        if (!shell) return
        try {
          animate(shell, {
            opacity: [0.4, 1],
            y: [12, 0],
            duration: 560,
            ease: 'outQuint',
            onComplete: () => {
              shell.style.removeProperty('opacity')
              shell.style.removeProperty('translate')
            }
          })
        } catch {
          /* the entrance is decoration only */
        }
      })
    )
  }
}
