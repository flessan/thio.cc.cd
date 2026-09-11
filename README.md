# thio.cc.cd

Welcome! This is the repository for my website at https://thio.cc.cd

I'm **Flessan (M. Thio Saputra)** - a self-taught web developer & automation
engineer from Banjarmasin, Indonesia, and a student in the RPL program at
SMKN 4 Banjarmasin. This site covers my work and world:
[GDIPS](https://gdips.pages.dev) (the open-source, community-driven Geometry
Dash Indonesia Private Server), my projects, writing, a `/now` page, a
timeline, and ways to connect and support the work.

**Deployed on Cloudflare Pages.**

Blog posts are licensed under MIT. The character artwork in the public folder
is by me.

To get the project running

```
pnpm install
pnpm run dev
```

## Stack

- [VitePress](https://vitepress.dev) + Vue 3 - static build, no server runtime needed
- The standard, simple VitePress theme - the same look this site has had since
  the beginning (no custom design framework)
- Cloudflare Pages serving: static assets, pretty URLs, `_redirects`, `_headers`

## What works out of the box

- **Full-text search** across every page - click the search field or press
  `Ctrl K` / `⌘K` (or `/`) anywhere. The index is built at compile time, so
  search works on plain static hosting.
- **Live project explorer** on `/projects` - real data from the public GitHub
  API (description, language, stars, license, last update), with filter,
  language, and sort controls; cached in your browser for 10 minutes and
  gracefully falling back to the curated list when the API is unreachable.
- **News from Telegram** - a `/news` page plus a latest-post card on the home
  page and `/now`, reading the [@chfless](https://t.me/chfless) channel live
  through [chfless-api.pages.dev](https://chfless-api.pages.dev)
  (`latest.json` / `posts.json`, Flessan's own telegram_to_api bridge).
  Photo/video posts are rendered as **official Telegram post embeds**
  (`telegram-widget.js`, iframe of `t.me/chfless/<id>?embed=1`) so the images
  actually appear - no bot token needed; the embed follows the site's
  light/dark toggle. Text posts render natively with safely linkified URLs,
  and everything degrades to text + channel links if Telegram or the API is
  unreachable.
- **Self-embedding link previews** - every external link posted in the
  channel (and every card on `/ecosystem`) unfolds into a rich preview:
  site name, title, description, and photo, pulled live from the target
  page. Metadata is fetched by the site's own `/api/og` Cloudflare Pages
  Function (see `functions/api/og.ts`), edge-cached for a day, with a
  browser-side fallback (microlink.io) when the Function can't reach a URL -
  and a plain link if even that fails. The `<LinkPreview>` component is
  registered globally, so it can be dropped into any page.
- **Photos everywhere, at a fraction of the weight** - every cover, banner,
  and artwork ships as WebP (visible images went from 5.6 MB to ~213 KB,
  96% smaller), with `width`/`height` set so the layout never jumps while
  images load. Blog covers used to be hidden entirely on phones and
  tablets - now they stack neatly above the text. Click any content image
  to view it full-size in a lightbox (Esc or click to close).
- **Live activity feed** on the home page and `/now` - recent public GitHub
  events, fetched live and cached for 5 minutes.
- **RSS feed** at `/feed.xml`, generated at build time and linked from the
  navbar.
- **"Suggest changes on GitHub"** link on every page.
- **Reading time, dates, and older/newer navigation** on every blog post.
- **One-click copy buttons** for the contact email, the Discord invite, and
  the feed URL.
- **A useful 404 page** - trigger a search, go home, or jump to the main
  sections.
- **SEO done properly, generated from one place** - every page gets a
  canonical URL, full Open Graph tags (`og:title`/`url`/`description`/
  `image` + dimensions, `og:site_name`, `og:locale`), `summary_large_image`
  Twitter cards, `article:published_time`/`modified_time` on blog posts, a
  sitemap with `lastmod` for all pages, `robots.txt`, and JSON-LD
  structured data: `WebSite` + `Person` on the home page, `BlogPosting`
  for every post, `WebPage` + `BreadcrumbList` elsewhere. Pages just set
  `title` / `description` / `image` in their frontmatter - the config does
  the rest, with no duplicated tags.
- No tracking, no external services beyond the public GitHub API, the
  Telegram channel API, and a metadata fallback. One tiny Cloudflare Pages
  Function (`/api/og`) does the rest. Zero additional npm dependencies.

## Requirements

- Node.js **22** (pinned in `.nvmrc`; Cloudflare Pages picks this up automatically)
- pnpm **10** (pinned via `packageManager` in `package.json`)

## Build & deploy

```
pnpm run build            # outputs the static site to .vitepress/dist
pnpm run preview:pages    # preview with wrangler (real Pages semantics)
pnpm run deploy           # build + wrangler pages deploy
```

### Cloudflare Pages (Git integration)

1. **Workers & Pages → Create → Pages → Connect to Git**, select this repo.
2. Build command: `pnpm run build` · Build output directory: `.vitepress/dist`
3. Node and pnpm versions come from `.nvmrc` and `packageManager`. Every push
   to the production branch deploys automatically; other branches get preview
   deployments.

### Cloudflare Pages (Wrangler CLI)

```
npx wrangler login
npx wrangler pages project create thio-cc-cd --production-branch=main
pnpm run deploy
```

### Custom domain

In the Pages project: **Settings → Custom domains → Set up a custom domain**,
add `thio.cc.cd` as a CNAME to `<project>.pages.dev`.

## Cloudflare Pages configuration files

| File | Purpose |
| --- | --- |
| `public/_redirects` | Shortlinks (`/gh` → GitHub, `/sponsor`, `/discord`, `/gdps`, `/yt`, `/wa`, …) |
| `public/_headers` | `Cache-Control: immutable` for hashed `/assets/*`, caching for `/images/*`, security headers |
| `functions/api/og.ts` | Pages Function: `GET /api/og?url=…` returns a page's Open Graph metadata (title, description, image) as JSON, powering the link preview cards |
| `.nvmrc` | Pins Node 22 for the Pages build environment |
| `404.html` | Generated by VitePress; Pages serves it automatically |

## Structure

```
.vitepress/          site config + theme (components, styles)
functions/           Cloudflare Pages Functions (/api/og link metadata)
blog/                blog posts
news.md              news page (live Telegram channel feed)
index.md             home (with the latest Telegram post)
about.md             about me
projects.md          project list + live GitHub explorer
gdips.md             GDIPS spotlight
blog.md              blog index
now.md               /now page + channel feed + live activity
timeline.md          the road so far
ecosystem.md         the other places I keep online
support.md           sponsor & support
public/images/       artwork (avatar & character art by Flessan)
```

## Credits

- The initial VitePress setup was derived from
  [patak.cat](https://github.com/patak-cat/patak.cat) by Matias Capeletto
  (MIT) - thank you for the inspiration and the template.
