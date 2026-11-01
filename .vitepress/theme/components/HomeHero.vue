<script setup lang="ts">
import { computed } from 'vue'
import { blogPosts } from '../../blog-posts'

const postCount = computed(() => blogPosts.length)
</script>

<template>
  <section class="home-hero" data-hero>
    <div class="hero-atmosphere" aria-hidden="true">
      <span class="hero-orb hero-orb-a"></span>
      <span class="hero-orb hero-orb-b"></span>
      <span class="hero-grid"></span>
    </div>

    <div class="hero-copy">
      <p class="hero-eyebrow">
        <span class="hero-dot" aria-hidden="true"></span>
        <span class="hero-eyebrow-text">Open source · Banjarmasin, Indonesia</span>
      </p>

      <h1 class="hero-title">
        <span class="hero-line">
          Hi, I'm <span class="hero-name">Flessan</span>.
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
        <a class="hero-btn hero-btn-ghost" href="/projects">
          Explore projects
        </a>
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
    </div>

    <div class="hero-stage">
      <figure class="hero-frame">
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
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: clamp(1.5rem, 4vw, 3.75rem);
  align-items: center;
  margin: 0 0 2.5rem;
  padding: clamp(1.25rem, 3.5vw, 2.5rem) 0 0.5rem;
  isolation: isolate;
}

/* Ambient colour + dotted texture behind the hero. */
.hero-atmosphere {
  position: absolute;
  inset: -8rem -6rem -5rem;
  z-index: -1;
  pointer-events: none;
}

.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(6px);
  opacity: 0.9;
}

.hero-orb-a {
  top: -10%;
  left: -12%;
  width: 34rem;
  height: 34rem;
  background: radial-gradient(
    circle at 45% 45%,
    var(--flessan-halo-a),
    transparent 66%
  );
  animation: hero-drift-a 18s ease-in-out infinite alternate;
}

.hero-orb-b {
  right: -16%;
  bottom: -22%;
  width: 30rem;
  height: 30rem;
  background: radial-gradient(
    circle at 50% 50%,
    var(--flessan-halo-b),
    transparent 64%
  );
  animation: hero-drift-b 22s ease-in-out infinite alternate;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    color-mix(in srgb, var(--flessan-accent-ink) 22%, transparent) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
  opacity: 0.4;
  -webkit-mask-image: radial-gradient(
    70% 70% at 30% 40%,
    #000 10%,
    transparent 78%
  );
  mask-image: radial-gradient(70% 70% at 30% 40%, #000 10%, transparent 78%);
}

@keyframes hero-drift-a {
  from {
    transform: translate3d(-2%, -1%, 0) scale(1);
  }
  to {
    transform: translate3d(5%, 4%, 0) scale(1.12);
  }
}

@keyframes hero-drift-b {
  from {
    transform: translate3d(2%, 3%, 0) scale(1.05);
  }
  to {
    transform: translate3d(-6%, -4%, 0) scale(0.95);
  }
}

/* Copy column ------------------------------------------------------------- */
.hero-copy {
  position: relative;
  min-width: 0;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 1.05rem;
  color: var(--vp-c-text-3);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1.4;
  text-transform: uppercase;
}

.hero-eyebrow-text {
  min-width: 0;
}

.hero-dot {
  position: relative;
  flex: 0 0 auto;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--flessan-accent-ink);
  animation: flessan-pulse 3.2s ease-out infinite;
}

.hero-title {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: clamp(2.1rem, 4.6vw, 3.35rem);
  font-weight: 800;
  letter-spacing: -0.048em;
  line-height: 1.08;
  text-wrap: balance;
}

.hero-line {
  display: block;
}

.hero-line-sub {
  margin-top: 0.28em;
  color: var(--vp-c-text-2);
  font-size: 0.64em;
  font-weight: 620;
  letter-spacing: -0.035em;
  line-height: 1.24;
}

.hero-name {
  background: linear-gradient(
    112deg,
    var(--flessan-accent-ink) 4%,
    color-mix(in srgb, var(--flessan-accent-ink) 55%, #4aa3c4) 62%,
    color-mix(in srgb, var(--flessan-accent-ink) 72%, #f0c674) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.hero-scribble {
  display: block;
  width: min(15rem, 62%);
  height: 12px;
  margin: 0.5rem 0 0 0.15rem;
  overflow: visible;
  color: var(--flessan-accent-ink);
  opacity: 0.75;
}

.hero-scribble path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2.4;
}

.hero-lead {
  max-width: 34rem;
  margin: 1.15rem 0 0;
  color: var(--vp-c-text-2);
  font-size: clamp(0.95rem, 1.4vw, 1.02rem);
  line-height: 1.75;
}

.hero-lead a {
  color: var(--flessan-accent-ink);
  font-weight: 600;
  text-decoration-color: var(--flessan-accent-line);
  text-underline-offset: 0.2em;
}

.hero-lead a:hover {
  text-decoration-color: currentColor;
}

/* Actions ----------------------------------------------------------------- */
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1.6rem;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.85rem;
  padding: 0.65rem 1.05rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.87rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  line-height: 1;
  text-decoration: none !important;
  transition:
    color 200ms ease,
    background-color 240ms ease,
    border-color 240ms ease,
    box-shadow 360ms var(--flessan-ease-out),
    transform 460ms var(--flessan-ease-out);
}

.hero-btn svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  transition: transform 380ms var(--flessan-ease-out);
}

.hero-btn-primary {
  border-color: color-mix(in srgb, var(--flessan-accent-fill) 72%, #000000);
  background: var(--flessan-accent-fill);
  color: var(--flessan-on-accent) !important;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.16) inset,
    0 14px 28px -16px color-mix(in srgb, var(--flessan-accent-fill) 82%, transparent);
}

.hero-btn-primary:hover {
  background: var(--flessan-accent-fill-hover);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.2) inset,
    0 20px 36px -16px color-mix(in srgb, var(--flessan-accent-fill) 78%, transparent);
  transform: translateY(-2px);
}

.hero-btn-primary:hover svg {
  transform: translateX(3px);
}

.hero-btn-primary:active {
  transform: translateY(0) scale(0.985);
  background: var(--flessan-accent-fill-active);
}

.hero-btn-ghost {
  border-color: var(--flessan-card-border);
  background: color-mix(in srgb, var(--vp-c-bg-elv) 72%, transparent);
  color: var(--vp-c-text-1) !important;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.hero-btn-ghost:hover {
  border-color: var(--flessan-accent-line);
  background: var(--vp-c-bg-elv);
  color: var(--flessan-accent-ink) !important;
  box-shadow: var(--flessan-shadow-sm);
  transform: translateY(-2px);
}

.hero-btn-ghost:active {
  transform: translateY(0) scale(0.99);
}

.hero-support {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: 0.15rem;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  font-weight: 550;
  text-decoration-color: transparent;
  text-underline-offset: 0.22em;
  transition: color 180ms ease, text-decoration-color 180ms ease;
}

.hero-support:hover {
  color: var(--flessan-accent-ink);
  text-decoration-color: currentColor;
}

/* Stats ------------------------------------------------------------------- */
.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.9rem;
  margin: 2.1rem 0 0;
  padding-top: 1.15rem;
  border-top: 1px solid var(--vp-c-divider);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.hero-stat dt {
  color: var(--vp-c-text-1);
  font-size: 1.32rem;
  font-weight: 780;
  letter-spacing: -0.045em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.hero-stat dd {
  margin: 0;
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Artwork ----------------------------------------------------------------- */
.hero-stage {
  position: relative;
  min-width: 0;
  padding-bottom: 1.2rem;
}

.hero-frame {
  position: relative;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--flessan-card-border);
  border-radius: var(--flessan-radius-xl);
  background: var(--vp-c-bg-soft);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.4) inset,
    var(--flessan-shadow-lg);
  transform: rotate(-0.6deg);
  transition:
    transform 700ms var(--flessan-ease-out),
    box-shadow 700ms var(--flessan-ease-out);
}

.dark .hero-frame {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    var(--flessan-shadow-lg);
}

.hero-frame:hover {
  transform: rotate(0deg) translateY(-3px);
}

.hero-frame-image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1.75 / 1;
  object-fit: cover;
  object-position: center 42%;
  transform: scale(1.015);
  transition: transform 1.2s var(--flessan-ease-out);
}

.hero-frame:hover .hero-frame-image {
  transform: scale(1.055);
}

.hero-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, transparent 52%, rgba(6, 18, 11, 0.58) 100%),
    linear-gradient(
      120deg,
      color-mix(in srgb, var(--flessan-accent-ink) 16%, transparent),
      transparent 55%
    );
  pointer-events: none;
}

.hero-frame-caption {
  position: absolute;
  inset: auto 0.9rem 0.9rem;
  z-index: 1;
  display: flex;
  justify-content: flex-start;
}

.frame-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  padding: 0.4rem 0.62rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(9, 24, 15, 0.58);
  color: #f2fbf4;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  backdrop-filter: blur(10px) saturate(150%);
}

.frame-chip-dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 50%;
  background: #8ef0b3;
  box-shadow: 0 0 0 3px rgba(142, 240, 179, 0.22);
}

.hero-sticker {
  position: absolute;
  right: -0.55rem;
  bottom: -0.35rem;
  z-index: 2;
  display: grid;
  place-items: center;
  gap: 0.15rem;
  width: 6.4rem;
  padding: 0.5rem 0.5rem 0.45rem;
  border: 1px solid var(--flessan-card-border);
  border-radius: 1.3rem;
  background: var(--flessan-card);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--flessan-shadow-md);
  transform: rotate(5deg);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.hero-sticker:active {
  cursor: grabbing;
}

.hero-sticker img {
  width: 4.9rem;
  height: 4.9rem;
  border-radius: 1rem;
  object-fit: cover;
  pointer-events: none;
}

.hero-sticker span {
  color: var(--vp-c-text-2);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
  pointer-events: none;
}

/* Responsive -------------------------------------------------------------- */
@media (max-width: 960px) {
  .home-hero {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .hero-stage {
    width: min(100%, 34rem);
    margin-inline: auto;
  }

  .hero-frame-image {
    aspect-ratio: 16 / 9;
  }
}

@media (max-width: 560px) {
  .home-hero {
    gap: 1.6rem;
    padding-top: 0.75rem;
  }

  .hero-eyebrow {
    font-size: 0.64rem;
    letter-spacing: 0.1em;
  }

  .hero-title {
    font-size: clamp(1.85rem, 9.4vw, 2.5rem);
  }

  .hero-actions {
    width: 100%;
  }

  .hero-btn {
    flex: 1 1 auto;
  }

  .hero-support {
    flex: 1 1 100%;
    margin-top: 0.15rem;
  }

  .hero-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 1.7rem;
  }

  .hero-stat dt {
    font-size: 1.18rem;
  }

  .hero-stat dd {
    font-size: 0.6rem;
    letter-spacing: 0.04em;
  }

  .hero-sticker {
    right: 0.35rem;
    bottom: -0.9rem;
    width: 5.4rem;
  }

  .hero-sticker img {
    width: 4.1rem;
    height: 4.1rem;
  }

  .hero-scribble {
    width: 55%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-orb,
  .hero-dot {
    animation: none;
  }

  .hero-frame,
  .hero-frame-image,
  .hero-sticker {
    transition: none;
    transform: rotate(-0.6deg);
  }

  .hero-frame:hover,
  .hero-frame:hover .hero-frame-image {
    transform: rotate(0deg);
  }

  .hero-sticker {
    transform: rotate(5deg);
  }
}
</style>
