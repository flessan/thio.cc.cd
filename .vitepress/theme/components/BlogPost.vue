<script setup lang="ts">
defineProps<{
  image?: string
  category?: string
}>()
</script>

<template>
  <article class="container" :class="{ 'has-image': image }">
    <img v-if="image" :src="image" loading="lazy" decoding="async" alt="" />
    <div v-else class="category-cover" aria-hidden="true">
      <span>{{ category || 'BUILD NOTES' }}</span>
    </div>
    <div class="post-content">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.container {
  display: flex;
  gap: 1.5rem;
  margin: 1.25rem 0;
  background-color: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.85rem;
  align-items: center;
  overflow: hidden;
  transition:
    border-color 280ms ease,
    transform 520ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 280ms ease,
    box-shadow 520ms cubic-bezier(0.16, 1, 0.3, 1);
}

.container:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-4px);
  box-shadow: 0 14px 32px rgba(20, 35, 25, 0.10);
}

img,
.category-cover {
  flex: 0 0 30%;
  width: 30%;
  min-height: 10rem;
  height: 10rem;
  object-fit: cover;
}

img {
  display: block;
  transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
}

.container:hover img {
  transform: scale(1.045);
}

.category-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 1.25rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  text-align: center;
  font-size: 0.78rem;
  font-weight: 750;
  letter-spacing: 0.09em;
  line-height: 1.5;
  text-transform: uppercase;
}

.post-content {
  min-width: 0;
  flex: 1;
  padding: 1.2rem 1.35rem 1.2rem 0;
}

.post-content :deep(p) {
  margin: 0.35rem 0;
  line-height: 1.65;
}

.post-content :deep(p:first-child) {
  margin-top: 0;
}

.post-content :deep(p:last-child) {
  margin-bottom: 0;
}

.post-content :deep(a) {
  text-underline-offset: 0.18em;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    margin: 1rem 0;
  }

  img,
  .category-cover {
    flex: none;
    width: 100%;
    height: auto;
    min-height: 5.5rem;
    max-height: 12rem;
  }

  .category-cover {
    padding: 1.1rem;
  }

  .post-content {
    padding: 1rem 1.1rem 1.1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .container {
    transition: none;
  }

  .container:hover {
    transform: none;
  }
}
</style>
