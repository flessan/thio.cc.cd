<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { blogPosts } from '../../blog-posts'

const posts = blogPosts.map((post) => ({
  slug: '/blog/' + post.slug,
  title: post.title,
  category: post.category,
  topics: post.topics
}))

const route = useRoute()
const currentPath = computed(() =>
  route.path.replace(/\/+$/, '').replace(/\.html$/, '')
)
const index = computed(() => posts.findIndex((post) => post.slug === currentPath.value))
const currentPost = computed(() => posts[index.value] ?? null)

const older = computed(() =>
  index.value >= 0 && index.value < posts.length - 1 ? posts[index.value + 1] : null
)
const newer = computed(() => (index.value > 0 ? posts[index.value - 1] : null))

const related = computed(() => {
  const current = currentPost.value
  if (!current) return []

  return posts
    .filter((post) => post.slug !== current.slug)
    .map((post) => ({
      post,
      overlap: post.topics.filter((topic) => current.topics.includes(topic)).length
    }))
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 2)
    .map((item) => item.post)
})
</script>

<template>
  <div v-if="index >= 0" class="post-navigation">
    <nav class="post-nav" aria-label="Blog post navigation">
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

    <section v-if="related.length" class="related-posts" aria-labelledby="related-posts-title">
      <h2 id="related-posts-title">Related reading</h2>
      <div class="related-grid">
        <a v-for="post in related" :key="post.slug" :href="post.slug" class="related-card">
          <span class="related-category">{{ post.category }}</span>
          <span class="related-title">{{ post.title }}</span>
          <span class="related-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.post-navigation {
  margin-top: 3rem;
}
.post-nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--vp-c-divider);
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
  text-underline-offset: 0.18em;
}
.related-posts {
  margin-top: 2rem;
}
.related-posts h2 {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
}
.related-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}
.related-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  padding: 1rem;
  padding-right: 2.2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.8rem;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 160ms ease, transform 160ms ease;
}
.related-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}
.related-category {
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
}
.related-title {
  font-weight: 650;
  line-height: 1.45;
}
.related-arrow {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  color: var(--vp-c-brand-1);
}
@media (max-width: 640px) {
  .related-grid {
    grid-template-columns: 1fr;
  }
  .post-nav-title {
    font-size: 0.84rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .related-card {
    transition: none;
  }
  .related-card:hover {
    transform: none;
  }
}
</style>
