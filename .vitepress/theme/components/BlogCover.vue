<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  alt?: string
  credit?: string
  licenseUrl?: string
}>(), {
  alt: '',
  credit: '',
  licenseUrl: ''
})
</script>

<template>
  <figure class="blog-cover">
    <img
      class="blog-cover-image"
      :src="src"
      :alt="alt"
      width="1200"
      height="630"
      decoding="async"
      fetchpriority="high"
    />
    <figcaption v-if="credit && licenseUrl" class="blog-cover-credit">
      <a :href="licenseUrl" target="_blank" rel="noopener noreferrer">
        {{ credit }} · Unsplash License
      </a>
    </figcaption>
  </figure>
</template>

<style scoped>
.blog-cover {
  width: 100%;
  margin: 1.25rem 0 3rem;
  overflow: hidden;
  border-radius: 0.9rem;
  background: var(--vp-c-bg-soft);
}

.blog-cover-image {
  display: block;
  width: 100%;
  max-height: 25rem;
  aspect-ratio: 1.91 / 1;
  object-fit: cover;
  margin: 0;
  border-radius: inherit;
  transition: transform 1000ms cubic-bezier(0.16, 1, 0.3, 1), filter 700ms ease;
}

.blog-cover:hover .blog-cover-image {
  transform: scale(1.025);
}

.blog-cover-credit {
  display: flex;
  justify-content: flex-end;
  padding: 0.55rem 0.8rem 0.65rem;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
  line-height: 1.4;
}

.blog-cover-credit a {
  color: inherit;
  text-decoration: none;
  text-underline-offset: 0.2em;
}

.blog-cover-credit a:hover {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .blog-cover {
    margin-top: 1rem;
    margin-bottom: 2rem;
    border-radius: 0.7rem;
  }

  .blog-cover-image {
    max-height: 15rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-cover-image,
  .blog-cover:hover .blog-cover-image {
    transition: none;
    transform: none;
  }
}
</style>
