<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{
  image?: string
  category?: string
}>()

const broken = ref(false)
const root = ref<HTMLElement | null>(null)

// The browser may fail the image before hydration attaches @error, so sweep
// once the component is alive and fall back to the typographic cover.
onMounted(() => {
  const img = root.value?.querySelector('img')
  if (img && img.complete && img.naturalWidth === 0) broken.value = true
})
</script>

<template>
  <article ref="root" class="container" :class="{ 'has-image': image && !broken }">
    <img
      v-if="image && !broken"
      :src="image"
      loading="lazy"
      decoding="async"
      alt=""
      @error="broken = true"
    />
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
  border-radius: var(--fl-r-md);
  align-items: center;
  overflow: hidden;
  box-shadow: none;
  transition:
    border-color 260ms ease,
    transform 520ms var(--flessan-ease-out),
    background-color 260ms ease,
    box-shadow 520ms var(--flessan-ease-out);
}

.container:hover {
  border-color: var(--vp-c-border);
  transform: translateY(-2px);
  box-shadow: var(--flessan-shadow-sm);
}

img,
.category-cover {
  flex: 0 0 26%;
  width: 26%;
  min-height: 7.5rem;
  height: 7.5rem;
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
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  text-align: center;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.08em;
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
