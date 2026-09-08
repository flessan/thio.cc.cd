<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ date: string }>()

const minutes = ref(0)

const formatted = new Date(`${props.date}T00:00:00`).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

// Reading time is computed from the rendered article, so it never drifts
onMounted(() => {
  const el = document.querySelector('.vp-doc')
  if (el) {
    const words = el.textContent?.trim().split(/\s+/).length ?? 0
    minutes.value = Math.max(1, Math.round(words / 200))
  }
})
</script>

<template>
  <p class="post-meta">
    {{ formatted }}<template v-if="minutes"> · {{ minutes }} min read</template>
  </p>
</template>

<style scoped>
.post-meta {
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
  margin: -1.6rem 0 2.4rem;
}
</style>
