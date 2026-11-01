// https://vitepress.dev/guide/custom-theme
// A small layer over the default VitePress theme: shared components, motion,
// the custom 404 page, and the theme-switch view transition.
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import { installMotion } from './motion'

import CopyButton from './components/CopyButton.vue'
import PostMeta from './components/PostMeta.vue'
import PostNav from './components/PostNav.vue'
import RepoExplorer from './components/RepoExplorer.vue'
import GithubActivity from './components/GithubActivity.vue'
import TelegramFeed from './components/TelegramFeed.vue'
import LatestUpdate from './components/LatestUpdate.vue'
import LinkPreview from './components/LinkPreview.vue'
import NotFound from './components/NotFound.vue'
import BackToTop from './components/BackToTop.vue'
import HomeHero from './components/HomeHero.vue'
import Playground from './components/Playground.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import { installLightbox } from './lightbox'
import BlogCover from './components/BlogCover.vue'
import BlogPost from './components/BlogPost.vue'
import BlogDirectory from './components/BlogDirectory.vue'
import PostTools from './components/PostTools.vue'
import EducatorInvite from './components/EducatorInvite.vue'
import YouTubeVideo from './components/YouTubeVideo.vue'
import LanyardActivity from './components/LanyardActivity.vue'
import Kerja from './components/Kerja.vue'
import KerjaLaunch from './components/KerjaLaunch.vue'

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

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'not-found': () => h(NotFound),
      'layout-bottom': () => [h(ReadingProgress), h(BackToTop), h(Playground)]
    })
  },
  enhanceApp({ app, router }) {
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
    app.component('BlogDirectory', BlogDirectory)
    app.component('PostTools', PostTools)
    app.component('EducatorInvite', EducatorInvite)
    app.component('YouTubeVideo', YouTubeVideo)
    app.component('LanyardActivity', LanyardActivity)
    app.component('Kerja', Kerja)
    app.component('KerjaLaunch', KerjaLaunch)
    app.component('HomeHero', HomeHero)

    // click any content image to view it full-size
    installLightbox()

    // anime.js-driven page reveals, hero choreography and page transitions
    installMotion(router)

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

    installThemeTransition()
  }
} satisfies Theme
