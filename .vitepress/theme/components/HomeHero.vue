<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { blogPosts } from '../../blog-posts'
import SearchDock from './SearchDock.vue'

const postCount = computed(() => blogPosts.length)

// A tiny live clock, always in the site owner's timezone.
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
  timer = window.setInterval(tick, 15000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <section class="home-hero" data-hero>
    <div class="hero-atmosphere" aria-hidden="true">
      <span class="hero-blob hero-blob-a"></span>
      <span class="hero-dots"></span>
      <svg class="hero-spark hero-spark-a" viewBox="0 0 24 24">
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      </svg>
      <svg class="hero-spark hero-spark-b" viewBox="0 0 24 24">
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      </svg>
    </div>

    <div class="hero-copy">
      <div class="hero-meta-row">
        <p class="hero-eyebrow">
          <span class="hero-dot" aria-hidden="true"></span>
          <span class="hero-eyebrow-text">Open source · Banjarmasin, Indonesia</span>
        </p>
        <span class="hero-clock">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.2 2" />
          </svg>
          <span>{{ clock }}</span>
          <span class="hero-clock-zone">WITA</span>
        </span>
      </div>

      <h1 class="hero-title">
        <span class="hero-line">
          Hi, I'm <span class="hero-name">Flessan</span><span class="hero-bang">!</span>
        </span>
        <span class="hero-line hero-line-sub">
          I build calm tools for a loud web.
        </span>
      </h1>

      <svg class="hero-scribble" viewBox="0 0 240 14" aria-hidden="true">
        <path d="M3 10c34-7 63 3 96-2s57 5 88-1 33 1 50-2" />
      </svg>

      <p class="hero-lead">
        Self-taught web developer and automation engineer. I ship fast, resilient
        sites and open-source tools — most proudly
        <a href="/gdips">GDIPS</a>, a community-run Geometry Dash server.
      </p>

      <div class="hero-actions">
        <a class="hero-btn hero-btn-primary" href="/blog">
          <span>Read the blog</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6" />
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
          <dd>field notes</dd>
        </div>
        <div class="hero-stat">
          <dt><span data-count="47">47</span></dt>
          <dd>public repos</dd>
        </div>
        <div class="hero-stat">
          <dt><span data-count="1">1</span></dt>
          <dd>community server</dd>
        </div>
      </dl>

      <p class="hero-ticker" aria-hidden="true">
        <span class="hero-ticker-label">right now</span>
        <span class="hero-ticker-text" data-ticker>shipping small, useful tools</span>
      </p>
    </div>

    <div class="hero-stage">
      <figure class="hero-frame">
        <span class="hero-tape hero-tape-a" aria-hidden="true"></span>
        <span class="hero-tape hero-tape-b" aria-hidden="true"></span>
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
          <span class="frame-chip">
            <span class="frame-chip-dot" aria-hidden="true"></span>
            GDIPS · open source community
          </span>
        </figcaption>
      </figure>

      <div class="hero-sticker" data-hero-sticker aria-hidden="true">
        <img src="/images/flessan-avatar.png" alt="" width="96" height="96" />
        <span>say hi!</span>
      </div>

      <span class="hero-badge" aria-hidden="true">since 2019</span>
    </div>

    <SearchDock class="hero-search" />
  </section>
</template>

<style scoped>
.home-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: center;
  margin: 0 0 2rem;
  padding: clamp(1rem, 3vw, 2.25rem) 0 0.5rem;
  isolation: isolate;
}

/* Flat, hand-placed shapes behind the hero. No gradients anywhere. */
.hero-atmosphere {
  position: absolute;
  inset: -6rem -5rem -4rem;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.hero-blob {
  position: absolute;
  display: block;
  border: 2px solid var(--fl-ink);
}

.hero-blob-a {
  top: -2.4rem;
  right: 6%;
  width: clamp(9rem, 14vw, 14rem);
  height: clamp(9rem, 14vw, 14rem);
  border-radius: 50%;
  background: color-mix(in srgb, var(--fl-accent) 68%, var(--vp-c-bg));
  opacity: 0.8;
}

.hero-dots {
  position: absolute;
  top: 30%;
  left: 2%;
  width: 8.5rem;
  height: 8.5rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Ccircle cx='2' cy='2' r='1.6' fill='%23c9b68d'/%3E%3C/svg%3E");
  transform: rotate(-6deg);
  opacity: 0.75;
}

.hero-spark {
  position: absolute;
  fill: var(--vp-c-text-1);
  opacity: 0.85;
}

.hero-spark-a {
  top: 4%;
  left: 44%;
  width: 20px;
  height: 20px;
  color: var(--fl-accent);
  fill: currentColor;
  animation: fl-spin 14s linear infinite;
}

.hero-spark-b {
  right: 2%;
  bottom: 24%;
  width: 13px;
  height: 13px;
  fill: var(--fl-accent);
  animation: fl-spin 10s linear infinite reverse;
}

@keyframes fl-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------------------------------------------------------------- copy */
.hero-copy {
  min-width: 0;
}

.hero-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 0.9rem;
  margin-bottom: 0.9rem;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.32rem 0.7rem;
  border: 2px solid var(--fl-ink);
  border-radius: 999px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: 2px 2px 0 var(--fl-ink);
}

.hero-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2fbe7b;
  border: 1.5px solid var(--fl-ink);
  animation: fl-breathe 2.6s ease-in-out infinite;
}

@keyframes fl-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.62);
  }
}

.hero-clock {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border: 2px dashed var(--fl-ink);
  border-radius: 999px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.hero-clock svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.hero-clock-zone {
  color: var(--fl-accent-ink);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

.hero-title {
  margin: 0 0 0.35rem;
  font-size: clamp(2.35rem, 5.4vw, 3.9rem);
  font-weight: 850;
  letter-spacing: -0.05em;
  line-height: 1.02;
  text-wrap: balance;
}

.hero-line {
  display: block;
}

.hero-line-sub {
  margin-top: 0.4rem;
  color: var(--vp-c-text-2);
  font-size: clamp(1.15rem, 2.3vw, 1.55rem);
  font-weight: 620;
  letter-spacing: -0.025em;
  line-height: 1.25;
}

.hero-name {
  position: relative;
  display: inline-block;
  z-index: 0;
  padding: 0 0.08em;
}

.hero-name::before {
  content: '';
  position: absolute;
  inset: 0.16em -0.02em 0.06em;
  z-index: -1;
  border-radius: 7px;
  background: var(--fl-accent);
  transform: rotate(-1.4deg);
}

.hero-bang {
  color: var(--fl-accent-ink);
}

.hero-scribble {
  display: block;
  width: min(15rem, 70%);
  height: auto;
  margin: 0.2rem 0 0.6rem;
  overflow: visible;
  fill: none;
  stroke: var(--fl-accent-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.hero-lead {
  max-width: 46ch;
  margin: 0.4rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 1rem;
  line-height: 1.7;
}

.hero-lead a {
  color: var(--fl-accent-ink);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1.35rem;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.9rem;
  padding: 0 1.15rem;
  border: 2px solid var(--fl-ink);
  border-radius: 999px;
  font-size: 0.92rem;
  font-weight: 750;
  text-decoration: none;
  box-shadow: 3px 3px 0 var(--fl-ink);
  transition:
    transform 160ms var(--flessan-ease-out),
    box-shadow 160ms var(--flessan-ease-out),
    background-color 160ms ease;
}

.hero-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--fl-ink);
}

.hero-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--fl-ink);
}

.hero-btn-primary {
  background: var(--fl-accent);
  color: var(--fl-on-accent);
}

.hero-btn-primary svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 200ms var(--flessan-ease-out);
}

.hero-btn-primary:hover svg {
  transform: translateX(3px);
}

.hero-btn-ghost {
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
}

.hero-support {
  margin-left: 0.15rem;
  color: var(--vp-c-text-2);
  font-size: 0.86rem;
  font-weight: 650;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-decoration-color: var(--fl-accent);
  text-underline-offset: 5px;
}

.hero-support:hover {
  text-decoration-color: var(--fl-accent-ink);
}

.hero-support:hover {
  color: var(--fl-accent-ink);
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 1.5rem 0 0;
}

.hero-stat {
  flex: 1 1 6rem;
  min-width: 6rem;
  padding: 0.6rem 0.8rem;
  border: 2px solid var(--fl-ink);
  border-radius: var(--flessan-radius-md);
  background: var(--vp-c-bg-elv);
}

.hero-stat:nth-child(2) {
  transform: rotate(-1deg);
}

.hero-stat:nth-child(3) {
  transform: rotate(1deg);
}

.hero-stat dt {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 850;
  letter-spacing: -0.04em;
  line-height: 1;
}

.hero-stat dd {
  margin: 0.25rem 0 0;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hero-ticker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0 0;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}

.hero-ticker-label {
  padding: 0.16rem 0.5rem;
  border: 2px solid var(--fl-ink);
  border-radius: 6px;
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transform: rotate(-2deg);
}

.hero-ticker-text {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* --------------------------------------------------------------- stage */
.hero-stage {
  position: relative;
  min-width: 0;
  padding: 0.6rem 0.6rem 1.4rem 0;
}

.hero-frame {
  position: relative;
  margin: 0;
  border: 3px solid var(--fl-ink);
  border-radius: var(--flessan-radius-lg);
  background: var(--vp-c-bg-elv);
  box-shadow: 8px 8px 0 var(--fl-ink);
  transform: rotate(-1.6deg);
  overflow: hidden;
}

.hero-frame-image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
  object-fit: cover;
}

.hero-frame-caption {
  padding: 0.55rem 0.7rem;
  border-top: 2px solid var(--fl-ink);
  background: var(--vp-c-bg-elv);
}

.frame-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.frame-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2fbe7b;
  border: 1.5px solid var(--fl-ink);
}

.hero-tape {
  position: absolute;
  z-index: 2;
  width: 6.5rem;
  height: 1.55rem;
  background: var(--fl-tape);
  border: 2px solid var(--fl-ink);
  opacity: 0.95;
}

.hero-tape-a {
  top: -0.55rem;
  left: -1.6rem;
  transform: rotate(-38deg);
}

.hero-tape-b {
  right: -1.8rem;
  bottom: 2.2rem;
  transform: rotate(-38deg);
}

.hero-sticker {
  position: absolute;
  right: -0.4rem;
  bottom: 0;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  width: 7.2rem;
  padding: 0.45rem 0.45rem 0.35rem;
  border: 2px solid var(--fl-ink);
  border-radius: 14px;
  background: var(--vp-c-bg-elv);
  box-shadow: 5px 5px 0 var(--fl-ink);
  transform: rotate(5deg);
  cursor: grab;
  touch-action: none;
  z-index: 3;
}

.hero-sticker:active {
  cursor: grabbing;
}

.hero-sticker img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  border: 2px solid var(--fl-ink);
  border-radius: 9px;
  object-fit: cover;
  pointer-events: none;
}

.hero-sticker span {
  font-family: var(--vp-font-family-mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
}

.hero-badge {
  position: absolute;
  top: -0.55rem;
  left: 1.2rem;
  z-index: 2;
  padding: 0.25rem 0.55rem;
  border: 2px solid var(--fl-ink);
  border-radius: 999px;
  background: #63dba2;
  color: #062a1b;
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  box-shadow: 2px 2px 0 var(--fl-ink);
  transform: rotate(-3deg);
}

.hero-search {
  grid-column: 1 / -1;
  margin-top: clamp(1.4rem, 3vw, 2.2rem);
}

@media (max-width: 900px) {
  .home-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.8rem;
    padding-top: 0.5rem;
  }

  .hero-stage {
    padding-right: 0.4rem;
  }

  .hero-frame {
    transform: rotate(-1deg);
    box-shadow: 6px 6px 0 var(--fl-ink);
  }

  .hero-sticker {
    right: 0.2rem;
    bottom: -0.9rem;
    width: 6rem;
  }

  .hero-badge {
    left: 0.6rem;
  }

  .hero-dots {
    display: none;
  }
}

@media (max-width: 520px) {
  .hero-title {
    font-size: clamp(2.1rem, 10.5vw, 2.6rem);
  }

  .hero-stat {
    flex: 1 1 4.5rem;
    min-width: 0;
    padding: 0.5rem 0.6rem;
  }

  .hero-stat dt {
    font-size: 1.35rem;
  }

  .hero-actions {
    gap: 0.6rem;
  }

  .hero-btn {
    flex: 1 1 100%;
    justify-content: center;
  }

  .hero-support {
    flex: 1 1 100%;
    margin: 0.15rem 0 0;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-spark,
  .hero-dot {
    animation: none;
  }
}
</style>
