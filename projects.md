---
layout: page
title: Projects
description: The project rack — every public object by Flessan (M. Thio Saputra), from GDIPS to developer tools, experiments, Linux ricing, and school service.
head:
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:title
      content: Projects — Flessan (M. Thio Saputra)
  - - meta
    - property: og:image
      content: https://thio.cc.cd/images/flessan-banner.png
  - - meta
    - property: og:url
      content: https://thio.cc.cd/projects
  - - meta
    - property: og:description
      content: Web software, Linux configuration, automation, tools, experiments, and public repositories — built to solve a real problem or understand one.
  - - meta
    - name: twitter:card
      content: summary_large_image
---

<header class="page-hero">
  <div class="page-hero-inner">
    <p class="page-hero-eyebrow">02 / What I build</p>
    <h1 class="page-hero-title">Code should do something.</h1>
    <p class="page-hero-desc">
      Web software, Linux configuration, automation, tools, experiments, and
      public repositories — built to solve a real problem or understand one.
      Everything below is public on <span class="mono">github.com/flessan</span>.
    </p>
  </div>
</header>

<div class="page-wide projects-page">

<section>
  <SectionHead num="A" label="Featured">
    The headline <em>objects</em>
  </SectionHead>
  <div class="f-grid">
    <ProjectCard v-for="p in featured" :key="p.name" :project="p" />
  </div>
  <p class="projects-more">
    The community flagship gets its own room →
    <a href="/gdips">GDIPS — a digital campfire</a>
  </p>
</section>

<section>
  <SectionHead num="B" label="Geometry Dash">
    The GD <em>ecosystem</em>
  </SectionHead>
  <div class="f-grid">
    <ProjectCard v-for="p in gd" :key="p.name" :project="p" />
  </div>
</section>

<section>
  <SectionHead num="C" label="Tools & automation">
    Small utilities, real <em>leverage</em>
  </SectionHead>
  <div class="f-grid">
    <ProjectCard v-for="p in tools" :key="p.name" :project="p" />
  </div>
</section>

<section>
  <SectionHead num="D" label="Web & experiments">
    Sites, apps & <em>what-ifs</em>
  </SectionHead>
  <div class="f-grid">
    <ProjectCard v-for="p in web" :key="p.name" :project="p" />
  </div>
</section>

<section>
  <SectionHead num="E" label="Linux & desktop">
    The terminal is <em>home</em>
  </SectionHead>
  <div class="f-grid">
    <ProjectCard v-for="p in linux" :key="p.name" :project="p" />
  </div>
</section>

<section>
  <SectionHead num="F" label="School & service">
    Built for SMKN 4 <em>Banjarmasin</em>
  </SectionHead>
  <div class="f-grid">
    <ProjectCard v-for="p in school" :key="p.name" :project="p" />
  </div>
</section>

<section>
  <SectionHead num="G" label="Forks & translations">
    Standing on open <em>shoulders</em>
  </SectionHead>
  <div class="f-grid">
    <ProjectCard v-for="p in translations" :key="p.name" :project="p" />
  </div>
</section>

<p class="projects-foot mono">
  // 47 public repositories · the complete, searchable rack lives at
  <a href="https://projects.thio.qzz.io" target="_blank" rel="noopener">projects.thio.qzz.io</a>
</p>

</div>

<script setup>
import { projects } from './.vitepress/theme/data'
const featured = projects.featured
const gd = projects.gd
const tools = projects.tools
const web = projects.web
const linux = projects.linux
const school = projects.school
const translations = projects.translations
</script>

<style scoped>
.projects-page section {
  margin-bottom: 3.2rem;
}

.projects-more {
  margin: 1.2rem 0 0;
  color: var(--vp-c-text-2);
}

.projects-more a {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.projects-foot {
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 1.4rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  line-height: 1.8;
}

.projects-foot a {
  color: var(--vp-c-brand-1);
}

section :deep(em) {
  font-style: normal;
  color: var(--vp-c-brand-1);
}
</style>
