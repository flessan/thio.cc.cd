<script setup>
defineProps({
  src: String
})
</script>

<template>
  <img
    class="blog-cover"
    :src="src"
    width="1200"
    height="630"
    decoding="async"
    fetchpriority="high"
  />
</template>

<style scoped>
.blog-cover {
  display: block;
  width: 100%;
  max-height: 20rem;
  object-fit: cover;
  margin: 1.25rem 0 3.25rem;
  border-radius: 0.85rem;
}

@media (max-width: 768px) {
  .blog-cover {
    margin-top: 1rem;
    margin-bottom: 2rem;
    border-radius: 0.7rem;
  }
}
</style>
