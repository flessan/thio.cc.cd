<script setup>
import { socials } from '../data'
</script>

<template>
  <div class="social-grid">
    <a
      v-for="s in socials"
      :key="s.name"
      :href="s.url"
      class="social-card"
      :target="s.url.startsWith('mailto:') ? undefined : '_blank'"
      :rel="s.url.startsWith('mailto:') ? undefined : 'noopener'"
    >
      <div class="social-top">
        <span class="social-name">{{ s.name }}</span>
        <span class="social-arrow" aria-hidden="true">↗</span>
      </div>
      <span class="social-handle mono">{{ s.handle }}</span>
      <p v-if="s.note" class="social-note">{{ s.note }}</p>
    </a>
  </div>
</template>

<style scoped>
.social-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.9rem;
}

.social-card {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.85rem;
  background: var(--vp-c-bg-alt);
  padding: 0.95rem 1.05rem;
  text-decoration: none;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.social-card:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 50%, var(--vp-c-border));
  transform: translateY(-2px);
}

.social-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.social-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}

.social-arrow {
  color: var(--vp-c-text-3);
  transition: transform 0.18s ease, color 0.18s ease;
}

.social-card:hover .social-arrow {
  transform: translate(2px, -2px);
  color: var(--vp-c-brand-1);
}

.social-handle {
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}

.social-note {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  line-height: 1.45;
}
</style>
