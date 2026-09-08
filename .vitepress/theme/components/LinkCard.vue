<script setup>
defineProps({
  item: { type: Object, required: true }
})
</script>

<template>
  <a class="link-card" :href="item.url" target="_blank" rel="noopener">
    <div class="link-card-top">
      <span v-if="item.tag" class="link-tag mono">{{ item.tag }}</span>
      <span class="link-arrow" aria-hidden="true">↗</span>
    </div>
    <h3 class="link-title mono">{{ item.title }}</h3>
    <p class="link-desc">{{ item.desc }}</p>
  </a>
</template>

<style scoped>
.link-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.9rem;
  background: var(--vp-c-bg-alt);
  padding: 1.2rem 1.3rem;
  text-decoration: none;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.link-card:hover {
  border-color: color-mix(in srgb, var(--flessan-blue) 55%, var(--vp-c-border));
  transform: translateY(-2px);
  box-shadow: 0 18px 40px -26px rgba(30, 156, 215, 0.4);
}

.link-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.link-tag {
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--flessan-blue);
  border: 1px solid color-mix(in srgb, var(--flessan-blue) 40%, transparent);
  background: color-mix(in srgb, var(--flessan-blue) 10%, transparent);
  border-radius: 99px;
  padding: 0.14rem 0.6rem;
}

.link-arrow {
  color: var(--vp-c-text-3);
  font-size: 1rem;
  transition: transform 0.18s ease, color 0.18s ease;
}

.link-card:hover .link-arrow {
  transform: translate(2px, -2px);
  color: var(--flessan-blue);
}

.link-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  word-break: break-all;
}

.link-desc {
  margin: 0;
  font-size: 0.87rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}
</style>
