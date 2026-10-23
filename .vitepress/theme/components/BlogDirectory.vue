<script setup lang="ts">
import { computed, ref } from 'vue'
import { blogPosts } from '../../blog-posts'

const search = ref('')
const selectedCategory = ref('all')

const categories = computed(() => [...new Set(blogPosts.map((post) => post.category))])

const filteredPosts = computed(() => {
  const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)

  return blogPosts.filter((post) => {
    const matchesCategory =
      selectedCategory.value === 'all' || post.category === selectedCategory.value

    const searchable = [
      post.title,
      post.description,
      post.category,
      ...post.topics
    ].join(' ').toLocaleLowerCase()
    const matchesSearch = terms.every((term) => searchable.includes(term))

    return matchesCategory && matchesSearch
  })
})

function formatDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function clearFilters() {
  search.value = ''
  selectedCategory.value = 'all'
}
</script>

<template>
  <section class="blog-directory" aria-label="Browse blog articles">
    <div class="directory-controls">
      <label class="search-field">
        <span class="sr-only">Search articles</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Search articles, projects, topics…"
          autocomplete="off"
        />
      </label>

      <label class="category-field">
        <span class="sr-only">Filter by topic</span>
        <select v-model="selectedCategory">
          <option value="all">All topics</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>
    </div>

    <div class="results-row" aria-live="polite">
      <p>{{ filteredPosts.length }} {{ filteredPosts.length === 1 ? 'article' : 'articles' }}</p>
      <button
        v-if="search || selectedCategory !== 'all'"
        class="clear-button"
        type="button"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>

    <div v-if="filteredPosts.length" class="post-grid">
      <article v-for="post in filteredPosts" :key="post.slug" class="post-card">
        <a class="card-image" :href="'/blog/' + post.slug" tabindex="-1" aria-hidden="true">
          <img :src="post.image" alt="" loading="lazy" decoding="async" />
        </a>
        <div class="card-body">
          <div class="card-meta">
            <span class="category-chip">{{ post.category }}</span>
            <time :datetime="post.date">{{ formatDate(post.date) }}</time>
          </div>
          <h2><a :href="'/blog/' + post.slug">{{ post.title }}</a></h2>
          <p class="card-description">{{ post.description }}</p>
          <div class="card-footer">
            <span>{{ post.topics.slice(0, 2).join(' · ') }}</span>
            <a :href="'/blog/' + post.slug" :aria-label="'Read ' + post.title">
              Read article <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <h2>No articles found</h2>
      <p>Try another keyword or choose a different topic.</p>
      <button type="button" @click="clearFilters">Reset search</button>
    </div>
  </section>
</template>

<style scoped>
.blog-directory {
  margin: 2rem 0 3rem;
}
.directory-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 15rem);
  gap: 0.8rem;
}
.search-field,
.category-field {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  box-sizing: border-box;
  min-height: 3.25rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.85rem;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}
.search-field:focus-within,
.category-field:focus-within {
  border-color: var(--vp-c-brand-1);
  outline: 2px solid var(--vp-c-brand-soft);
  outline-offset: 1px;
}
.search-field svg {
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}
.search-field input,
.category-field select {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--vp-c-text-1);
  font: inherit;
}
.search-field input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 1;
}
.category-field select {
  cursor: pointer;
}
.category-field option {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.results-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem 0 0.85rem;
}
.results-row p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
}
.clear-button,
.empty-state button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.6rem;
  padding: 0.45rem 0.7rem;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}
.clear-button:hover,
.empty-state button:hover {
  border-color: var(--vp-c-brand-1);
}
.post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.1rem;
}
.post-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 1rem;
  background: var(--vp-c-bg-alt);
  transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.post-card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.07);
}
.card-image {
  display: block;
  overflow: hidden;
  aspect-ratio: 16 / 7;
  background: var(--vp-c-bg-soft);
}
.card-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease;
}
.post-card:hover .card-image img {
  transform: scale(1.025);
}
.card-body {
  display: flex;
  flex-direction: column;
  min-height: 13.5rem;
  padding: 1rem 1.05rem 1.1rem;
}
.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--vp-c-text-3);
  font-size: 0.76rem;
}
.category-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  max-width: 100%;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 650;
}
.card-body h2 {
  margin: 0.75rem 0 0.45rem;
  font-size: 1.12rem;
  line-height: 1.45;
  letter-spacing: -0.015em;
}
.card-body h2 a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}
.card-body h2 a:hover {
  color: var(--vp-c-brand-1);
}
.card-description {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.7;
}
.card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.7rem;
  margin-top: auto;
  padding-top: 1.2rem;
  font-size: 0.76rem;
}
.card-footer span {
  color: var(--vp-c-text-3);
}
.card-footer a {
  flex: 0 0 auto;
  color: var(--vp-c-brand-1);
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
}
.card-footer a:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.empty-state {
  padding: 2rem 1rem;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 1rem;
  text-align: center;
}
.empty-state h2 {
  margin: 0 0 0.4rem;
}
.empty-state p {
  margin: 0 0 1rem;
  color: var(--vp-c-text-2);
}
@media (max-width: 680px) {
  .directory-controls {
    grid-template-columns: 1fr;
  }
  .post-grid {
    grid-template-columns: 1fr;
  }
  .card-image {
    aspect-ratio: 16 / 8;
  }
  .card-body {
    min-height: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .post-card,
  .card-image img {
    transition: none;
  }
  .post-card:hover,
  .post-card:hover .card-image img {
    transform: none;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}
</style>
