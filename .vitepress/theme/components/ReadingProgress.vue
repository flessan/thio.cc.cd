<script setup lang="ts">
/**
 * A chunky reading-progress line for long-form pages.
 *
 * The bar follows the scroll position with a damped animation loop instead of
 * easing towards it per scroll event: one requestAnimationFrame loop writes a
 * single `transform` (never `width` or `left`), so the line glides like a
 * native progress indicator and stops costing anything once it settles.
 * Disabled when the visitor asked for less motion (or set the playground to
 * "Reduced").
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { motionLevel } from '../effects'
import { markHydrated } from '../hydration'

const visible = ref(false)
const track = ref<HTMLElement | null>(null)
const bar = ref<HTMLElement | null>(null)
const tip = ref<HTMLElement | null>(null)

let scrollFrame = 0
let animFrame = 0
let lastTime = 0
let current = 0
let target = 0
let trackWidth = 0
let maxScroll = 0

function paint() {
  if (bar.value) bar.value.style.transform = `scale3d(${current}, 1, 1)`
  if (tip.value) tip.value.style.transform = `translate3d(${current * trackWidth}px, 0, 0)`
}

function step(time: number) {
  // Frame-rate independent damping: the same feel at 60, 90 or 120 Hz.
  const delta = lastTime ? Math.min(64, time - lastTime) : 16.667
  lastTime = time
  const factor = 1 - Math.pow(0.84, delta / 16.667)
  current += (target - current) * factor

  if (Math.abs(target - current) < 0.0005) {
    current = target
    paint()
    animFrame = 0
    lastTime = 0
    return
  }

  paint()
  animFrame = window.requestAnimationFrame(step)
}

function follow() {
  if (motionLevel() === 'off') {
    current = target
    paint()
    return
  }
  if (!animFrame) animFrame = window.requestAnimationFrame(step)
}

function measureTrack() {
  if (!track.value) return
  trackWidth = track.value.getBoundingClientRect().width
  paint()
}

function measure() {
  scrollFrame = 0
  const scrollY = window.scrollY
  if (maxScroll < 260) {
    visible.value = false
    return
  }
  target = Math.min(1, Math.max(0, scrollY / maxScroll))
  visible.value = scrollY > 80
  follow()
}

function onScroll() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(measure)
}

let resizeObserver: ResizeObserver | null = null

function onResize() {
  maxScroll = document.documentElement.scrollHeight - window.innerHeight
  measureTrack()
  measure()
}

onMounted(() => {
  onResize()
  measure()
  markHydrated()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(document.documentElement)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  resizeObserver?.disconnect()
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (animFrame) window.cancelAnimationFrame(animFrame)
})
</script>

<template>
  <div class="rp" :class="{ 'is-visible': visible }" aria-hidden="true">
    <div ref="track" class="rp-track">
      <div ref="bar" class="rp-bar"></div>
      <span ref="tip" class="rp-tip"></span>
    </div>
  </div>
</template>

<style scoped>
.rp {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 70;
  pointer-events: none;
  contain: layout style;
  opacity: 0;
  transition: opacity 200ms linear;
}

.rp.is-visible {
  opacity: 1;
}

.rp-track {
  position: relative;
  height: 3px;
  background: color-mix(in srgb, var(--md-primary) 14%, transparent);
}

.rp-bar {
  position: absolute;
  inset: 0;
  border-radius: 0 2px 2px 0;
  background: var(--md-primary);
  transform: scale3d(0, 1, 1);
  transform-origin: 0 50%;
  will-change: transform;
}

.rp-tip {
  position: absolute;
  top: -2px;
  left: 0;
  width: 7px;
  height: 7px;
  margin-left: -3.5px;
  border-radius: 50%;
  background: var(--md-primary);
  transform: translate3d(0, 0, 0);
  will-change: transform;
}
</style>
