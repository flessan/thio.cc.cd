<script setup>
defineProps({
  src: String
})
</script>

<template>
  <img :src="src" alt="" />
</template>

<style scoped>
img {
  width: 100%;
  max-height: 22rem;
  object-fit: cover;
  margin-bottom: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--vp-c-border);
}
</style>
