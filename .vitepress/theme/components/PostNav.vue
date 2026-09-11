<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

// Blog posts, newest first. Keep in sync with .vitepress/config.mts (feed).
const posts = [
  { slug: '/blog/hello-internet', title: 'hello, internet' },
  { slug: '/blog/slate-de', title: 'the command line is your d3sktop' },
  { slug: '/blog/teksreceh', title: 'teksreceh: a museum of +62 typing' },
  { slug: '/blog/gdips-reborn', title: 'GDIPS: a digital campfire' },
  { slug: '/blog/internet-of-thio', title: 'Many small sites' }
]

const route = useRoute()

const currentPath = computed(() =>
  route.path.replace(/\/+$/, '').replace(/\.html$/, '')
)

const index = computed(() =>
  posts.findIndex((p) => p.slug === currentPath.value)
)

const older = computed(() =>
  index.value >= 0 && index.value < posts.length - 1 ? posts[index.value + 1] : null
)
const newer = computed(() =>
  index.value > 0 ? posts[index.value - 1] : null
)
</script>

<template>
  <nav v-if="index >= 0" class="post-nav" aria-label="Blog post navigation">
    <a v-if="older" :href="older.slug" class="post-nav-link">
      <span class="post-nav-label">← Older post</span>
      <span class="post-nav-title">{{ older.title }}</span>
    </a>
    <span v-else class="post-nav-spacer" aria-hidden="true"></span>
    <a v-if="newer" :href="newer.slug" class="post-nav-link post-nav-right">
      <span class="post-nav-label">Newer post →</span>
      <span class="post-nav-title">{{ newer.title }}</span>
    </a>
  </nav>
</template>

<style scoped>
.post-nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 3rem;
  padding-top: 1.2rem;
}

.post-nav-link {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  text-decoration: none;
  max-width: 46%;
}

.post-nav-right {
  text-align: right;
  margin-left: auto;
}

.post-nav-label {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.post-nav-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.post-nav-title:hover {
  text-decoration: underline;
}
</style>
