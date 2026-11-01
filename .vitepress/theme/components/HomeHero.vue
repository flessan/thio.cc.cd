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
    <div class="hero-grid">
      <div class="hero-copy">
        <span class="hero-chip">
          <span class="hero-chip-dot" aria-hidden="true"></span>
          <span class="hero-chip-text">Open source · Banjarmasin, Indonesia</span>
        </span>

        <h1 class="hero-title">
          <span class="hero-line">
            Hi, I'm <span class="hero-name">Flessan</span>.
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
          <a class="hero-btn hero-btn-filled" href="/blog">
            <span>Read the blog</span>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 12h13M12.5 6.5L19 12l-6.5 5.5" />
            </svg>
          </a>
          <a class="hero-btn hero-btn-tonal" href="/projects">Explore projects</a>
          <a class="hero-support" href="/support">
            Support my work <span aria-hidden="true">↗</span>
          </a>
        </div>

        <p class="hero-meta">
          <span class="hero-meta-time">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 1.9" />
            </svg>
            {{ clock }} WITA
          </span>
          <span class="hero-meta-divider" aria-hidden="true"></span>
          <span class="hero-meta-now">
            <span class="hero-live" aria-hidden="true"></span>
            <span class="hero-meta-label">Now</span>
            <span class="hero-meta-text" data-ticker>shipping small, useful tools</span>
          </span>
        </p>
      </div>

      <div class="hero-art">
        <span class="hero-shape hero-shape-a" data-hero-shape aria-hidden="true"></span>
        <span class="hero-shape hero-shape-b" data-hero-shape aria-hidden="true"></span>
        <span class="hero-shape hero-shape-c" data-hero-shape aria-hidden="true"></span>

        <figure class="hero-figure">
          <img
            class="hero-photo"
            src="/images/flessan-banner.webp"
            alt="Illustrated city skyline with a cat in a bandana — the thio.cc.cd banner art"
            width="1200"
            height="630"
            fetchpriority="high"
            decoding="async"
          />
          <figcaption class="hero-badge">
            <span class="hero-badge-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3.4l2.3 5.1 5.6.7-4.1 3.9 1.1 5.6L12 16l-4.9 2.7 1.1-5.6-4.1-3.9 5.6-.7z" />
              </svg>
            </span>
            <span class="hero-badge-text">
              <strong>GDIPS</strong>
              <span>open-source community</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </div>

    <SearchDock class="hero-search" />

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
      <div class="hero-stat hero-stat-quiet">
        <dt>10</dt>
        <dd>Search engines</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  margin: 0 0 3rem;
  padding: clamp(1.75rem, 3.4vw, 2.75rem) 0 0;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
  column-gap: clamp(1.75rem, 4.5vw, 3.75rem);
  row-gap: clamp(1.75rem, 3vw, 2.5rem);
  align-items: center;
}

.hero-copy {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}

/* ------------------------------------------------------------------ chip */
.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 32px;
  padding: 0 0.9rem;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.hero-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--md-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--md-primary) 14%, transparent);
  animation: m3-pulse 3.2s var(--md-ease-standard) infinite;
}

@keyframes m3-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ----------------------------------------------------------------- title */
.hero-title {
  margin: 1.5rem 0 0;
  color: var(--md-on-surface);
  font-size: clamp(2.6rem, 5.2vw, 4.1rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.04;
}

.hero-line {
  display: block;
}

.hero-name {
  color: var(--md-primary);
  font-weight: 500;
}

.hero-line-sub {
  margin-top: 0.5rem;
  color: var(--md-on-surface-variant);
  font-size: clamp(1.15rem, 2.2vw, 1.5rem);
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.3;
}

.hero-lead {
  max-width: 48ch;
  margin: 1.35rem 0 0;
  color: var(--md-on-surface-variant);
  font-size: 1rem;
  line-height: 1.7;
}

.hero-lead a {
  color: var(--md-primary);
  font-weight: 500;
}

/* --------------------------------------------------------------- actions */
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.7rem;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 1.4rem;
  border: 0;
  border-radius: var(--md-shape-full);
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.1px;
  text-decoration: none;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    box-shadow var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-short) var(--md-ease-spring);
}

.hero-btn:active {
  transform: scale(0.97);
}

.hero-btn-filled {
  background: var(--md-primary);
  color: var(--md-on-primary);
  box-shadow: var(--md-elevation-1);
}

.hero-btn-filled:hover {
  color: var(--md-on-primary);
  background: color-mix(in srgb, var(--md-primary) 90%, var(--md-on-primary));
  box-shadow: var(--md-elevation-2);
}

.hero-btn-filled svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--md-duration-medium) var(--md-ease-spring);
}

.hero-btn-filled:hover svg {
  transform: translateX(3px);
}

.hero-btn-tonal {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.hero-btn-tonal:hover {
  color: var(--md-on-secondary-container);
  background: color-mix(in srgb, var(--md-secondary-container) 92%, var(--md-on-secondary-container));
  box-shadow: var(--md-elevation-1);
}

.hero-support {
  margin-left: 0.3rem;
  color: var(--md-primary);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.hero-support:hover {
  text-decoration: underline;
}

/* ------------------------------------------------------------------ meta */
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin: 1.5rem 0 0;
  color: var(--md-on-surface-variant);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  letter-spacing: 0.2px;
}

.hero-meta-time {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-variant-numeric: tabular-nums;
}

.hero-meta-time svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
}

.hero-meta-divider {
  width: 1px;
  height: 14px;
  background: var(--md-outline-variant);
}

.hero-meta-now {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.hero-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--md-tertiary);
  animation: m3-pulse 2.6s var(--md-ease-standard) infinite;
}

.hero-meta-label {
  color: var(--md-on-surface);
  font-weight: 500;
}

.hero-meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ------------------------------------------------------------------- art */
.hero-art {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  aspect-ratio: 1 / 0.94;
  min-width: 0;
}

.hero-shape {
  position: absolute;
  display: block;
  z-index: 0;
}

.hero-shape-a {
  top: -5%;
  left: -8%;
  width: 60%;
  aspect-ratio: 1;
  border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%;
  background: var(--md-primary-container);
  cursor: grab;
}

.hero-shape-a:active {
  cursor: grabbing;
}

.hero-shape-b {
  right: -6%;
  bottom: -3%;
  width: 46%;
  aspect-ratio: 1;
  border-radius: 58% 42% 38% 62% / 55% 39% 61% 45%;
  background: var(--md-tertiary-container);
}

.hero-shape-c {
  top: -3%;
  right: 7%;
  width: 19%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--md-primary);
  opacity: 0.9;
}

.hero-figure {
  position: absolute;
  z-index: 2;
  inset: 10% 7% 11% 10%;
  margin: 0;
  overflow: hidden;
  border-radius: var(--md-shape-2xl);
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-3);
}

.hero-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-badge {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  max-width: calc(100% - 1.5rem);
  padding: 0.45rem 0.85rem 0.45rem 0.45rem;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-lowest);
  box-shadow: var(--md-elevation-1);
}

.hero-badge-mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.hero-badge-mark svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.hero-badge-text {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}

.hero-badge-text strong {
  color: var(--md-on-surface);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.hero-badge-text span {
  color: var(--md-on-surface-variant);
  font-size: 0.63rem;
  letter-spacing: 0.1px;
}

/* ---------------------------------------------------------------- search */
.hero-search {
  grid-column: 1 / -1;
  grid-row: 2;
  margin-top: clamp(0.25rem, 1vw, 0.75rem);
}

/* ----------------------------------------------------------------- stats */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 1rem 0 0;
}

.hero-stat {
  padding: 0.85rem 1rem;
  border-radius: var(--md-shape-lg);
  background: var(--md-surface-container-low);
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.hero-stat:hover {
  background: var(--md-surface-container-high);
}

.hero-stat dt {
  margin: 0;
  color: var(--md-primary);
  font-size: 1.65rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.hero-stat dd {
  margin: 0.15rem 0 0;
  color: var(--md-on-surface-variant);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.hero-stat-quiet dt {
  color: var(--md-on-surface);
}

/* ------------------------------------------------------------ responsive */
@media (max-width: 900px) {
  .hero-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-copy {
    grid-column: 1;
    grid-row: 1;
  }

  .hero-art {
    grid-column: 1;
    grid-row: 2;
    aspect-ratio: 16 / 11;
    max-height: 380px;
  }

  .hero-search {
    grid-row: 3;
    margin-top: 0.5rem;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .hero-title {
    font-size: clamp(2.2rem, 11vw, 2.75rem);
  }

  .hero-chip {
    font-size: 0.68rem;
    padding-inline: 0.75rem;
  }

  .hero-lead {
    font-size: 0.95rem;
  }

  .hero-btn {
    flex: 1 1 100%;
  }

  .hero-support {
    flex: 1 1 100%;
    margin: 0.35rem 0 0;
    text-align: center;
  }

  .hero-meta {
    font-size: 0.68rem;
  }

  .hero-meta-divider {
    display: none;
  }

  .hero-meta-now {
    flex: 1 1 100%;
  }

  .hero-art {
    aspect-ratio: 5 / 4;
    max-height: 320px;
  }

  .hero-figure {
    inset: 9% 4% 7% 7%;
  }

  .hero-badge {
    left: 0.5rem;
    bottom: 0.5rem;
  }

  .hero-badge-text span {
    display: none;
  }

  .hero-stat {
    padding: 0.7rem 0.85rem;
  }

  .hero-stat dt {
    font-size: 1.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-chip-dot,
  .hero-live {
    animation: none;
  }
}
</style>
