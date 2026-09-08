<script setup>
defineProps({
  items: { type: Array, required: true }
})
</script>

<template>
  <ol class="timeline">
    <li v-for="item in items" :key="item.date + item.title" class="timeline-item">
      <p class="timeline-date mono">{{ item.date }}</p>
      <div class="timeline-body">
        <h3 class="timeline-title">{{ item.title }}</h3>
        <p class="timeline-text">{{ item.text }}</p>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 6.4rem;
  top: 0.4rem;
  bottom: 0.4rem;
  width: 2px;
  background: linear-gradient(
    to bottom,
    var(--vp-c-brand-3),
    color-mix(in srgb, var(--vp-c-brand-3) 25%, var(--vp-c-border))
  );
}

@media (max-width: 640px) {
  .timeline::before {
    left: 0.4rem;
  }
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 6rem 1fr;
  gap: 1.4rem;
  padding: 0 0 2.1rem;
}

@media (max-width: 640px) {
  .timeline-item {
    grid-template-columns: 1fr;
    gap: 0.35rem;
    padding-left: 1.6rem;
  }
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 6.4rem;
  top: 0.42rem;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--vp-c-bg);
  border: 2.5px solid var(--vp-c-brand-3);
  transform: translateX(-50%);
  z-index: 1;
}

@media (max-width: 640px) {
  .timeline-item::before {
    left: 0.4rem;
  }
}

.timeline-date {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-align: right;
}

@media (max-width: 640px) {
  .timeline-date {
    text-align: left;
  }
}

.timeline-title {
  margin: 0 0 0.3rem;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.timeline-text {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.92rem;
  line-height: 1.65;
  max-width: 40rem;
}
</style>
