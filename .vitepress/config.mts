import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitepress'

const siteUrl = 'https://thio.cc.cd'
const ogDescription = `Flessan's projects, writing, and communities`
const ogImage = `${siteUrl}/images/flessan-banner.png`

// Blog posts, newest first - also used to generate /feed.xml at build time
const posts = [
  { title: 'Kontekstual: code in the language we speak', date: '2026-10-18', desc: 'Designing a beginner-friendly programming language that reads naturally in Indonesian', slug: 'kontekstual-language' },
  { title: 'Telegraph Cloud: files, APIs, and a Telegram-backed backend', date: '2026-10-18', desc: 'Building a Cloudflare-native storage service that turns Telegram-backed files into a practical API for other projects', slug: 'telegraph-cloud' },
  { title: 'Admin Panel Everywhere: from endpoints to a workspace', date: '2026-10-18', desc: 'Designing a self-hostable admin workspace for APIs, CRUD operations, OpenAPI, and structured data', slug: 'admin-panel-everywhere' },
  { title: 'ANTO-LTG: a toolkit for the Windows repair bench', date: '2026-10-18', desc: 'Planning a practical Windows technician toolkit for drivers, software setup, and repeatable repair workflows', slug: 'anto-ltg-toolkit' },
  { title: 'hello, internet', date: '2026-09-08', desc: 'A new home at thio.cc.cd - who I am, and what this site will hold', slug: 'hello-internet' },
  { title: 'the command line is your d3sktop', date: '2026-09-04', desc: 'Building slate-de - a CLI-based, pane-oriented Wayland desktop environment in Rust', slug: 'slate-de' },
  { title: 'teksreceh: a museum of +62 typing', date: '2026-09-01', desc: 'Alay, UwU, Rimsvek, Binary - preserving how the Indonesian internet types', slug: 'teksreceh' },
  { title: 'GDIPS: a digital campfire', date: '2026-08-28', desc: 'How a free-server list grew into a community-driven Geometry Dash private server', slug: 'gdips-reborn' },
  { title: 'Many small sites', date: '2026-08-24', desc: 'Why I keep lots of little websites instead of one big one', slug: 'internet-of-thio' }
]

// ---------------------------------------------------------------------------
// SEO: everything below generates per-page <head> tags from frontmatter
// (title / description / image), so every page gets canonical URLs, full
// Open Graph + Twitter cards, article metadata on blog posts, and JSON-LD
// structured data - without duplicating tags in every markdown file.
// ---------------------------------------------------------------------------

const bannerDims = { w: 1200, h: 628 }
const coverDims = { w: 1200, h: 630 }

const personLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'M. Thio Saputra',
  alternateName: ['Flessan', 'Flethio'],
  url: siteUrl,
  email: 'mailto:tio@cc.cc',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Banjarmasin',
    addressCountry: 'ID'
  },
  sameAs: [
    'https://github.com/flessan',
    'https://www.instagram.com/flethio',
    'https://www.threads.com/flethio',
    'https://youtube.com/@flethio',
    'https://www.linkedin.com/in/flessan',
    'https://id.wikipedia.org/wiki/Pengguna:Flessan'
  ],
  knowsAbout: ['Web development', 'Automation', 'Linux', 'Open source']
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Flessan - thio.cc.cd',
  url: `${siteUrl}/`,
  description: ogDescription
}

const sectionNames: Record<string, string> = {
  news: 'News',
  blog: 'Blog',
  projects: 'Projects',
  now: 'Now',
  about: 'About',
  gdips: 'GDIPS',
  timeline: 'Timeline',
  ecosystem: 'Ecosystem',
  support: 'Support'
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Frontmatter dates arrive as YAML Date objects or strings - normalize. */
function toIso(d: unknown): string | undefined {
  if (!d) return undefined
  if (d instanceof Date) return isNaN(d.getTime()) ? undefined : d.toISOString()
  const s = String(d)
  const dt = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s)
  return isNaN(dt.getTime()) ? undefined : dt.toISOString()
}


type KerjaShortcut = {
  name: string
  url: string
  icon: string
  category: string
}

/** Parse the editable Markdown table into safe, build-time shortcut data. */
function parseKerjaShortcuts(markdown: string): KerjaShortcut[] {
  let category = ''
  const shortcuts: KerjaShortcut[] = []

  markdown.split(/\\r?\\n/).forEach((raw, index) => {
    const line = raw.trim()
    const heading = line.match(/^##\\s+(.+)$/)
    if (heading) {
      category = heading[1].trim()
      return
    }
    if (!line.startsWith('|') || !category) return

    const cells = line.replace(/^\\|/, '').replace(/\\|$/, '').split('|').map((cell) => cell.trim())
    if (cells.length < 3 || cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return
    if (cells[0].toLowerCase() === 'name') return

    const [name, url, icon] = cells
    if (!name || !url || !icon) {
      throw new Error(`Invalid shortcut row in data/kerja.md at line ${index + 1}. Expected Name | Link | Icon.`)
    }

    for (const [kind, value] of [['link', url], ['icon', icon]] as const) {
      let parsed: URL
      try {
        parsed = new URL(value)
      } catch {
        throw new Error(`Invalid ${kind} URL in data/kerja.md at line ${index + 1}: ${value}`)
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error(`Only HTTP(S) ${kind} URLs are allowed in data/kerja.md at line ${index + 1}.`)
      }
    }

    shortcuts.push({ name, url, icon, category })
  })

  if (!shortcuts.length) throw new Error('No shortcut rows found in data/kerja.md.')
  return shortcuts
}

/** Lets the Vue page render the Markdown data at build time without a runtime API. */
function kerjaShortcutsPlugin(): Plugin {
  const sourceFile = path.resolve(process.cwd(), 'data/kerja.md')
  const virtualModuleId = 'virtual:kerja-shortcuts'
  const resolvedVirtualModuleId = `\\0${virtualModuleId}`

  return {
    name: 'kerja-shortcuts',
    enforce: 'pre',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return
      this.addWatchFile(sourceFile)
      const shortcuts = parseKerjaShortcuts(fs.readFileSync(sourceFile, 'utf8'))
      return `export default ${JSON.stringify(shortcuts)};`
    },
    configureServer(server) {
      server.watcher.add(sourceFile)
      server.watcher.on('change', (changedFile) => {
        if (path.resolve(changedFile) !== sourceFile) return
        const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      })
    }
  }
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'flessan',
  description: ogDescription,

  lastUpdated: true,

  // Cloudflare Pages: build output is .vitepress/dist (see package.json / README)
  cleanUrls: true,
  srcExclude: ['README.md', 'data/kerja.md'],
  sitemap: {
    hostname: siteUrl
  },

  vite: {
    plugins: [kerjaShortcutsPlugin()],
    server: {
      // allow preview proxies (e.g. *.e2b.app) in dev
      allowedHosts: true
    }
  },

  // Per-page head: canonical + Open Graph + Twitter + JSON-LD (see above)
  transformPageData(pageData) {
    const rel = pageData.relativePath
    const isHome = rel === 'index.md'
    const isPost = /^blog\/.+\.md$/.test(rel) && rel !== 'blog.md'

    const canonical = isHome
      ? `${siteUrl}/`
      : `${siteUrl}/${rel.replace(/\.md$/, '').replace(/index\.md$/, '')}`

    const fmImage = pageData.frontmatter.image as string | undefined
    const isAbsoluteImage = fmImage?.startsWith('https://') || fmImage?.startsWith('http://')
    const image = fmImage
      ? (isAbsoluteImage ? fmImage : `${siteUrl}${fmImage}`)
      : ogImage
    const dims = image.includes('/covers/') ? coverDims : bannerDims

    const title = String(pageData.title || 'Flessan')
    const ogTitle = isHome
      ? "Flessan's home"
      : isPost
        ? title
        : `${title} - Flessan`
    const desc =
      (pageData.description as string | undefined) || ogDescription

    const head: any[] = [
      ['link', { rel: 'canonical', href: canonical }],

      ['meta', { property: 'og:type', content: isPost ? 'article' : 'website' }],
      ['meta', { property: 'og:title', content: ogTitle }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:site_name', content: 'Flessan' }],
      ['meta', { property: 'og:description', content: desc }],
      ['meta', { property: 'og:image', content: image }],
      ['meta', { property: 'og:image:width', content: String(dims.w) }],
      ['meta', { property: 'og:image:height', content: String(dims.h) }],
      ['meta', { property: 'og:image:alt', content: ogTitle }],
      ['meta', { property: 'og:locale', content: 'en_US' }],

      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: ogTitle }],
      ['meta', { name: 'twitter:description', content: desc }],
      ['meta', { name: 'twitter:image', content: image }]
    ]

    if (isPost) {
      const published = toIso(pageData.frontmatter.date)
      const modified = pageData.lastUpdated
        ? new Date(pageData.lastUpdated).toISOString()
        : undefined
      if (published) {
        head.push([
          'meta',
          { property: 'article:published_time', content: published }
        ])
      }
      if (modified) {
        head.push(['meta', { property: 'article:modified_time', content: modified }])
      }
    }

    // JSON-LD structured data
    const lds: object[] = []
    if (isHome) {
      lds.push(websiteLd, personLd)
    } else if (isPost) {
      const published = toIso(pageData.frontmatter.date)
      lds.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description: desc,
        image: [image],
        datePublished: published,
        dateModified: pageData.lastUpdated
          ? new Date(pageData.lastUpdated).toISOString()
          : undefined,
        author: {
          '@type': 'Person',
          name: 'M. Thio Saputra',
          url: `${siteUrl}/about`
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
      })
    } else {
      lds.push(
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: ogTitle,
          description: desc,
          url: canonical,
          isPartOf: { '@type': 'WebSite', name: 'Flessan - thio.cc.cd', url: `${siteUrl}/` }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: sectionNames[rel.replace(/\.md$/, '')] ?? title,
              item: canonical
            }
          ]
        }
      )
    }
    for (const ld of lds) {
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify(ld)])
    }

    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(...head)
  },

  // Generate /feed.xml (RSS 2.0) into the build output - works on any static host
  buildEnd({ outDir }) {
    const shortcutData = parseKerjaShortcuts(
      fs.readFileSync(path.resolve(process.cwd(), 'data/kerja.md'), 'utf8')
    )
    const shortcutDir = path.join(outDir, 'kerja')
    fs.mkdirSync(shortcutDir, { recursive: true })
    fs.writeFileSync(
      path.join(shortcutDir, 'shortcuts.json'),
      JSON.stringify(shortcutData, null, 2) + '\\n',
      'utf8'
    )

    const feedUrl = `${siteUrl}/feed.xml`
    const feedTitle = "Flessan's blog"
    const latestDate = posts.length
      ? new Date(`${posts[0].date}T00:00:00Z`).toUTCString()
      : new Date(0).toUTCString()

    const items = posts
      .map((p) => {
        const postUrl = `${siteUrl}/blog/${p.slug}`
        const pubDate = new Date(`${p.date}T00:00:00Z`).toUTCString()

        return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(p.desc)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>tio@cc.cc (M. Thio Saputra)</author>
      <category>Blog</category>
    </item>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(ogDescription)}</description>
    <language>en</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <image>
      <url>${siteUrl}/images/flessan-icon-180.png</url>
      <title>${escapeXml(feedTitle)}</title>
      <link>${siteUrl}</link>
    </image>
${items}
  </channel>
</rss>
`
    fs.writeFileSync(`${outDir}/feed.xml`, xml, 'utf8')
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/images/flessan-icon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/images/flessan-icon-180.png' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: "Flessan's blog", href: '/feed.xml' }],
    ['meta', { name: 'theme-color', content: '#7eaf90' }],
    ['meta', { name: 'theme-color', content: '#1b1b1f', media: '(prefers-color-scheme: dark)' }]
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    // Instant full-text search over every page (static, build-time index).
    // Open it with the navbar button, or Ctrl K / Cmd K / "/" anywhere.
    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Support', link: '/support' },
      { text: 'Blog', link: '/blog' },
      { text: 'Projects', link: '/projects' },
      { text: 'Now', link: '/now' },
      {
        text: 'More', items: [
          { text: 'About', link: '/about' },
          { text: 'GDIPS', link: '/gdips' },
          { text: 'Timeline', link: '/timeline' },
          { text: 'Ecosystem', link: '/ecosystem' },
        ]
      }
    ],

    sidebar: [],

    outline: { level: [2, 3] },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/flessan' },
      { icon: 'discord', link: 'https://discord.gg/BT8muKw3pX' },
      { icon: 'instagram', link: 'https://www.instagram.com/flethio' },
      { icon: 'youtube', link: 'https://youtube.com/@flethio' },
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>'
        },
        link: 'https://t.me/chfless',
        ariaLabel: 'Telegram channel'
      },
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
})
