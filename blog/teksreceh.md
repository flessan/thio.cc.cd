---
title: "teksreceh: a museum of +62 typing"
author:
  name: M. Thio Saputra
date: 2026-09-01
head:
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:title
      content: "teksreceh: a museum of +62 typing"
  - - meta
    - property: og:image
      content: https://thio.cc.cd/images/covers/teksreceh.png
  - - meta
    - property: og:url
      content: https://thio.cc.cd/blog/teksreceh
  - - meta
    - property: og:description
      content: Alay, UwU, Rimsvek, Binary — preserving how the Indonesian internet types
  - - meta
    - name: twitter:card
      content: summary_large_image
---

<BlogCover src="/images/covers/teksreceh.png" />

# teksreceh: a museum of +62 typing

<PostMeta date="2026-09-01"></PostMeta>

The Indonesian internet has its own typing culture. Before autocorrect and uniform keyboards flattened everything, there was a whole art to writing *alay* — stretched vowels, mixed caps, numbers standing in for letters. It was chaotic, creative, and very much ours.

[**teksreceh**](https://github.com/flessan/teksreceh) — "Generator Teks Paling Ngaco Se-Indonesia", the most absurd text generator in all of Indonesia — is my attempt to keep that culture playable.

## The transforms

The live tool at [text.thio.qzz.io](https://text.thio.qzz.io) takes your text and runs it through the classic netizen transformations:

- **Alay** — the legendary style: gaya alay 2010
- **UwU** — soft, warm, and aggressively cute
- **Rimsvek** — reversed, mirrored, flipped
- **Binary** — for when you want your chaos to be machine-checkable

Paste something in, get the whole museum back out. It also covers bahasa Jaksel and copypasta grup WA.

## How it's built

teksreceh is React 19 + Vite + Tailwind, deployed on Cloudflare Pages, and it follows a few rules I care about a lot:

- **Instant** — no Generate button, everything is realtime
- **Simple by default** — advanced options only appear when you need them
- **Mobile-first** — the layout feels like an app, not an article
- **Privacy-first** — every transformation runs in the browser. No backend, no tracking.

## Why "receh"?

*Receh* is that small-change humor — cheap jokes, the kind that shouldn't be funny but are. *Teks receh* is exactly what this is: text transformed for no productive reason at all, and that's the point. Not everything needs a business case. Some things just need to exist on the internet.

The repo is GPL-3.0 and open to contributions — if you remember a transform that's missing, open an issue.

Try it: [text.thio.qzz.io](https://text.thio.qzz.io)

<PostNav></PostNav>
