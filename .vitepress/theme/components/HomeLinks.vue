<script setup lang="ts">
const links = [
  {
    title: 'Projects',
    description: 'Tools, experiments, and things I have shipped.',
    href: '/projects',
    label: 'WORK'
  },
  {
    title: 'Writing',
    description: 'Build logs, notes, and lessons from the process.',
    href: '/blog',
    label: 'NOTES'
  },
  {
    title: 'Now',
    description: 'A snapshot of what currently has my attention.',
    href: '/now',
    label: 'CURRENTLY'
  },
  {
    title: 'About',
    description: 'A little more about the person behind the projects.',
    href: '/about',
    label: 'PROFILE'
  },
  {
    title: 'GDIPS',
    description: 'The Geometry Dash community project I help build.',
    href: 'https://gdips.pages.dev',
    label: 'COMMUNITY',
    external: true
  },
  {
    title: 'GitHub',
    description: 'Repositories, experiments, and things in progress.',
    href: 'https://github.com/flessan',
    label: 'CODE',
    external: true
  },
  {
    title: 'ResonTune',
    description: 'A community-driven music project.',
    href: 'https://tune.thio.cc.cd',
    label: 'MUSIC',
    external: true
  },
  {
    title: 'teksreceh',
    description: 'A little museum of Indonesian internet typing.',
    href: 'https://text.thio.qzz.io',
    label: 'CULTURE',
    external: true
  },
  {
    title: 'Hashnode',
    description: 'Longer write-ups and notes from the workbench.',
    href: 'https://fless.hashnode.dev',
    label: 'WRITING',
    external: true
  }
]
</script>

<template>
  <nav class="home-links" aria-label="Explore the site and projects">
    <a
      v-for="(link, index) in links"
      :key="link.href"
      class="home-links__item"
      :href="link.href"
      :target="link.external ? '_blank' : undefined"
      :rel="link.external ? 'noopener noreferrer' : undefined"
    >
      <span class="home-links__number">{{ String(index + 1).padStart(2, '0') }}</span>
      <span class="home-links__body">
        <span class="home-links__label">{{ link.label }}</span>
        <strong>{{ link.title }}</strong>
        <span class="home-links__description">{{ link.description }}</span>
      </span>
      <span class="home-links__arrow" aria-hidden="true">↗</span>
    </a>
  </nav>
</template>

<style scoped>
.home-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin: 1.1rem 0 2.1rem;
}

.home-links__item {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  min-width: 0;
  padding: 1.05rem 1.1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 15px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  text-decoration: none !important;
  transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease, background-color 180ms ease, box-shadow 240ms ease;
}

.home-links__item:hover {
  transform: translateY(-3px);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 10px 24px rgba(22, 40, 27, 0.07);
}

.home-links__number {
  padding-top: 0.1rem;
  color: var(--vp-c-brand-1);
  font-size: 0.7rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.home-links__body {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 0.22rem;
}

.home-links__label {
  color: var(--vp-c-text-3);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.home-links__body strong {
  font-size: 1.05rem;
  letter-spacing: -0.025em;
}

.home-links__description {
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  line-height: 1.55;
}

.home-links__arrow {
  color: var(--vp-c-brand-1);
  font-size: 0.95rem;
  transition: transform 200ms ease;
}

.home-links__item:hover .home-links__arrow {
  transform: translate(2px, -2px);
}

@media (max-width: 620px) {
  .home-links {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-links__item,
  .home-links__arrow { transition: none; }
  .home-links__item:hover,
  .home-links__item:hover .home-links__arrow { transform: none; }
}
</style>
