import fs from 'node:fs'
import { defineConfig } from 'vitepress'

const siteUrl = 'https://thio.cc.cd'
const ogDescription = `Flessan's projects, writing, and communities`
const ogImage = `${siteUrl}/images/flessan-banner.png`
const ogTitle = `Flessan's home`

// Blog posts, newest first — also used to generate /feed.xml at build time
const posts = [
  { title: 'hello, internet', date: '2026-09-08', desc: 'A new home at thio.cc.cd — who I am, and what this site will hold', slug: 'hello-internet' },
  { title: 'the command line is your d3sktop', date: '2026-09-04', desc: 'Building slate-de — a CLI-based, pane-oriented Wayland desktop environment in Rust', slug: 'slate-de' },
  { title: 'teksreceh: a museum of +62 typing', date: '2026-09-01', desc: 'Alay, UwU, Rimsvek, Binary — preserving how the Indonesian internet types', slug: 'teksreceh' },
  { title: 'GDIPS: a digital campfire', date: '2026-08-28', desc: 'How a free-server list grew into a community-driven Geometry Dash private server', slug: 'gdips-reborn' },
  { title: 'Many small sites', date: '2026-08-24', desc: 'Why I keep lots of little websites instead of one big one', slug: 'internet-of-thio' }
]

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'flessan',
  description: "flessan's home",

  lastUpdated: true,

  // Cloudflare Pages: build output is .vitepress/dist (see package.json / README)
  cleanUrls: true,
  srcExclude: ['README.md'],
  sitemap: {
    hostname: siteUrl
  },

  vite: {
    server: {
      // allow preview proxies (e.g. *.e2b.app) in dev
      allowedHosts: true
    }
  },

  // Canonical URL on every page (correct SEO, prevents duplicate-content issues)
  transformPageData(pageData) {
    const canonical =
      pageData.relativePath === 'index.md'
        ? `${siteUrl}/`
        : `${siteUrl}/${pageData.relativePath.replace(/\.md$/, '')}`
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(['link', { rel: 'canonical', href: canonical }])
  },

  // Generate /feed.xml (RSS 2.0) into the build output — works on any static host
  buildEnd({ outDir }) {
    const items = posts
      .map(
        (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${siteUrl}/blog/${p.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${p.slug}</guid>
      <description>${escapeXml(p.desc)}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    </item>`
      )
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml("Flessan's blog")}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(ogDescription)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`
    fs.writeFileSync(`${outDir}/feed.xml`, xml)
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    // Instant full-text search over every page (static, build-time index).
    // Open it with the navbar button, or Ctrl K / Cmd K / "/" anywhere.
    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Blog', link: '/blog' },
      { text: 'Projects', link: '/projects' },
      { text: 'Now', link: '/now' },
      {
        text: 'More', items: [
          { text: 'About', link: '/about' },
          { text: 'GDIPS', link: '/gdips' },
          { text: 'Timeline', link: '/timeline' },
          { text: 'Ecosystem', link: '/ecosystem' },
          { text: 'Support', link: '/support' },
        ]
      }
    ],

    sidebar: [],

    outline: { level: [2, 3] },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/flessan' },
      { icon: 'discord', link: 'https://discord.gg/6HEyQBcM6E' },
      { icon: 'instagram', link: 'https://www.instagram.com/flethio' },
      { icon: 'youtube', link: 'https://youtube.com/@flethio' },
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>'
        },
        link: '/feed.xml',
        ariaLabel: 'RSS feed'
      }
    ],

    editLink: {
      pattern: 'https://github.com/flessan/thio.cc.cd/edit/main/:path',
      text: 'Suggest changes on GitHub'
    },

    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },

    footer: {
      message: `Released under the MIT License`,
      copyright: 'Copyright © 2025-present M. Thio Saputra',
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/images/flessan-icon.png' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: "Flessan's blog", href: '/feed.xml' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: ogTitle }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:description', content: ogDescription }],
    ['meta', { name: 'theme-color', content: '#7eaf90' }],
  ],
})
