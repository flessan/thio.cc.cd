<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ date: string }>()

const minutes = ref(0)

const formatted = new Date(`${props.date}T12:00:00`).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

// Count the article itself, not the reading controls or navigation around it.
onMounted(() => {
  const root = document.querySelector('.vp-doc')
  if (!root) return

  const article = root.cloneNode(true) as HTMLElement
  article.querySelectorAll(
    '.blog-cover, .post-meta, .post-tools, .post-nav, .post-navigation, .educator-invite, .reading-progress'
  ).forEach((node) => node.remove())

  const words = article.textContent?.trim().match(/\S+/g)?.length ?? 0
  minutes.value = Math.max(1, Math.ceil(words / 200))
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
