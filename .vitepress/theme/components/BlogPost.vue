<script setup lang="ts">
defineProps<{
  image?: string
  category?: string
}>()
</script>

<template>
  <article class="container" :class="{ 'has-image': image }">
    <div v-if="image" class="post-image" aria-hidden="true">
      <img :src="image" loading="lazy" decoding="async" alt="" />
    </div>
    <div v-else class="category-cover" aria-hidden="true">
      <span>{{ category || 'BUILD NOTES' }}</span>
    </div>
    <div class="post-content">
      <p v-if="category" class="post-category">{{ category }}</p>
      <slot />
    </div>
    <span class="post-arrow" aria-hidden="true">↗</span>
  </article>
</template>

<style scoped>
.container {
  position: relative;
  display: grid;
  grid-template-columns: minmax(190px, 30%) minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
  min-width: 0;
  margin: 1rem 0;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 17px;
  background: var(--vp-c-bg-alt);
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease, background-color 220ms ease, box-shadow 260ms ease;
}

.container:hover {
  transform: translateY(-3px);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 13px 28px rgba(20, 35, 25, 0.075);
}

.post-image,
.category-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 175px;
  overflow: hidden;
  background: var(--vp-c-brand-soft);
}

img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 175px;
  object-fit: cover;
  transition: transform 720ms cubic-bezier(0.16, 1, 0.3, 1);
}

.container:hover img {
  transform: scale(1.045);
}

.category-cover {
  box-sizing: border-box;
  padding: 1.25rem;
  color: var(--vp-c-brand-1);
  text-align: center;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1.55;
  text-transform: uppercase;
}

.post-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 1.25rem 2.1rem 1.25rem 1.4rem;
}

.post-category {
  margin: 0 0 0.45rem;
  color: var(--vp-c-brand-1);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;
}

.post-content :deep(p) {
  margin: 0.3rem 0;
  color: var(--vp-c-text-2);
  font-size: 0.84rem;
  line-height: 1.65;
}

.post-content :deep(p strong) {
  display: inline-block;
  color: var(--vp-c-text-1);
  font-size: 1.04rem;
  font-weight: 740;
  letter-spacing: -0.025em;
  line-height: 1.4;
}

.post-content :deep(p strong a) {
  color: inherit;
  text-decoration: none;
  text-underline-offset: 0.2em;
  transition: color 180ms ease;
}

.post-content :deep(p strong a:hover) {
  color: var(--vp-c-brand-1);
}

.post-content :deep(p:last-child) {
  color: var(--vp-c-text-3);
  font-size: 0.72rem;
}

.post-arrow {
  position: absolute;
  top: 1rem;
  right: 1.15rem;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
  opacity: 0;
  transform: translate(-3px, 3px);
  transition: opacity 180ms ease, transform 220ms ease, color 180ms ease;
}

.container:hover .post-arrow {
  color: var(--vp-c-brand-1);
  opacity: 1;
  transform: translate(0, 0);
}

@media (max-width: 680px) {
  .container {
    grid-template-columns: 1fr;
    border-radius: 14px;
  }

  .post-image,
  .category-cover {
    min-height: 0;
    max-height: 165px;
    aspect-ratio: 16 / 7;
  }

  img {
    min-height: 0;
    max-height: 165px;
  }

  .post-content {
    padding: 1rem 1.05rem 1.1rem;
  }

  .post-arrow {
    top: auto;
    right: 1rem;
    bottom: 1rem;
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .container,
  img,
  .post-arrow,
  .post-content :deep(p strong a) {
    transition: none;
  }

  .container:hover,
  .container:hover img {
    transform: none;
  }
}
</style>
