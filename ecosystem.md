---
layout: page
title: Ecosystem
description: The internet of Thio — every room of Flessan's network, from the main house at thio.qzz.io to the GDIPS campfire.
head:
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:title
      content: Ecosystem — the internet of Thio
  - - meta
    - property: og:image
      content: https://thio.cc.cd/images/flessan-banner.png
  - - meta
    - property: og:url
      content: https://thio.cc.cd/ecosystem
  - - meta
    - property: og:description
      content: Every room of the network — home, projects, lab, games, music, tools, archive, and the GDIPS campfire.
  - - meta
    - name: twitter:card
      content: summary_large_image
---

<header class="page-hero">
  <div class="page-hero-inner">
    <p class="page-hero-eyebrow">07 / The network</p>
    <h1 class="page-hero-title">The internet of Thio.</h1>
    <p class="page-hero-desc">
      One town, many rooms. Each link below is a real place in the network —
      built to solve a problem, learn a system, or just keep something warm.
      <a href="./blog/internet-of-thio">Read the story →</a>
    </p>
  </div>
</header>

<div class="page-wide">

<div class="eco-grid">
  <LinkCard v-for="room in rooms" :key="room.title" :item="room" />
</div>

<p class="eco-note">
  Why so many rooms? Because old work is part of the work — rooms get
  rebuilt, never quietly deleted. The
  <a href="https://archive.thio.qzz.io" target="_blank" rel="noopener">archive</a>
  keeps the earlier versions visible, without pretending they were finished.
</p>

</div>

<script setup>
import { ecosystem } from './.vitepress/theme/data'
const rooms = ecosystem
</script>

<style scoped>
.eco-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 0.9rem;
}

.eco-note {
  margin-top: 2rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  max-width: 46rem;
}

.eco-note a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
</style>
