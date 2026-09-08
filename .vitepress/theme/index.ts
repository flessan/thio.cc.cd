// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'

import BlogCover from './components/BlogCover.vue'
import BlogPost from './components/BlogPost.vue'
import YouTubeVideo from './components/YouTubeVideo.vue'
import HomeHero from './components/HomeHero.vue'
import TerminalWindow from './components/TerminalWindow.vue'
import WitaClock from './components/WitaClock.vue'
import SectionHead from './components/SectionHead.vue'
import ProjectCard from './components/ProjectCard.vue'
import LinkCard from './components/LinkCard.vue'
import TimelineList from './components/TimelineList.vue'
import SocialGrid from './components/SocialGrid.vue'
import NotFound from './components/NotFound.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'not-found': () => h(NotFound)
    })
  },
  enhanceApp({ app }) {
    app.component('BlogCover', BlogCover)
    app.component('BlogPost', BlogPost)
    app.component('YouTubeVideo', YouTubeVideo)
    app.component('HomeHero', HomeHero)
    app.component('TerminalWindow', TerminalWindow)
    app.component('WitaClock', WitaClock)
    app.component('SectionHead', SectionHead)
    app.component('ProjectCard', ProjectCard)
    app.component('LinkCard', LinkCard)
    app.component('TimelineList', TimelineList)
    app.component('SocialGrid', SocialGrid)
  }
} satisfies Theme
