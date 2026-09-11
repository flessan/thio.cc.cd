<script setup>
defineProps({
  image: String
})
</script>

<template>
  <div class="container">
    <img :src="image" loading="lazy" decoding="async" alt="" />
    <div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  gap: 2rem;
  margin-top: 3rem;
  margin-bottom: 3rem;
  background-color: var(--vp-c-bg-alt);
  border-radius: 0.5rem;
  align-items: center;
  div {
    padding-right: 1rem;
  }
}
img {
  width: 30%;
  height: 10rem;
  object-fit: cover;
  border-radius: 0.5rem 0 0 0.5rem;
}

/* phones and tablets: keep the cover photo, stacked above the text
   (it used to be hidden entirely below 1260px) */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
    gap: 0;
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
    align-items: stretch;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 12rem;
    border-radius: 0.5rem 0.5rem 0 0;
  }
  .container div {
    padding: 0.9rem 1rem 1rem;
  }
}

@media (max-width: 1260px) {
  .container {
    margin-bottom: 0;
    margin-top: 0;
  }
}
</style>
