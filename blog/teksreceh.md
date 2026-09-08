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

<p class="post-meta mono">by M. Thio Saputra · 2026-09-01 · Banjarmasin, WITA</p>

The Indonesian internet has its own typing culture. Before autocorrect and
uniform keyboards flattened everything, there was a whole art to writing
*alay* — stretched vowels, mixed caps, numbers standing in for letters. It
was chaotic, creative, and very much ours.

[**teksreceh**](https://github.com/flessan/teksreceh) — "Generator Teks
Paling Ngaco Se-Indonesia", the most absurd text generator in all of
Indonesia — is my attempt to keep that culture playable.

## The transforms

The live tool at [text.thio.qzz.io](https://text.thio.qzz.io) takes your text
and runs it through the classic netizen transformations:

- **Alay** — the legendary mixed-case, vowel-stretched style
- **UwU** — soft, warm, and aggressively cute
- **Rimsvek** — reversed, mirrored, flipped
- **Binary** — for when you want your chaos to be machine-checkable

Paste something in, get the whole museum back out. Everything runs locally in
your browser — like everything in my [tools room](https://tools.thio.qzz.io),
your input never leaves your machine.

## Why "receh"?

*Receh* is that small-change humor — cheap jokes, the kind that shouldn't be
funny but are. *Teks receh* is exactly what this is: text transformed for no
productive reason at all, and that's the point. Not everything needs a
business case. Some things just need to exist on the internet.

## Built the boring way, on purpose

teksreceh is a TypeScript web app — part of my React 19 + TypeScript learning
track. The fun part of the project isn't the architecture; it's the dataset
of transformations, each one a little piece of typing folklore. If you
remember a transform that's missing, the repo is open and PRs are welcome.

Try it: [text.thio.qzz.io](https://text.thio.qzz.io)

<style scoped>
.post-meta {
  margin: -1.2rem 0 2.4rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}
</style>
