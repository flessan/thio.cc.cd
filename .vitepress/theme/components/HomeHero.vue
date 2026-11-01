<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { blogPosts } from '../../blog-posts'
import SearchDock from './SearchDock.vue'

const postCount = computed(() => blogPosts.length)

const clock = ref('--:--')
let timer: number | undefined

function tick() {
  try {
    clock.value = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Makassar'
    }).format(new Date())
  } catch {
    clock.value = new Date().toTimeString().slice(0, 5)
  }
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 20000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <section class="hero" data-hero>
    <div class="hero-top">
      <p class="hero-eyebrow">
        <span class="hero-dot" aria-hidden="true"></span>
        <span class="hero-eyebrow-text">Open source · Banjarmasin, Indonesia</span>
      </p>
      <p class="hero-ticker">
        <span class="hero-ticker-label">Now</span>
        <span class="hero-ticker-text" data-ticker>shipping small, useful tools</span>
      </p>

      <span class="hero-clock">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 1.9" />
        </svg>
        {{ clock }} <span class="hero-clock-zone">WITA</span>
      </span>
    </div>

    <div class="hero-grid">
      <div class="hero-copy">
        <h1 class="hero-title">
          <span class="hero-line">
            Hi, I'm <em class="hero-name">Flessan</em>.
          </span>
          <span class="hero-line hero-line-sub">
            I build calm tools for a loud web.
          </span>
        </h1>

        <p class="hero-lead">
          Self-taught web developer and automation engineer. I ship fast,
          resilient sites and open-source tools — most proudly
          <a href="/gdips">GDIPS</a>, a community-run Geometry Dash server.
        </p>

        <div class="hero-actions">
          <a class="hero-btn hero-btn-primary" href="/blog">
            <span>Read the blog</span>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 12h13M12.5 6.5L19 12l-6.5 5.5" />
            </svg>
          </a>
          <a class="hero-btn hero-btn-ghost" href="/projects">Explore projects</a>
          <a class="hero-support" href="/support">
            Support my work <span aria-hidden="true">↗</span>
          </a>
        </div>

        <dl class="hero-stats">
          <div class="hero-stat">
            <dt><span :data-count="postCount">{{ postCount }}</span></dt>
            <dd>Field notes</dd>
          </div>
          <div class="hero-stat">
            <dt><span data-count="47">47</span></dt>
            <dd>Public repos</dd>
          </div>
          <div class="hero-stat">
            <dt><span data-count="1">1</span></dt>
            <dd>Community server</dd>
          </div>
        </dl>
      </div>

      <figure class="hero-figure hero-frame">
        <img
          class="hero-frame-image"
          src="/images/flessan-banner.webp"
          alt="Illustrated city skyline with a cat in a bandana — the thio.cc.cd banner art"
          width="1200"
          height="630"
          fetchpriority="high"
          decoding="async"
        />
        <figcaption class="hero-frame-caption">
          <span class="frame-dot" aria-hidden="true"></span>
          GDIPS · open-source community
          <span class="frame-meta">est. 2019</span>
        </figcaption>
      </figure>

      <SearchDock class="hero-search" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  margin: 0 0 3.25rem;
  padding: clamp(1.5rem, 3vw, 2.5rem) 0 0;
}

.hero-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  padding-bottom: 1.1rem;
  margin-bottom: clamp(1.75rem, 3.5vw, 2.75rem);
  border-bottom: 1px solid var(--vp-c-divider);
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fl-accent);
  box-shadow: 0 0 0 3px var(--fl-accent-soft);
  animation: heartbeat 3.2s ease-in-out infinite;
}

@keyframes heartbeat {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.hero-clock {
  display: inline-flex;
  margin-left: 0.9rem;
  align-items: center;
  gap: 0.4rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.hero-clock svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.hero-clock-zone {
  color: var(--vp-c-text-3);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  row-gap: clamp(1.25rem, 2.4vw, 1.9rem);
  column-gap: clamp(2rem, 5vw, 4.25rem);
  align-items: center;
}

.hero-copy {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}

.hero-figure {
  grid-column: 2;
  grid-row: 1;
}

.hero-search {
  grid-column: 1 / -1;
  grid-row: 2;
}

.hero-title {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(2.5rem, 5vw, 3.9rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.02;
}

.hero-line {
  display: block;
}

.hero-name {
  color: var(--fl-accent-ink);
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.028em;
}

.hero-line-sub {
  margin-top: 0.55rem;
  color: var(--vp-c-text-2);
  font-size: clamp(1.1rem, 2.2vw, 1.45rem);
  font-weight: 500;
  letter-spacing: -0.025em;
  line-height: 1.3;
}

.hero-lead {
  max-width: 50ch;
  margin: 1.35rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.98rem;
  line-height: 1.75;
}

.hero-lead a {
  color: var(--fl-accent-ink);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--fl-accent-line);
  text-underline-offset: 0.22em;
}

.hero-lead a:hover {
  text-decoration-color: currentColor;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.6rem;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.6rem;
  padding: 0 1.05rem;
  border: 1px solid transparent;
  border-radius: var(--fl-r-sm);
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: -0.005em;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 200ms var(--flessan-ease-out),
    box-shadow 200ms var(--flessan-ease-out);
}

.hero-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--flessan-shadow-sm);
}

.hero-btn-primary {
  background: var(--fl-accent);
  color: var(--fl-on-accent);
}

.hero-btn-primary:hover {
  background: var(--fl-accent-hover);
  color: var(--fl-on-accent);
}

.hero-btn-primary svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 200ms var(--flessan-ease-out);
}

.hero-btn-primary:hover svg {
  transform: translateX(2px);
}

.hero-btn-ghost {
  border-color: var(--vp-c-border);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
}

.hero-btn-ghost:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-alt);
}

.hero-support {
  margin-left: 0.35rem;
  color: var(--vp-c-text-2);
  font-size: 0.84rem;
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--vp-c-border);
  text-underline-offset: 0.25em;
  transition: color 160ms ease, text-decoration-color 160ms ease;
}

.hero-support:hover {
  color: var(--fl-accent-ink);
  text-decoration-color: var(--fl-accent-line);
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin: 2.1rem 0 0;
  border-top: 1px solid var(--vp-c-divider);
}

.hero-stat {
  flex: 1 1 0;
  min-width: 6rem;
  padding: 0.95rem 1.1rem 0 0;
  margin-right: 1.1rem;
  border-right: 1px solid var(--vp-c-divider);
}

.hero-stat:last-child {
  border-right: 0;
  margin-right: 0;
}

.hero-stat dt {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 1.55rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  line-height: 1;
}

.hero-stat dd {
  margin: 0.35rem 0 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ---------------------------------------------------------------- figure */
.hero-figure {
  position: relative;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--fl-r-lg);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--flessan-shadow-md);
}

.hero-frame-image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
  object-fit: cover;
}

.hero-frame-caption {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  letter-spacing: 0.02em;
}

.frame-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--fl-accent);
}

.frame-meta {
  margin-left: auto;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.6rem;
}

/* -------------------------------------------------------------- elements */
.hero-search {
  margin-top: clamp(1.5rem, 2.6vw, 2rem);
}

.hero-ticker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  margin: 0 0 0 auto;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  letter-spacing: 0.01em;
}

.hero-ticker-label {
  padding: 0.12rem 0.4rem;
  border: 1px solid var(--fl-accent-line);
  border-radius: 4px;
  background: var(--fl-accent-soft);
  color: var(--fl-accent-ink);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-ticker-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .hero-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .hero-copy {
    grid-column: 1;
    grid-row: 1;
  }

  .hero-search {
    grid-column: 1;
    grid-row: 2;
    margin-top: 1.5rem;
  }

  .hero-figure {
    grid-column: 1;
    grid-row: 3;
    margin-top: 1.75rem;
  }

  .hero-stats {
    margin-top: 1.7rem;
  }
}

@media (max-width: 560px) {
  .hero-top {
    align-items: flex-start;
  }

  .hero-ticker {
    display: none;
  }

  .hero-title {
    font-size: clamp(2.2rem, 10vw, 2.7rem);
  }

  .hero-stat {
    flex: 1 1 4.5rem;
    min-width: 0;
    padding-right: 0.7rem;
    margin-right: 0.7rem;
  }

  .hero-stat dt {
    font-size: 1.3rem;
  }

  .hero-btn {
    flex: 1 1 100%;
    justify-content: center;
  }

  .hero-support {
    flex: 1 1 100%;
    margin: 0.2rem 0 0;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-dot {
    animation: none;
  }
}
</style>
