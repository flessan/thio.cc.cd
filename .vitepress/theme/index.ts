// https://vitepress.dev/guide/custom-theme
// Minimal layer over the default VitePress theme: the look stays 100% stock,
// we only add the custom not-found page, shared components, and a search hotkey.
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'

import CopyButton from './components/CopyButton.vue'
import PostMeta from './components/PostMeta.vue'
import PostNav from './components/PostNav.vue'
import RepoExplorer from './components/RepoExplorer.vue'
import GithubActivity from './components/GithubActivity.vue'
import TelegramFeed from './components/TelegramFeed.vue'
import LatestUpdate from './components/LatestUpdate.vue'
import LinkPreview from './components/LinkPreview.vue'
import NotFound from './components/NotFound.vue'
import { installLightbox } from './lightbox'
import BlogCover from './components/BlogCover.vue'
import BlogPost from './components/BlogPost.vue'
import YouTubeVideo from './components/YouTubeVideo.vue'
import LanyardActivity from './components/LanyardActivity.vue'

function openSearch() {
  const btn = document.querySelector<HTMLElement>('.VPNavBarSearch button')
  if (btn) {
    btn.click()
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '.VPLocalSearchBox input, .search-input'
      )
      input?.focus()
    }, 60)
  }
}

let hotkeyBound = false
let themeTransitionInstalled = false
let replayingThemeToggle = false

/**
 * Intercept the VitePress appearance switch and replay its normal click inside
 * the View Transitions API. Browsers without support use the CSS colour fades.
 */
function installThemeTransition() {
  if (typeof window === 'undefined' || themeTransitionInstalled) return
  themeTransitionInstalled = true

  type TransitionDocument = Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> }
  }

  const transitionDocument = document as TransitionDocument
  const cleanUp = () => {
    document.documentElement.classList.remove('theme-switching')
    document.documentElement.style.removeProperty('--theme-toggle-x')
    document.documentElement.style.removeProperty('--theme-toggle-y')
  }

  document.addEventListener('click', (event: MouseEvent) => {
    if (replayingThemeToggle || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof transitionDocument.startViewTransition !== 'function') return

    const target = event.target
    if (!(target instanceof Element)) return
    const toggle = target.closest<HTMLElement>('.VPSwitchAppearance')
    if (!toggle) return

    // Keep the toggle's native VitePress handler as the single source of truth.
    event.preventDefault()
    event.stopImmediatePropagation()

    const x = event.clientX || Math.round(window.innerWidth * 0.88)
    const y = event.clientY || 32
    document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
    document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)
    document.documentElement.classList.add('theme-switching')

    try {
      const transition = transitionDocument.startViewTransition(() => {
        replayingThemeToggle = true
        try {
          toggle.click()
        } finally {
          replayingThemeToggle = false
        }
      })
      void transition.finished.then(cleanUp, cleanUp)
    } catch {
      // If the transition API fails unexpectedly, do not block theme switching.
      cleanUp()
      replayingThemeToggle = true
      try {
        toggle.click()
      } finally {
        replayingThemeToggle = false
      }
    }
  }, true)
}
let motionInstalled = false

/**
 * Add subtle entrance animations to article content as it enters the viewport.
 * Uses one observer for the whole site, and fails open when motion APIs are
 * unavailable or the visitor prefers reduced motion.
 */
function installMotion() {
  if (typeof window === 'undefined' || motionInstalled) return
  motionInstalled = true

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) return

  const selector = [
    '.vp-doc > div > h1',
    '.vp-doc > div > h2',
    '.vp-doc > div > h3',
    '.vp-doc > div > p',
    '.vp-doc > div > ul',
    '.vp-doc > div > ol',
    '.vp-doc > div > blockquote',
    '.vp-doc > div > pre',
    '.vp-doc > div > div[class*="language-"]',
    '.vp-doc .container',
    '.vp-doc .blog-cover',
    '.vp-doc .VPButton',
    '.vp-doc .link-preview',
    '.vp-doc .repo-explorer',
    '.vp-doc .telegram-feed',
    '.vp-doc .my-activity'
  ].join(',')

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const element = entry.target as HTMLElement
      element.classList.add('is-visible')
      observer.unobserve(element)
    }
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -6% 0px'
  })

  const scan = () => {
    if (prefersReducedMotion.matches) {
      document.documentElement.classList.remove('motion-enabled')
      document.querySelectorAll('.motion-reveal').forEach((node) => {
        node.classList.add('is-visible')
        observer.unobserve(node)
      })
      return
    }

    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => !element.classList.contains('motion-reveal'))

    elements.forEach((element, index) => {
      element.classList.add('motion-reveal')
      element.style.setProperty('--motion-index', String(index % 6))
      observer.observe(element)
    })

    document.documentElement.classList.add('motion-enabled')
  }

  // One observer handles initial page content and VitePress client-side navigation.
  const mutationObserver = new MutationObserver(() => {
    window.requestAnimationFrame(scan)
  })

  const start = () => {
    scan()
    mutationObserver.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }

  prefersReducedMotion.addEventListener('change', (event) => {
    if (event.matches) {
      document.documentElement.classList.remove('motion-enabled')
      document.querySelectorAll('.motion-reveal').forEach((node) => {
        node.classList.add('is-visible')
        observer.unobserve(node)
      })
    } else {
      scan()
    }
  })
}

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'not-found': () => h(NotFound)
    })
  },
  enhanceApp({ app }) {
    app.component('CopyButton', CopyButton)
    app.component('PostMeta', PostMeta)
    app.component('PostNav', PostNav)
    app.component('RepoExplorer', RepoExplorer)
    app.component('GithubActivity', GithubActivity)
    app.component('TelegramFeed', TelegramFeed)
    app.component('LatestUpdate', LatestUpdate)
    app.component('LinkPreview', LinkPreview)
    app.component('BlogCover', BlogCover)
    app.component('BlogPost', BlogPost)
    app.component('YouTubeVideo', YouTubeVideo)
    app.component('LanyardActivity', LanyardActivity)

    // click any content image to view it full-size (styles injected in JS,
    // so style.css keeps its original bytes)
    installLightbox()
    installMotion()
    installThemeTransition()

    // Ctrl K / Cmd K (or "/" outside inputs) opens search, anywhere on the site
    if (typeof window !== 'undefined' && !hotkeyBound) {
      hotkeyBound = true
      window.addEventListener('keydown', (e) => {
        const t = e.target as HTMLElement | null
        const typing =
          !!t &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.tagName === 'SELECT' ||
            t.isContentEditable)
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          openSearch()
        } else if (e.key === '/' && !typing) {
          e.preventDefault()
          openSearch()
        }
      })
    }
  }
} satisfies Theme
