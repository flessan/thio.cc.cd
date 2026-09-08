---
layout: page
title: Support
description: Support Flessan's open-source work and the GDIPS community — GitHub Sponsors, Patreon, Saweria, and Sociabuzz.
head:
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:title
      content: Support — Flessan (M. Thio Saputra)
  - - meta
    - property: og:image
      content: https://thio.cc.cd/images/flessan-banner.png
  - - meta
    - property: og:url
      content: https://thio.cc.cd/support
  - - meta
    - property: og:description
      content: Support open-source work and the GDIPS community — every star and every coffee fuels the campfire.
  - - meta
    - name: twitter:card
      content: summary_large_image
---

<header class="page-hero">
  <div class="page-hero-inner">
    <p class="page-hero-eyebrow">08 / Keep in touch</p>
    <h1 class="page-hero-title">Fuel the campfire.</h1>
    <p class="page-hero-desc">
      Everything I build is free and open — tools, servers, experiments, and
      documentation. If any of it helped you, here are the ways to keep the
      fire burning.
    </p>
  </div>
</header>

<div class="page-wide">

<section>
  <SectionHead num="01" label="Sponsor">
    Where the support goes
  </SectionHead>

  <div class="f-cols">
    <div class="f-value-card">
      <h3 class="mono">open source</h3>
      <p>
        Public repositories under MIT and GPL licenses — QR tooling, Android
        automation, text toys, and more.
      </p>
    </div>
    <div class="f-value-card">
      <h3 class="mono">gdips</h3>
      <p>
        The community Geometry Dash private server: servers, CDN, and a UI
        overhaul — all in the open.
      </p>
    </div>
    <div class="f-value-card">
      <h3 class="mono">community</h3>
      <p>
        Discord, moderation, and the small glue that keeps 150+ members
        gathered around the fire.
      </p>
    </div>
  </div>
</section>

<section>
  <SectionHead num="02" label="Platforms">
    Pick your <em>channel</em>
  </SectionHead>

  <div class="support-grid">
    <a class="support-card" href="https://github.com/sponsors/flessan" target="_blank" rel="noopener">
      <span class="support-name">GitHub Sponsors</span>
      <span class="support-handle mono">github.com/sponsors/flessan</span>
      <p>Recurring or one-time — straight from the place where the code lives.</p>
    </a>
    <a class="support-card" href="https://patreon.com/flessan" target="_blank" rel="noopener">
      <span class="support-name">Patreon</span>
      <span class="support-handle mono">patreon.com/flessan</span>
      <p>The GitHub projects, now also on Patreon.</p>
    </a>
    <a class="support-card" href="https://saweria.co/thiosaputra" target="_blank" rel="noopener">
      <span class="support-name">Saweria</span>
      <span class="support-handle mono">saweria.co/thiosaputra</span>
      <p>The Indonesian way to say thanks — QRIS-friendly.</p>
    </a>
    <a class="support-card" href="https://sociabuzz.com/flessan" target="_blank" rel="noopener">
      <span class="support-name">Sociabuzz</span>
      <span class="support-handle mono">sociabuzz.com/flessan</span>
      <p>Memberships and support from creators across Southeast Asia.</p>
    </a>
  </div>

  <div class="support-qris">
    <img src="/images/qris.png" alt="QRIS code for direct support" width="180" height="180" />
    <div class="support-qris-copy">
      <h3 class="mono">QRIS</h3>
      <p>
        Scan to support directly — the same QR code used on the donation page.
        Every rupiah and every star fuels the campfire. 🔥
      </p>
    </div>
  </div>
</section>

<section>
  <SectionHead num="03" label="Free ways">
    Cost nothing, mean <em>everything</em>
  </SectionHead>

  <div class="f-panel">
    <ul>
      <li>⭐ <strong>Star the repos</strong> — every star fuels the campfire.</li>
      <li>🐞 <strong>Report bugs</strong> — bug reporters make every project better.</li>
      <li>💡 <strong>Pitch ideas</strong> — idea contributors inspire new features.</li>
      <li>🛠️ <strong>Send pull requests</strong> — developers who contribute are the heart of open source.</li>
      <li>🎮 <strong>Join GDIPS</strong> — share levels, hang out, be part of it.</li>
    </ul>
  </div>

  <p class="support-note">
    Terima kasih — thank you for embracing our imperfect journey. Your
    presence gives this project meaning.
  </p>
</section>

</div>

<style scoped>
.support-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.9rem;
}

.support-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.9rem;
  background: var(--vp-c-bg-alt);
  padding: 1.2rem 1.3rem;
  text-decoration: none;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.support-card:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 50%, var(--vp-c-border));
  transform: translateY(-2px);
  box-shadow: 0 18px 40px -26px rgba(200, 16, 46, 0.4);
}

.support-name {
  font-weight: 800;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.support-handle {
  font-size: 0.78rem;
  color: var(--vp-c-brand-1);
}

.support-card p {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.support-note {
  margin-top: 1.6rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  max-width: 42rem;
  font-style: italic;
}

.support-qris {
  display: flex;
  align-items: center;
  gap: 1.4rem;
  margin-top: 1.6rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.9rem;
  background: var(--vp-c-bg-alt);
  padding: 1.2rem 1.4rem;
  max-width: 30rem;
}

.support-qris img {
  width: 120px;
  height: 120px;
  border-radius: 0.6rem;
  border: 1px solid var(--vp-c-border);
}

.support-qris-copy h3 {
  margin: 0 0 0.3rem;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: var(--vp-c-brand-1);
}

.support-qris-copy p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

section :deep(em) {
  font-style: normal;
  color: var(--vp-c-brand-1);
}
</style>
