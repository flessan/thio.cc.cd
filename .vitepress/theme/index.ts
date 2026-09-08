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
import NotFound from './components/NotFound.vue'

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
