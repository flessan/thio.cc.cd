<script setup lang="ts">
/**
 * A chunky reading-progress line for long-form pages.
 * Animated with anime.js so it eases instead of snapping, and disabled when the
 * visitor asked for less motion (or set the playground to "Still").
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { animate } from 'animejs'
import { motionLevel } from '../effects'
import { markHydrated } from '../hydration'

const visible = ref(false)
const bar = ref<HTMLElement | null>(null)
const tip = ref<HTMLElement | null>(null)
let frame = 0
let current = 0

function render(value: number) {
  if (bar.value) bar.value.style.transform = `scaleX(${value})`
  if (tip.value) tip.value.style.left = `${value * 100}%`
}

function measure() {
  frame = 0
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  if (max < 260) {
    visible.value = false
    return
  }
  const value = Math.min(1, Math.max(0, window.scrollY / max))
  visible.value = window.scrollY > 80
  if (Math.abs(value - current) < 0.002) return

  if (motionLevel() === 'off') {
    current = value
    render(value)
    return
  }

  current = value
  const state = { value: 0 }
  animate(state, {
    value,
    duration: 260,
    ease: 'outQuad',
    onUpdate: () => render(state.value)
  })
}

function onScroll() {
  if (frame) return
  frame = window.requestAnimationFrame(measure)
}

onMounted(() => {
  measure()
  markHydrated()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (frame) window.cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="rp" :class="{ 'is-visible': visible }" aria-hidden="true">
    <div class="rp-track">
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
  opacity: 0;
  transition: opacity 240ms ease;
}

.rp.is-visible {
  opacity: 1;
}

.rp-track {
  position: relative;
  height: 6px;
  background: transparent;
}

.rp-bar {
  position: absolute;
  inset: 0;
  background: var(--fl-accent);
  border-bottom: 2px solid var(--fl-ink);
  transform: scaleX(0);
  transform-origin: 0 50%;
}

.rp-tip {
  position: absolute;
  top: 2px;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border: 2px solid var(--fl-ink);
  border-radius: 50%;
  background: var(--vp-c-bg-elv);
  transition: left 120ms linear;
}
</style>
