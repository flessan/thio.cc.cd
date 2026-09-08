---
layout: page
title: Timeline
description: The timeline of Flessan (M. Thio Saputra) — from Banjarmasin beginnings to the internet of Thio.
head:
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:title
      content: Timeline — Flessan (M. Thio Saputra)
  - - meta
    - property: og:image
      content: https://thio.cc.cd/images/flessan-banner.png
  - - meta
    - property: og:url
      content: https://thio.cc.cd/timeline
  - - meta
    - property: og:description
      content: From Banjarmasin beginnings to the internet of Thio — the timeline so far.
  - - meta
    - name: twitter:card
      content: summary_large_image
---

<header class="page-hero">
  <div class="page-hero-inner">
    <p class="page-hero-eyebrow">06 / Memory</p>
    <h1 class="page-hero-title">The road so far.</h1>
    <p class="page-hero-desc">
      Small things becoming larger systems, in order. Some dates before 2023
      are approximate — memory is part of the archive too.
    </p>
  </div>
</header>

<div class="page-wide">

<TimelineList :items="items" />

</div>

<script setup>
const items = [
  {
    date: '2009-07-30',
    title: 'Born in South Kalimantan',
    text: 'Muhammad Thio Saputra, born 30 July 2009 — Banjar, Indonesia, WITA.'
  },
  {
    date: '2015',
    title: 'SDIT Al-Fatih',
    text: 'Elementary years at SD Islam Terpadu Al-Fatih. (Approximate date.)'
  },
  {
    date: '2019',
    title: 'Ponpes Raudhatul Musthofa',
    text: 'Non-formal education at an Islamic boarding school — spiritual experience and discipline that still shape how I work and serve. (Approximate date.)'
  },
  {
    date: '2023-05-06',
    title: 'GitHub account @flessan created',
    text: 'The start of the public record. Today: 47 public repositories and counting.'
  },
  {
    date: '2024-12-23',
    title: 'Joining GDPS Hub',
    text: 'First steps into the Geometry Dash private server scene as a GDPS Hub user.'
  },
  {
    date: '2025-07',
    title: 'SMKN 4 Banjarmasin — RPL',
    text: 'Entering the Software Engineering (Rekayasa Perangkat Lunak) program, batch 2025–2028. Becoming active in OSIS, PMR, Habsyi, and Green Generation.'
  },
  {
    date: '2025-07-05',
    title: 'First site: flessan.pages.dev',
    text: 'The repo "flessan" becomes a small website holding programs, photos, and projects — the seed of the ecosystem.'
  },
  {
    date: '2025-07-10',
    title: 'Freedom-List',
    text: '"Pomni Pomni Pomni" — a list of free Geometry Dash servers. The beginning of the GDPS adventure.'
  },
  {
    date: '2025-11',
    title: 'Writing in public',
    text: 'First articles on fless.hashnode.dev: "Jam++ (PlusPlus)" and "Code & Text Cleaner".'
  },
  {
    date: '2026-04',
    title: 'GDIPS Reborn',
    text: 'The GDIPS repository and pages go public — an open-source, community-driven Geometry Dash Indonesia Private Server.'
  },
  {
    date: '2026-07',
    title: 'The Rust & Wayland era',
    text: 'slate-de begins: a CLI-based Wayland desktop environment in Rust. walru, teksreceh, Tyibon, TMY and cekram ship in the same season.'
  },
  {
    date: '2026-08',
    title: 'RemoraSFTP',
    text: 'Exploring and editing SFTP files inside the browser — the Go toolbox grows.'
  },
  {
    date: '2026-09',
    title: 'thio.cc.cd',
    text: 'This site: a new, faster home for the work, the writing, and the doors to every room of the internet of Thio.'
  }
]
</script>
