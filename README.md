# thio.cc.cd — Flessan (M. Thio Saputra)

Welcome! This is the repository for the personal website of
**Flessan (M. Thio Saputra)** at [thio.cc.cd](https://thio.cc.cd).

The site covers his work and world: [GDIPS](https://gdips.pages.dev) (the
open-source, community-driven Geometry Dash Indonesia Private Server), the
project rack, the "internet of Thio" ecosystem, writing, a `/now` page, a
timeline, and ways to connect and support the work.

## Stack

- [VitePress](https://vitepress.dev) + Vue 3
- Custom theme on top of the VitePress default theme
  (Plus Jakarta Sans · JetBrains Mono · Flessan red / charcoal / TAKO blue)

## Getting the project running

```
pnpm install
pnpm run dev
```

Then open the local URL printed in the terminal.

To build for production:

```
pnpm run build
```

## Structure

```
.vitepress/          site config + custom theme (components, styles, data)
blog/                blog posts
index.md             home
about.md             the longer biography
projects.md          the project rack
gdips.md             GDIPS spotlight
blog.md              blog index
now.md               /now page
timeline.md          the road so far
ecosystem.md         the internet of Thio
support.md           sponsor & support
public/images/       assets (avatar & character art by Flessan)
```

## Licenses & credits

- Site code is released under the MIT License.
- Written content and images are © 2025–2026 M. Thio Saputra, all rights
  reserved, unless stated otherwise in context.
- The initial VitePress setup was derived from
  [patak.cat](https://github.com/patak-cat/patak.cat) by Matias Capeletto
  (MIT) — thank you for the inspiration and the template.
