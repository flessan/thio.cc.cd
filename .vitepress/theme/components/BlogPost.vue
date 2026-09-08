<script setup>
defineProps({
  image: String
})
</script>

<template>
  <div class="post-card">
    <img :src="image" alt="" loading="lazy" />
    <div class="post-card-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.post-card {
  display: flex;
  gap: 1.4rem;
  margin: 1.6rem 0;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 0.9rem;
  align-items: stretch;
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.post-card:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 40%, var(--vp-c-border));
  box-shadow: 0 18px 40px -28px rgba(200, 16, 46, 0.35);
}

img {
  width: 220px;
  min-height: 9.5rem;
  object-fit: cover;
  flex-shrink: 0;
}

.post-card-body {
  padding: 1rem 1.2rem 1rem 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.post-card-body :deep(a) {
  color: var(--vp-c-text-1);
  font-weight: 700;
  text-decoration: none;
}

.post-card-body :deep(a:hover) {
  color: var(--vp-c-brand-1);
}

.post-card-body :deep(br) {
  line-height: 1.9;
}

@media (max-width: 768px) {
  img {
    display: none;
  }

  .post-card-body {
    padding: 1rem 1.2rem;
  }
}
</style>
