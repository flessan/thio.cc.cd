import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { defineConfig } from 'vitepress'
import { blogPosts } from './blog-posts'

const siteUrl = 'https://thio.cc.cd'
const ogDescription = `Flessan's projects, writing, and communities`
const ogImage = `${siteUrl}/images/flessan-banner.jpg`
const twitterHandle = '@thio2009_'

// Entity identifiers: every piece of JSON-LD on the site points back at these
// two nodes, so search engines resolve one person and one site instead of a
// dozen disconnected fragments.
const personId = `${siteUrl}/#person`
const websiteId = `${siteUrl}/#website`
const blogId = `${siteUrl}/blog#blog`

const siteKeywords = [
  'Flessan',
  'M. Thio Saputra',
  'thio.cc.cd',
  'web developer Banjarmasin',
  'automation engineer',
  'open source Indonesia',
  'Geometry Dash private server',
  'GDIPS',
  'Linux',
  'Cloudflare Workers'
]

const siteLang = 'en'
const geoMeta: [string, Record<string, string>][] = [
  ['meta', { name: 'geo.region', content: 'ID-KS' }],
  ['meta', { name: 'geo.placename', content: 'Banjarmasin' }],
  ['meta', { name: 'ICBM', content: '-3.3186, 114.5944' }]
]

const socialLinks = [
  'https://github.com/flessan',
  'https://www.instagram.com/flethio',
  'https://www.threads.com/flethio',
  'https://youtube.com/@flethio',
  'https://x.com/thio2009_',
  'https://www.linkedin.com/in/flessan',
  'https://id.wikipedia.org/wiki/Pengguna:Flessan'
]

// The shared catalogue keeps RSS metadata aligned with the blog directory and post navigation.
const posts = blogPosts.map((post) => ({
  title: post.title,
  date: post.date,
  desc: post.description,
  slug: post.slug
}))

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
  '@id': personId,
  name: 'M. Thio Saputra',
  givenName: 'Thio',
  familyName: 'Saputra',
  alternateName: ['Flessan', 'Flethio'],
  url: `${siteUrl}/about`,
  mainEntityOfPage: `${siteUrl}/about`,
  image: `${siteUrl}/images/flessan-full.png`,
  email: 'mailto:tio@cc.cc',
  jobTitle: 'Web developer and automation engineer',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Banjarmasin',
    addressRegion: 'South Kalimantan',
    addressCountry: 'ID'
  },
  sameAs: socialLinks,
  knowsAbout: ['Web development', 'Automation', 'Linux', 'Open source', 'Geometry Dash'],
  knowsLanguage: ['id', 'en']
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': websiteId,
  name: 'Flessan - thio.cc.cd',
  alternateName: 'thio.cc.cd',
  url: `${siteUrl}/`,
  description: ogDescription,
  inLanguage: siteLang,
  publisher: { '@id': personId },
  copyrightHolder: { '@id': personId }
}

const blogLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  '@id': blogId,
  name: "Flessan's blog",
  url: `${siteUrl}/blog`,
  description:
    'Personal developer notes by Flessan about software projects, Indonesian internet culture, Linux experiments, and lessons learned while building.',
  inLanguage: siteLang,
  author: { '@id': personId },
  publisher: { '@id': personId },
  isPartOf: { '@id': websiteId }
}

/** Pick the Open Graph MIME type from the file extension. */
function imageType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'svg') return 'image/svg+xml'
  return 'image/png'
}

/** Rough word count of a page, used for BlogPosting.wordCount / timeRequired. */
const wordCountCache = new Map<string, number>()
function wordCount(rel: string): number {
  const cached = wordCountCache.get(rel)
  if (cached !== undefined) return cached
  let count = 0
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')
    const body = raw.replace(/^---[\s\S]*?---/, '').replace(/<[^>]+>/g, ' ')
    count = body.split(/\s+/).filter((word) => /[a-zA-Z0-9]/.test(word)).length
  } catch {
    count = 0
  }
  wordCountCache.set(rel, count)
  return count
}

/** Last commit date for a source file - falls back to nothing on shallow clones. */
const gitDateCache = new Map<string, string | undefined>()
function gitDate(rel: string): string | undefined {
  if (gitDateCache.has(rel)) return gitDateCache.get(rel)
  let iso: string | undefined
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', rel], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    if (out && !isNaN(new Date(out).getTime())) iso = new Date(out).toISOString()
  } catch {
    iso = undefined
  }
  gitDateCache.set(rel, iso)
  return iso
}

/** Project entries for the /projects ItemList, parsed from the page itself. */
/** The first cover image a post actually renders - the largest paint on the page. */
const coverCache = new Map<string, string>()
function firstCover(rel: string): string | undefined {
  if (coverCache.has(rel)) return coverCache.get(rel)
  let src: string | undefined
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')
    src = raw.match(/<BlogCover\s+src="([^"]+)"/)?.[1]
    if (!src) {
      const cover = blogPosts.find((item) => rel === `blog/${item.slug}.md`)
      src = cover?.image
    }
  } catch {
    src = undefined
  }
  coverCache.set(rel, src)
  return src
}

const projectLinksCache = new Map<string, { name: string; url: string }[]>()
function projectLinks(rel: string): { name: string; url: string }[] {
  const cached = projectLinksCache.get(rel)
  if (cached) return cached
  const found: { name: string; url: string }[] = []
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')
    for (const match of raw.matchAll(/\*\*\[([^\]]+)\]\((https?:\/\/[^)]+)\)\*\*/g)) {
      found.push({ name: match[1].trim(), url: match[2].trim() })
    }
    for (const match of raw.matchAll(/<LinkPreview url="(https?:\/\/[^"]+)"[^>]*description="([^"]*)"/g)) {
      found.push({ name: match[2].split(' - ')[0].trim(), url: match[1].trim() })
    }
  } catch {
    /* ignore */
  }
  const unique = found.filter(
    (item, index) => found.findIndex((other) => other.url === item.url) === index
  )
  projectLinksCache.set(rel, unique)
  return unique
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

  markdown.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    const heading = line.match(/^##\s+(.+)$/)
    if (heading) {
      category = heading[1].trim()
      return
    }
    if (!line.startsWith('|') || !category) return

    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
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
function kerjaShortcutsPlugin() {
  const sourceFile = path.resolve(process.cwd(), 'data/kerja.md')
  const virtualModuleId = 'virtual:kerja-shortcuts'
  const resolvedVirtualModuleId = `\0${virtualModuleId}`

  return {
    name: 'kerja-shortcuts',
    enforce: 'pre',
    resolveId(id: string) {
      if (id === virtualModuleId) return resolvedVirtualModuleId
    },
    load(this: { addWatchFile: (file: string) => void }, id: string) {
      if (id !== resolvedVirtualModuleId) return
      this.addWatchFile(sourceFile)
      const shortcuts = parseKerjaShortcuts(fs.readFileSync(sourceFile, 'utf8'))
      return `export default ${JSON.stringify(shortcuts)};`
    },
    configureServer(server: any) {
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
  title: 'Flessan',
  lang: 'en',
  description: ogDescription,

  lastUpdated: true,

  // Cloudflare Pages: build output is .vitepress/dist (see package.json / README)
  cleanUrls: true,
  srcExclude: ['README.md', 'data/kerja.md'],
  sitemap: {
    hostname: siteUrl,
    // Every URL gets a real last-modified date (frontmatter date for posts, the
    // last commit that touched the file otherwise) plus a crawl hint, so search
    // engines spend their budget on the pages that change.
    transformItems(items) {
      const latestPost = posts.length
        ? new Date(`${posts[0].date}T00:00:00Z`).toISOString()
        : undefined

      return items.map((item) => {
        const relativePath = item.url.startsWith('http')
          ? item.url.replace(siteUrl, '')
          : item.url
        const pathname =
          '/' + decodeURIComponent(relativePath).replace(/^\/+/, '').replace(/\/+$/, '')
        const rel = pathname === '/' ? 'index.md' : `${pathname.slice(1)}.md`
        const post = posts.find((candidate) => `/blog/${candidate.slug}` === pathname)
        const lastmod =
          (post ? new Date(`${post.date}T00:00:00Z`).toISOString() : undefined) ??
          (pathname === '/' || pathname === '/blog' ? latestPost : undefined) ??
          gitDate(rel)
        const priority = pathname === '/' ? 1 : pathname === '/blog' ? 0.9 : post ? 0.8 : 0.7
        const changefreq = pathname === '/' ? 'weekly' : post ? 'monthly' : 'monthly'

        const cover = post ? blogPosts.find((candidate) => candidate.slug === post.slug) : undefined
        const image = cover
          ? cover.image.startsWith('http')
            ? cover.image
            : `${siteUrl}${cover.image}`
          : pathname === '/'
            ? ogImage
            : undefined

        return {
          url: item.url,
          lastmod,
          changefreq,
          priority,
          ...(image ? { img: [{ url: image, title: cover?.title ?? 'Flessan - thio.cc.cd' }] } : {})
        }
      })
    }
  },

  vite: {
    plugins: [kerjaShortcutsPlugin()],
    server: {
      // allow preview proxies (e.g. *.e2b.app) in dev
      allowedHosts: true,
      watch: {
        // `vitepress build` writes here; without this the dev server reloads
        // the whole site on every production build.
        ignored: ['**/.vitepress/dist/**', '**/.vitepress/cache/**']
      }
    }
  },

  // Per-page head: canonical + Open Graph + Twitter + JSON-LD (see above)
  transformPageData(pageData) {
    const rel = pageData.relativePath
    const isHome = rel === 'index.md'
    const isPost = /^blog\/.+\.md$/.test(rel) && rel !== 'blog.md'
    const isBlogIndex = rel === 'blog.md'
    const isAbout = rel === 'about.md'
    const isProjects = rel === 'projects.md'
    const postSlug = isPost ? rel.replace(/^blog\//, '').replace(/\.md$/, '') : ''
    const post = isPost ? blogPosts.find((item) => item.slug === postSlug) : undefined

    const canonical = isHome
      ? `${siteUrl}/`
      : `${siteUrl}/${rel.replace(/\.md$/, '').replace(/index\.md$/, '')}`

    const fmImage = pageData.frontmatter.image as string | undefined
    const isAbsoluteImage = fmImage?.startsWith('https://') || fmImage?.startsWith('http://')
    const image = fmImage
      ? (isAbsoluteImage ? fmImage : `${siteUrl}${fmImage}`)
      : ogImage
    const dims = image.includes('images.unsplash.com')
      ? { w: 1600, h: 840 }
      : image.includes('/covers/')
        ? coverDims
        : bannerDims

    const title = String(pageData.title || 'Flessan')
    const ogTitle = isHome
      ? 'Flessan - web developer & automation engineer'
      : isPost
        ? title
        : `${title} - Flessan`
    const desc =
      (pageData.description as string | undefined) || ogDescription
    const imageAlt = String(pageData.frontmatter.imageAlt || post?.imageAlt || ogTitle)
    const pageKeywords = pageData.frontmatter.keywords as string[] | undefined
    const contentLanguage = String(pageData.frontmatter.inLanguage || post?.language || siteLang)
    const ogLocale = contentLanguage === 'id' ? 'id_ID' : 'en_US'
    const topics = pageKeywords?.length ? pageKeywords : (post?.topics ?? [])

    // A page keeps its own keywords first, then tops up with the site's shared
    // vocabulary so no page ships a one-word keyword list.
    const keywords = Array.from(new Set([...topics, ...siteKeywords])).slice(0, 14)

    const published = isPost ? toIso(pageData.frontmatter.date) : undefined
    const modified = pageData.lastUpdated
      ? new Date(pageData.lastUpdated).toISOString()
      : published

  const head: any[] = [
      ['link', { rel: 'canonical', href: canonical }],
      ['link', { rel: 'alternate', hreflang: contentLanguage, href: canonical }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: canonical }],
      ['link', { rel: 'author', href: `${siteUrl}/about` }],
      ['meta', { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' }],
      ['meta', { name: 'googlebot', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' }],
      ['meta', { name: 'author', content: 'M. Thio Saputra' }],
      ['meta', { name: 'keywords', content: keywords.join(', ') }],
      ['meta', { name: 'language', content: contentLanguage }],
      ...geoMeta,

      ['meta', { property: 'og:type', content: isPost ? 'article' : 'website' }],
      ['meta', { property: 'og:title', content: ogTitle }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:site_name', content: 'Flessan' }],
      ['meta', { property: 'og:description', content: desc }],
      ['meta', { property: 'og:image', content: image }],
      ['meta', { property: 'og:image:url', content: image }],
      ['meta', { property: 'og:image:secure_url', content: image }],
      ['meta', { property: 'og:image:type', content: imageType(image) }],
      ['meta', { property: 'og:image:width', content: String(dims.w) }],
      ['meta', { property: 'og:image:height', content: String(dims.h) }],
      ['meta', { property: 'og:image:alt', content: imageAlt }],
      ['meta', { property: 'og:locale', content: ogLocale }],
      ['meta', { property: 'og:locale:alternate', content: ogLocale === 'en_US' ? 'id_ID' : 'en_US' }],

      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:site', content: twitterHandle }],
      ['meta', { name: 'twitter:creator', content: twitterHandle }],
      ['meta', { name: 'twitter:title', content: ogTitle }],
      ['meta', { name: 'twitter:description', content: desc }],
      ['meta', { name: 'twitter:image', content: image }],
      ['meta', { name: 'twitter:image:alt', content: imageAlt }],
      ['meta', { name: 'twitter:image:width', content: String(dims.w) }],
      ['meta', { name: 'twitter:image:height', content: String(dims.h) }]
    ]

    if (isHome) {
      // The hero photo is the LCP element - fetch it before the CSS arrives.
      head.push([
        'link',
        {
          rel: 'preload',
          as: 'image',
          href: '/images/flessan-banner.webp',
          type: 'image/webp',
          fetchpriority: 'high'
        }
      ])
    }

    if (isPost) {
      const cover = firstCover(rel)
      if (cover) {
        head.push([
          'link',
          {
            rel: 'preload',
            as: 'image',
            href: cover,
            ...(cover.startsWith('https://images.unsplash.com') ? { crossorigin: '' } : {}),
            fetchpriority: 'high'
          }
        ])
      }
    }

    if (isAbout) {
      head.push(
        ['meta', { property: 'profile:first_name', content: 'Thio' }],
        ['meta', { property: 'profile:last_name', content: 'Saputra' }],
        ['meta', { property: 'profile:username', content: 'flessan' }]
      )
    }

    if (isPost) {
      if (post) head.push(['meta', { property: 'article:section', content: post.category }])
      head.push(['meta', { property: 'article:author', content: `${siteUrl}/about` }])
      for (const topic of topics.slice(0, 8)) {
        head.push(['meta', { property: 'article:tag', content: String(topic) }])
      }
      head.push(
        ['meta', { name: 'twitter:label1', content: 'Written by' }],
        ['meta', { name: 'twitter:data1', content: 'M. Thio Saputra' }],
        ['meta', { name: 'twitter:label2', content: 'Reading time' }],
        [
          'meta',
          {
            name: 'twitter:data2',
            content: `${Math.max(1, Math.round(wordCount(rel) / 220))} min read`
          }
        ]
      )
      if (published) {
        head.push(['meta', { property: 'article:published_time', content: published }])
      }
      if (modified) {
        head.push(['meta', { property: 'article:modified_time', content: modified }])
      }
    }

    // ------------------------------------------------------------ JSON-LD
    const lds: object[] = []
    const webPageLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: ogTitle,
      description: desc,
      inLanguage: contentLanguage,
      isPartOf: { '@id': websiteId },
      about: { '@id': personId },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: image,
        width: dims.w,
        height: dims.h
      },
      ...(modified ? { dateModified: modified } : {})
    }

    if (isHome) {
      lds.push(
        websiteLd,
        {
          ...webPageLd,
          '@type': 'ProfilePage',
          mainEntity: { '@id': personId },
          significantLink: socialLinks
        },
        personLd
      )
    } else if (isAbout) {
      lds.push(
        {
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          '@id': `${canonical}#profilepage`,
          url: canonical,
          name: ogTitle,
          description: desc,
          inLanguage: contentLanguage,
          isPartOf: { '@id': websiteId },
          mainEntity: { '@id': personId },
          significantLink: socialLinks
        },
        personLd
      )
    } else if (isBlogIndex) {
      lds.push(blogLd, {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection`,
        name: title,
        description: desc,
        url: canonical,
        inLanguage: siteLang,
        isPartOf: { '@id': websiteId },
        mainEntity: {
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          numberOfItems: blogPosts.length,
          itemListElement: blogPosts.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${siteUrl}/blog/${item.slug}`,
            name: item.title
          }))
        }
      })
    } else if (isPost) {
      const words = wordCount(rel)
      const language = contentLanguage
      const readingMinutes = Math.max(1, Math.round(words / 220))
      const tagList = topics.map((name) => ({ '@type': 'Thing', name: String(name) }))

      lds.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        url: canonical,
        headline: title,
        name: title,
        description: desc,
        image: [{
          '@type': 'ImageObject',
          url: image,
          width: dims.w,
          height: dims.h,
          caption: imageAlt
        }],
        datePublished: published,
        dateModified: modified,
        inLanguage: language,
        articleSection: post?.category,
        keywords: keywords.join(', '),
        about: tagList,
        mentions: tagList,
        wordCount: words,
        timeRequired: `PT${readingMinutes}M`,
        isAccessibleForFree: true,
        copyrightHolder: { '@id': personId },
        copyrightYear: published ? new Date(published).getUTCFullYear() : undefined,
        license: 'https://opensource.org/licenses/MIT',
        author: { '@id': personId },
        publisher: { '@id': personId },
        isPartOf: { '@id': blogId },
        mainEntityOfPage: { '@id': `${canonical}#webpage` },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.vp-doc > p']
        }
      })
      lds.push(webPageLd)
      lds.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
          { '@type': 'ListItem', position: 3, name: title, item: canonical }
        ]
      })
    } else {
      const pageJson: object[] = [webPageLd]

      if (rel === 'kerja.md') {
        pageJson.push({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          '@id': `${canonical}#app`,
          name: 'Kerja',
          url: canonical,
          applicationCategory: 'UtilitiesApplication',
          applicationSubCategory: 'Web search and shortcut workspace',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript',
          inLanguage: siteLang,
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          author: { '@id': personId },
          publisher: { '@id': personId }
        })
      }

      if (rel === 'gdips.md') {
        pageJson.push({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': `${siteUrl}/gdips#organization`,
          name: 'GDIPS',
          alternateName: 'Geometry Dash Indonesia Private Server',
          url: `${siteUrl}/gdips`,
          description:
            'Open-source, community-driven Geometry Dash private server built and run by Indonesian players.',
          sameAs: ['https://github.com/flessan/GDIPS', 'https://discord.gg/BT8muKw3pX']
        })
      }

      if (isProjects) {
        const projects = projectLinks(rel).slice(0, 40)
        if (projects.length) {
          pageJson.push({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${canonical}#collection`,
            url: canonical,
            name: ogTitle,
            description: desc,
            inLanguage: contentLanguage,
            isPartOf: { '@id': websiteId },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: projects.length,
              itemListElement: projects.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'SoftwareSourceCode',
                  name: item.name,
                  codeRepository: item.url,
                  author: { '@id': personId }
                }
              }))
            }
          })
        }
      }

      pageJson.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: sectionNames[rel.replace(/\.md$/, '')] ?? title,
            item: canonical
          }
        ]
      })

      lds.push(...pageJson)
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
    const shortcutDataPath = path.join(outDir, 'kerja-shortcuts.json')
    fs.writeFileSync(
      shortcutDataPath,
      JSON.stringify(shortcutData, null, 2) + '\n',
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
        const source = blogPosts.find((item) => item.slug === p.slug)
        const topicTags = (source?.topics ?? [])
          .map((topic: string) => `\n      <category>${escapeXml(topic)}</category>`)
          .join('')

        return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(p.desc)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>tio@cc.cc (M. Thio Saputra)</author>
      <dc:creator>M. Thio Saputra</dc:creator>
      <category>Blog</category>${topicTags}
    </item>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(ogDescription)}</description>
    <language>en</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    <generator>VitePress</generator>
    <managingEditor>tio@cc.cc (M. Thio Saputra)</managingEditor>
    <webMaster>tio@cc.cc (M. Thio Saputra)</webMaster>
    <copyright>Copyright (c) M. Thio Saputra</copyright>
    <ttl>720</ttl>
    <category>Technology</category>
    <category>Software development</category>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <atom:link href="${siteUrl}/" rel="alternate" type="text/html" />
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

    // JSON Feed 1.1 next to the RSS one - picked up by readers that prefer it.
    const jsonFeed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: feedTitle,
      home_page_url: `${siteUrl}/blog`,
      feed_url: `${siteUrl}/feed.json`,
      description: ogDescription,
      language: 'en',
      icon: `${siteUrl}/images/icon-512.png`,
      favicon: `${siteUrl}/images/flessan-icon.png`,
      authors: [{ name: 'M. Thio Saputra', url: `${siteUrl}/about` }],
      items: blogPosts.map((p) => ({
        id: `${siteUrl}/blog/${p.slug}`,
        url: `${siteUrl}/blog/${p.slug}`,
        title: p.title,
        content_text: p.description,
        summary: p.description,
        image: p.image.startsWith('http') ? p.image : `${siteUrl}${p.image}`,
        date_published: new Date(`${p.date}T00:00:00Z`).toISOString(),
        language: p.language ?? 'en',
        authors: [{ name: 'M. Thio Saputra', url: `${siteUrl}/about` }],
        tags: p.topics
      }))
    }
    fs.writeFileSync(`${outDir}/feed.json`, JSON.stringify(jsonFeed, null, 2) + '\n', 'utf8')

    // Posts written in Indonesian get lang="id" so the static HTML matches the
    // language declared in the JSON-LD and the feed.
    for (const post of blogPosts) {
      if (post.language !== 'id') continue
      const file = path.join(outDir, 'blog', `${post.slug}.html`)
      if (!fs.existsSync(file)) continue
      const html = fs.readFileSync(file, 'utf8')
      const next = html.replace(/<html lang="[^"]*"/, '<html lang="id"')
      if (next !== html) fs.writeFileSync(file, next, 'utf8')
    }

    // The themed 404 page is generated by VitePress, so mark it unindexable here.
    const notFoundPath = path.join(outDir, '404.html')
    if (fs.existsSync(notFoundPath)) {
      const html = fs.readFileSync(notFoundPath, 'utf8')
      if (!html.includes('name="robots"')) {
        fs.writeFileSync(
          notFoundPath,
          html.replace(
            '</head>',
            '<meta name="robots" content="noindex,follow"><link rel="canonical" href="' +
              siteUrl +
              '/404"><\/head>'
          ),
          'utf8'
        )
      }
    }
  },

  head: [
    ['link', { rel: 'preconnect', href: 'https://images.unsplash.com', crossorigin: '' }],
    ['link', { rel: 'dns-prefetch', href: 'https://images.unsplash.com' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/images/flessan-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/images/flessan-icon-64.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/images/flessan-icon-180.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: "Flessan's blog", href: '/feed.xml' }],
    ['link', { rel: 'alternate', type: 'application/feed+json', title: "Flessan's blog (JSON Feed)", href: '/feed.json' }],
    ['link', { rel: 'sitemap', type: 'application/xml', href: '/sitemap.xml' }],
    ['link', { rel: 'me', href: 'https://github.com/flessan' }],
    ['link', { rel: 'me', href: 'https://x.com/thio2009_' }],
    ['link', { rel: 'me', href: 'https://www.instagram.com/flethio' }],
    ['link', { rel: 'me', href: 'https://id.wikipedia.org/wiki/Pengguna:Flessan' }],
    ['meta', { name: 'theme-color', content: '#fdf7ff' }],
    ['meta', { name: 'theme-color', content: '#141218', media: '(prefers-color-scheme: dark)' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    ['meta', { name: 'application-name', content: 'Flessan' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'Flessan' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'format-detection', content: 'telephone=no' }],
    ['meta', { name: 'referrer', content: 'strict-origin-when-cross-origin' }],
    // Apply the visitor's playground choices before first paint (no flash).
    ['script', {}, `(function(){try{var s=JSON.parse(localStorage.getItem('flessan-playground-v1')||'{}');var d=document.documentElement;d.dataset.accent=s.accent||'violet';d.dataset.paper=s.paper||'paper';d.dataset.corners=s.corners||'soft';d.dataset.motion=s.motion||'playful';d.dataset.density=s.density||'cozy'}catch(e){}})();`]
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
