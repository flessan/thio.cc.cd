import { defineConfig } from 'vitepress'

const siteUrl = 'https://thio.cc.cd'
const ogTitle = 'Flessan — M. Thio Saputra'
const ogDescription =
  'Developer, student, musician, and maker of small things that become larger systems. GDIPS founder, building from Banjarmasin, Indonesia.'
const ogImage = `${siteUrl}/images/flessan-banner.png`

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Flessan',
  titleTemplate: ':title — M. Thio Saputra',
  description: ogDescription,
  appearance: 'dark',
  lastUpdated: true,

  // README.md is repo documentation, not site content
  srcExclude: ['README.md'],

  cleanUrls: true,

  sitemap: {
    hostname: 'https://thio.cc.cd'
  },

  vite: {
    server: {
      // allow preview proxies (e.g. *.e2b.app) in dev
      allowedHosts: true
    }
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/images/flessan-icon-64.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/images/flessan-icon-180.png' }],
    ['meta', { name: 'theme-color', content: '#c8102e' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: ogTitle }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:description', content: ogDescription }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap'
      }
    ]
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/images/flessan-icon-64.png',

    nav: [
      { text: 'About', link: '/about' },
      { text: 'Projects', link: '/projects' },
      { text: 'GDIPS', link: '/gdips' },
      { text: 'Blog', link: '/blog' },
      {
        text: 'More',
        items: [
          { text: 'Now', link: '/now' },
          { text: 'Timeline', link: '/timeline' },
          { text: 'Ecosystem', link: '/ecosystem' },
          { text: 'Support', link: '/support' }
        ]
      }
    ],

    sidebar: [],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/flessan' },
      { icon: 'discord', link: 'https://discord.gg/6HEyQBcM6E' },
      { icon: 'instagram', link: 'https://www.instagram.com/flethio' },
      { icon: 'youtube', link: 'https://youtube.com/@flethio' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/flessan' }
    ],

    footer: {
      message: 'Dibangun dengan VitePress · site code under MIT',
      copyright: 'Copyright © 2025–2026 M. Thio Saputra (Flessan) · Banjarmasin, Indonesia'
    },

    docFooter: {
      prev: 'Sebelumnya',
      next: 'Selanjutnya'
    },

    outlineTitle: 'Di halaman ini',
    returnToTopLabel: 'Kembali ke atas',
    darkModeSwitchLabel: 'Tema',
    lightModeSwitchTitle: 'Ganti ke tema terang',
    darkModeSwitchTitle: 'Ganti ke tema gelap',

    lastUpdated: {
      text: 'Terakhir diperbarui'
    }
  }
})
