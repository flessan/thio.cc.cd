import { defineConfig } from 'vitepress'

const ogDescription = `Flessan's projects, writing, and communities`
const ogImage = 'https://thio.cc.cd/images/flessan-banner.png'
const ogTitle = `Flessan's home`
const ogUrl = 'https://thio.cc.cd'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'flessan',
  description: "flessan's home",

  // Cloudflare Pages: build output is .vitepress/dist (see package.json / README)
  cleanUrls: true,
  srcExclude: ['README.md'],
  sitemap: {
    hostname: 'https://thio.cc.cd'
  },

  vite: {
    server: {
      // allow preview proxies (e.g. *.e2b.app) in dev
      allowedHosts: true
    }
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Blog', link: '/blog' },
      {
        text: 'More', items: [
          { text: 'About', link: '/about' },
          { text: 'Projects', link: '/projects' },
          { text: 'GDIPS', link: '/gdips' },
          { text: 'Now', link: '/now' },
          { text: 'Timeline', link: '/timeline' },
          { text: 'Ecosystem', link: '/ecosystem' },
          { text: 'Support', link: '/support' },
        ]
      }
    ],

    sidebar: [],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/flessan' },
      { icon: 'discord', link: 'https://discord.gg/6HEyQBcM6E' },
      { icon: 'instagram', link: 'https://www.instagram.com/flethio' },
      { icon: 'youtube', link: 'https://youtube.com/@flethio' },
    ],

    footer: {
      message: `Released under the MIT License`,
      copyright: 'Copyright © 2025-present M. Thio Saputra',
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/images/flessan-icon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: ogTitle }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:url', content: ogUrl }],
    ['meta', { property: 'og:description', content: ogDescription }],
    ['meta', { name: 'theme-color', content: '#7eaf90' }],
  ],
})
