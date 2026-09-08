<script setup>
defineProps({
  num: { type: String, required: true },
  label: { type: String, required: true },
  href: { type: String, default: '' }
})
</script>

<template>
  <header class="section-head">
    <p class="section-index mono">
      {{ num }} / {{ label }}
      <a v-if="href" :href="href" class="section-more">{{ label }} →</a>
    </p>
    <h2 class="section-title"><slot /></h2>
    <p v-if="$slots.desc" class="section-desc">
      <slot name="desc" />
    </p>
  </header>
</template>

<style scoped>
.section-head {
  margin: 0 0 1.6rem;
}

.section-index {
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  margin: 0 0 0.5rem;
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.section-more {
  margin-left: auto;
  color: var(--vp-c-text-3);
  text-decoration: none;
  letter-spacing: 0.02em;
  font-size: 0.72rem;
}

.section-more:hover {
  color: var(--vp-c-brand-1);
}

.section-title {
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0;
  color: var(--vp-c-text-1);
}

.section-desc {
  margin: 0.6rem 0 0;
  color: var(--vp-c-text-2);
  max-width: 42rem;
  line-height: 1.65;
}
</style>
