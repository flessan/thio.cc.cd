<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { blogPosts } from '../../blog-posts'
import { motionLevel } from '../effects'
import SearchDock from './SearchDock.vue'

const postCount = computed(() => blogPosts.length)

const art = ref<HTMLElement | null>(null)

const clock = ref('--:--')
let timer: number | undefined
let tiltFrame = 0
let tiltCleanup: (() => void) | null = null

/**
 * Pointer-driven 3D card.
 *
 * Two CSS custom properties capture the pointer position; every layer (the
 * frame, the photo inside it, the ambient blobs, the floating shadow) reads
 * them through its own transform. A single damped animation frame writes those
 * two variables, so the whole scene moves as one composited group instead of a
 * dozen competing animations. Fine pointers only, and never when motion is off
 * or the visitor asked for less. Touch pointers are ignored one by one rather
 * than gated up-front, so hybrid laptops keep the effect.
 */
function installTilt() {
  const element = art.value
  if (!element) return
  if (typeof window === 'undefined') return
  if (motionLevel() === 'off') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const max = motionLevel() === 'playful' ? 10 : 6
  const target = { x: 0, y: 0, hover: 0 }
  const current = { x: 0, y: 0, hover: 0 }
  let last = 0

  const write = () => {
    element.style.setProperty('--tilt-x', `${(-current.y * max).toFixed(2)}deg`)
    element.style.setProperty('--tilt-y', `${(current.x * max).toFixed(2)}deg`)
    element.style.setProperty('--shift-x', `${(current.x * 16).toFixed(2)}px`)
    element.style.setProperty('--shift-y', `${(current.y * 16).toFixed(2)}px`)
    element.style.setProperty('--glare-x', `${(50 + current.x * 34).toFixed(2)}%`)
    element.style.setProperty('--glare-y', `${(46 + current.y * 30).toFixed(2)}%`)
    element.style.setProperty('--glare-o', current.hover.toFixed(3))
    element.style.setProperty('--lift', (current.hover * 1).toFixed(3))
  }

  const step = (now: number) => {
    const delta = last ? Math.min(64, now - last) : 16.667
    last = now
    const ease = 1 - Math.pow(0.86, delta / 16.667)

    current.x += (target.x - current.x) * ease
    current.y += (target.y - current.y) * ease
    current.hover += (target.hover - current.hover) * ease

    const settled =
      Math.abs(target.x - current.x) < 0.0008 &&
      Math.abs(target.y - current.y) < 0.0008 &&
      Math.abs(target.hover - current.hover) < 0.004

    if (settled) {
      current.x = target.x
      current.y = target.y
      current.hover = target.hover
    }

    write()

    if (settled) {
      tiltFrame = 0
      last = 0
      return
    }
    tiltFrame = window.requestAnimationFrame(step)
  }

  const wake = () => {
    if (!tiltFrame) tiltFrame = window.requestAnimationFrame(step)
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    const rect = element.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1))
    target.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
    target.hover = 1
    wake()
  }

  const rest = () => {
    target.x = 0
    target.y = 0
    target.hover = 0
    wake()
  }

  element.addEventListener('pointermove', onMove, { passive: true })
  element.addEventListener('pointerleave', rest)
  element.addEventListener('pointercancel', rest)
  window.addEventListener('blur', rest)

  tiltCleanup = () => {
    element.removeEventListener('pointermove', onMove)
    element.removeEventListener('pointerleave', rest)
    element.removeEventListener('pointercancel', rest)
    window.removeEventListener('blur', rest)
    if (tiltFrame) window.cancelAnimationFrame(tiltFrame)
    tiltFrame = 0
    ;['--tilt-x', '--tilt-y', '--shift-x', '--shift-y', '--glare-x', '--glare-y', '--glare-o', '--lift'].forEach(
      (name) => element.style.removeProperty(name)
    )
  }
}

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
  installTilt()
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  tiltCleanup?.()
  tiltCleanup = null
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

      <div ref="art" class="hero-art">
        <div class="hero-shapes" aria-hidden="true">
          <span class="hero-shape hero-shape-a" data-hero-shape></span>
          <span class="hero-shape hero-shape-b" data-hero-shape></span>
          <span class="hero-shape hero-shape-c" data-hero-shape></span>
        </div>

        <figure class="hero-figure">
          <span class="hero-shade" aria-hidden="true"></span>
          <span class="hero-glare" aria-hidden="true"></span>
          <span class="hero-zoom" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.4" />
              <path d="M15.8 15.8 21 21M11 8.6v4.8M8.6 11h4.8" />
            </svg>
          </span>
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
  /* A shallow stage: the frame, its contents and the blobs behind it all read
     the same two pointer variables, so the whole scene shares one vanishing
     point and one animation frame. */
  perspective: 1300px;
  perspective-origin: 50% 44%;
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  --shift-x: 0px;
  --shift-y: 0px;
  --glare-x: 50%;
  --glare-y: 46%;
  --glare-o: 0;
  --lift: 0;
}

/* Soft contact shadow that slides out from under the card as it tilts — the
   cheapest possible cue that the frame is floating above the page. */
.hero-art::after {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 28% 14% 3% 18%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--md-on-surface) 18%, transparent);
  filter: blur(24px);
  opacity: calc(0.26 + var(--lift) * 0.26);
  transform: translate3d(calc(var(--shift-x) * -1.4), calc(var(--shift-y) * -1.4 + 10px), 0) scale(calc(0.94 + var(--lift) * 0.07));
  pointer-events: none;
  will-change: transform;
}

.hero-shapes {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* Counter-move against the pointer: blobs drift one way while the frame
     leans the other, which reads as depth rather than a flat tilt. */
  transform: translate3d(calc(var(--shift-x) * -0.55), calc(var(--shift-y) * -0.55), 0);
  will-change: transform;
}

.hero-shape {
  position: absolute;
  display: block;
  z-index: 0;
  /* Ambient loops only ever move transforms, so promote them once and let the
     compositor do the work instead of repainting the art panel. */
  will-change: transform;
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
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) translate3d(0, 0, calc(var(--lift) * 14px));
  transform-origin: 50% 50%;
  will-change: transform;
  transition: box-shadow var(--md-duration-medium) var(--md-ease-standard);
}

.hero-art:hover .hero-figure,
.hero-art:focus-within .hero-figure {
  box-shadow: var(--md-elevation-4);
}

/* The ring catches the "light" once the card leans, so the frame never reads
   as a flat rectangle pasted on the page. */
.hero-figure::after {
  content: '';
  position: absolute;
  z-index: 4;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  opacity: calc(var(--lift) * 0.9);
  pointer-events: none;
}

.hero-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Oversized and shifted the opposite way: the picture slides inside its own
     window like a layered print, which is what sells the parallax. */
  transform: scale(1.1) translate3d(calc(var(--shift-x) * -0.9), calc(var(--shift-y) * -0.9), 0);
  will-change: transform;
}

/* A pool of light under the pointer and a matching pool of shade in the far
   corner. Two flat, blurred discs — no gradients, no blend modes — is enough
   for the eye to read a glossy surface catching the light. */
.hero-glare,
.hero-shade {
  position: absolute;
  z-index: 3;
  width: 62%;
  aspect-ratio: 1;
  border-radius: 50%;
  filter: blur(30px);
  transform: translate3d(-50%, -50%, 0);
  pointer-events: none;
  will-change: opacity;
}

.hero-glare {
  top: var(--glare-y);
  left: var(--glare-x);
  background: #fff;
  opacity: calc(var(--glare-o) * 0.34);
}

.hero-shade {
  top: calc(100% - var(--glare-y));
  left: calc(100% - var(--glare-x));
  background: var(--md-on-surface);
  opacity: calc(var(--glare-o) * 0.14);
}

.hero-zoom {
  position: absolute;
  z-index: 5;
  top: 0.75rem;
  right: 0.75rem;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--md-surface-container-lowest);
  color: var(--md-on-surface);
  box-shadow: var(--md-elevation-2);
  opacity: 0;
  transform: translate3d(0, -6px, 0) scale(0.9);
  transition:
    opacity var(--md-duration-medium) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-emphasized);
  pointer-events: none;
}

.hero-zoom svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
}

.hero-art:hover .hero-zoom,
.hero-art:focus-within .hero-zoom {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

.hero-badge {
  position: absolute;
  z-index: 4;
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

/* Expressive mode: a very slow breath on the card. It animates the individual
   `scale` property, so it composes with the pointer tilt instead of replacing
   it — one transform pipeline, no fighting. */
html[data-motion='playful'] .hero-figure {
  animation: hero-breathe 9.6s 2.4s ease-in-out infinite alternate;
}

@keyframes hero-breathe {
  from {
    scale: 1;
  }
  to {
    scale: 1.028;
  }
}

@media (max-width: 560px) {
  .hero-zoom {
    top: 0.5rem;
    right: 0.5rem;
    width: 30px;
    height: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-chip-dot,
  .hero-live,
  .hero-figure {
    animation: none;
  }

  .hero-figure,
  .hero-photo,
  .hero-glare,
  .hero-shade,
  .hero-shapes,
  .hero-art::after {
    transform: none;
    will-change: auto;
  }

  .hero-figure .hero-photo {
    transform: none;
  }
}

/* Motion turned off in the site settings: keep the flat, still composition. */
:global(html[data-motion='off']) .hero-figure,
:global(html[data-motion='off']) .hero-photo,
:global(html[data-motion='off']) .hero-glare,
:global(html[data-motion='off']) .hero-shade,
:global(html[data-motion='off']) .hero-shapes,
:global(html[data-motion='off']) .hero-art::after {
  transform: none;
  will-change: auto;
}
</style>
