---
layout: page
title: Flessan
description: M. Thio Saputra — known online as Flessan. Developer, student, musician, and maker of small things that become larger systems. Building from Banjarmasin, Indonesia.
head:
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:title
      content: Flessan — M. Thio Saputra
  - - meta
    - property: og:image
      content: https://thio.cc.cd/images/flessan-banner.png
  - - meta
    - property: og:url
      content: https://thio.cc.cd/
  - - meta
    - property: og:description
      content: Developer, student, musician, and maker of small things that become larger systems. GDIPS founder, building from Banjarmasin, Indonesia.
  - - meta
    - name: twitter:card
      content: summary_large_image
---

<HomeHero />

<div class="home-sections">

<section>
  <TerminalWindow />
</section>

<section>
  <SectionHead num="01" label="What I build" href="/projects">
    Projects with a <em>pulse</em>
  </SectionHead>

  <div class="f-grid">
    <ProjectCard v-for="p in featured" :key="p.name" :project="p" />
  </div>

  <p class="home-more mono">
    → the full rack lives at
    <a href="/projects">projects</a> — and the wider network at
    <a href="/ecosystem">the ecosystem</a>
  </p>
</section>

<section>
  <SectionHead num="02" label="Philosophy">
    Built with heart, <em>not</em> polish
  </SectionHead>

  <div class="home-philosophy">
    <img class="home-philosophy-img" src="/images/covers/terminal-values.png" alt="A terminal window with a red heart glowing inside" loading="lazy" />
    <blockquote class="f-quote">
      "We're building a digital campfire, not a perfect one, but warm enough
      for those who want to gather around."
      <cite>— M. Thio Saputra, founder of GDIPS</cite>
    </blockquote>
  </div>

  <div class="f-grid">
    <div class="f-value-card">
      <h3 class="mono">learning-first</h3>
      <p>
        Development that prioritizes learning over chasing perfection. Every
        repo is a lesson kept in public.
      </p>
    </div>
    <div class="f-value-card">
      <h3 class="mono">creative freedom</h3>
      <p>
        Build what you imagine — with respectful collaboration. Communities
        work when both are true at once.
      </p>
    </div>
    <div class="f-value-card">
      <h3 class="mono">embrace imperfection</h3>
      <p>
        Imperfection is part of the journey. Bugs have character, crashes have
        personality — and the community has heart.
      </p>
    </div>
  </div>
</section>

<section>
  <SectionHead num="03" label="Now" href="/now">
    What's keeping me busy
  </SectionHead>

  <ul class="f-chips">
    <li>building: the internet of thio</li>
    <li>building: slate-de</li>
    <li>learning: rust · go</li>
    <li>listening: dangdut · hadroh · ambient</li>
    <li class="accent">class XI · SMKN 4 Banjarmasin</li>
  </ul>

  <p class="home-more mono">→ read the full <a href="/now">/now page</a></p>
</section>

<section>
  <SectionHead num="04" label="Writing" href="/blog">
    From the <em>gudang</em>
  </SectionHead>

  <BlogPost image="/images/covers/hello-internet.png">

  **[hello, internet](./blog/hello-internet.md)**
  <br>A new home at thio.cc.cd — who I am, and what this site will hold

  </BlogPost>

  <BlogPost image="/images/covers/gdips-campfire.png">

  **[GDIPS: a digital campfire](./blog/gdips-reborn.md)**
  <br>How a free-server list grew into a community-driven Geometry Dash private server

  </BlogPost>

  <BlogPost image="/images/covers/internet-of-thio.png">

  **[The internet of Thio](./blog/internet-of-thio.md)**
  <br>Why I build many small rooms instead of one big website

  </BlogPost>
</section>

<section>
  <SectionHead num="05" label="Connect">
    Let's make something <em>useful</em>
  </SectionHead>

  <p class="home-connect-lead">
    Find the work, follow the changes, or leave a note. The fastest way to
    reach me is <a href="mailto:tio@cc.cc">tio@cc.cc</a>.
  </p>

  <SocialGrid />
</section>

</div>

<script setup>
import { projects } from './.vitepress/theme/data'
const featured = projects.featured
</script>

<style scoped>
.home-sections {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  max-width: 72rem;
  margin-inline: auto;
  padding: 3.2rem 1.5rem 2rem;
}

.home-philosophy {
  display: grid;
  gap: 1.6rem;
  align-items: center;
  margin-bottom: 1.2rem;
}

@media (min-width: 768px) {
  .home-philosophy {
    grid-template-columns: 260px 1fr;
  }
}

.home-philosophy-img {
  width: 100%;
  border-radius: 0.9rem;
  border: 1px solid var(--vp-c-border);
}

.home-philosophy .f-quote {
  margin: 0;
  font-size: 1.02rem;
}

.home-more {
  margin: 1.2rem 0 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.home-more a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: none;
}

.home-more a:hover {
  text-decoration: underline;
}

.home-connect-lead {
  margin: -0.6rem 0 1.4rem;
  color: var(--vp-c-text-2);
  max-width: 42rem;
  line-height: 1.7;
}

.home-connect-lead a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

section :deep(em) {
  font-style: normal;
  color: var(--vp-c-brand-1);
}
</style>
