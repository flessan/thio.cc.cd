<script setup lang="ts">
import { computed, ref } from 'vue'
import { blogPosts } from '../../blog-posts'

const search = ref('')
const selectedCategory = ref('all')

const categories = computed(() => [...new Set(blogPosts.map((post) => post.category))])
const filteredPosts = computed(() => {
  const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)

  return blogPosts.filter((post) => {
    const matchesCategory = selectedCategory.value === 'all' || post.category === selectedCategory.value
    const searchable = [post.title, post.description, post.category, ...post.topics].join(' ').toLocaleLowerCase()
    return matchesCategory && terms.every((term) => searchable.includes(term))
  })
})

const featuredPost = computed(() => filteredPosts.value[0] ?? null)
const remainingPosts = computed(() => filteredPosts.value.slice(1))

function formatDate(post: (typeof blogPosts)[number]) {
  return new Date(post.date + 'T12:00:00').toLocaleDateString(post.language === 'id' ? 'id-ID' : 'en-US', {
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
  <main class="blog-archive" aria-labelledby="blog-title">
    <header class="archive-hero">
      <div class="hero-copy">
        <p class="eyebrow"><span class="eyebrow-dot"></span> FLESSAN'S BLOG</p>
        <h1 id="blog-title">Stuff I build. Things I learn.</h1>
        <p class="hero-description">
          Project logs, ideas from the workbench, and small corners of internet culture.
          Mostly English, sometimes Indonesian, always written from the process of actually building things.
        </p>
        <div class="hero-links">
          <a class="hero-link primary-link" href="/feed.xml">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17">
              <path d="M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
              <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
            </svg>
            Subscribe via RSS
          </a>
          <a class="hero-link" href="https://t.me/chfless" target="_blank" rel="noreferrer">
            Telegram updates <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <aside class="hero-note" aria-label="About this blog">
        <div class="note-topline">
          <span>FIELD NOTES</span>
          <span class="note-status"><span></span> OPEN ARCHIVE</span>
        </div>
        <p class="note-number">{{ String(blogPosts.length).padStart(2, '0') }}</p>
        <p class="note-caption">stories and build notes</p>
        <div class="note-divider"></div>
        <p class="note-copy">Some projects ship. Some teach me what to try next. Both belong here.</p>
      </aside>
    </header>

    <section class="archive-section" aria-labelledby="archive-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">THE ARCHIVE</p>
          <h2 id="archive-heading">Find something to read</h2>
        </div>
        <p class="archive-hint">Search by project, topic, or keyword.</p>
      </div>

      <div class="archive-controls">
        <label class="search-field">
          <span class="sr-only">Search articles</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Try Kontekstual, Linux, APIs..." autocomplete="off" />
          <button v-if="search" type="button" class="clear-search" aria-label="Clear search" @click="search = ''">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </label>
        <label class="category-select">
          <span class="sr-only">Filter by category</span>
          <select v-model="selectedCategory">
            <option value="all">All categories</option>
            <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
          </select>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"><path d="m7 10 5 5 5-5" /></svg>
        </label>
      </div>

      <div class="category-chips" aria-label="Quick category filters">
        <button type="button" :aria-pressed="selectedCategory === 'all'" :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'">
          Everything <span>{{ blogPosts.length }}</span>
        </button>
        <button v-for="category in categories" :key="category" type="button" :aria-pressed="selectedCategory === category" :class="{ active: selectedCategory === category }" @click="selectedCategory = category">
          {{ category }}
        </button>
      </div>

      <div class="results-line" aria-live="polite">
        <p><strong>{{ filteredPosts.length }}</strong> {{ filteredPosts.length === 1 ? 'article' : 'articles' }} found</p>
        <button v-if="search || selectedCategory !== 'all'" type="button" @click="clearFilters">Reset filters</button>
      </div>

      <div v-if="featuredPost" class="article-results">
        <article class="featured-card">
          <a class="featured-image" :href="'/blog/' + featuredPost.slug" tabindex="-1" aria-hidden="true">
            <img :src="featuredPost.image" :alt="featuredPost.imageAlt" loading="lazy" decoding="async" />
          </a>
          <div class="featured-body">
            <div class="article-meta">
              <span class="category-label">{{ featuredPost.category }}</span>
              <time :datetime="featuredPost.date">{{ formatDate(featuredPost) }}</time>
            </div>
            <p class="featured-label">START HERE <span aria-hidden="true">↘</span></p>
            <h3><a :href="'/blog/' + featuredPost.slug">{{ featuredPost.title }}</a></h3>
            <p class="article-description">{{ featuredPost.description }}</p>
            <div class="article-bottom">
              <div class="topic-list"><span v-for="topic in featuredPost.topics.slice(0, 3)" :key="topic">{{ topic }}</span></div>
              <a class="read-link" :href="'/blog/' + featuredPost.slug">Read article <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </article>

        <div v-if="remainingPosts.length" class="article-grid">
          <article v-for="post in remainingPosts" :key="post.slug" class="article-card">
            <a class="card-image" :href="'/blog/' + post.slug" tabindex="-1" aria-hidden="true">
              <img :src="post.image" :alt="post.imageAlt" loading="lazy" decoding="async" />
            </a>
            <div class="card-body">
              <div class="article-meta">
                <span class="category-label">{{ post.category }}</span>
                <time :datetime="post.date">{{ formatDate(post) }}</time>
              </div>
              <h3><a :href="'/blog/' + post.slug">{{ post.title }}</a></h3>
              <p class="article-description">{{ post.description }}</p>
              <div class="article-bottom">
                <span class="topic-summary">{{ post.topics.slice(0, 2).join(' · ') }}</span>
                <a class="read-link" :href="'/blog/' + post.slug" :aria-label="'Read ' + post.title">Read <span aria-hidden="true">↗</span></a>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="30" height="30"><circle cx="21" cy="21" r="12" /><path d="m30 30 9 9M16 21h10" /></svg>
        </div>
        <h3>No articles match that search</h3>
        <p>Try a different keyword or reset the category filter.</p>
        <button type="button" @click="clearFilters">Show all articles</button>
      </div>
    </section>

    <footer class="archive-footer">
      <p>That's the archive for now. New ideas tend to show up when I should be asleep.</p>
      <a href="https://github.com/flessan" target="_blank" rel="noreferrer">More things on GitHub <span aria-hidden="true">↗</span></a>
    </footer>
  </main>
</template>

<style scoped>
.blog-archive { --archive-border: var(--vp-c-divider); --archive-panel: var(--vp-c-bg-alt); margin: 0 auto; width: 100%; max-width: 100%; }
.archive-hero { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(13rem, 0.72fr); gap: clamp(1rem, 3vw, 2.4rem); align-items: stretch; margin: 0 0 3rem; padding: clamp(1.15rem, 3vw, 2rem); border: 1px solid var(--archive-border); border-radius: 1.2rem; background: var(--archive-panel); }
.hero-copy { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-width: 0; padding: 0.4rem 0; }
.eyebrow { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.8rem; color: var(--vp-c-brand-1); font-size: 0.72rem; font-weight: 750; letter-spacing: 0.12em; line-height: 1.4; }
.eyebrow-dot, .note-status span { display: inline-block; width: 0.48rem; height: 0.48rem; border-radius: 50%; background: var(--vp-c-brand-1); }
.hero-copy h1 { max-width: 12ch; margin: 0; color: var(--vp-c-text-1); font-size: clamp(2.1rem, 4.5vw, 3.7rem); font-weight: 780; letter-spacing: -0.055em; line-height: 1.04; }
.hero-description { max-width: 42rem; margin: 1rem 0 0; color: var(--vp-c-text-2); font-size: 1rem; line-height: 1.8; }
.hero-links { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1.4rem; }
.hero-link { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.65rem; padding: 0.6rem 0.85rem; border: 1px solid var(--archive-border); border-radius: 0.7rem; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 0.84rem; font-weight: 650; text-decoration: none; transition: border-color 160ms ease, transform 160ms ease; }
.hero-link svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.hero-link:hover { transform: translateY(-1px); border-color: var(--vp-c-brand-1); }
.primary-link { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.primary-link:hover { color: var(--vp-c-white); opacity: 0.92; }
.hero-note { display: flex; flex-direction: column; justify-content: center; min-width: 0; padding: 1.2rem; border: 1px solid var(--archive-border); border-radius: 0.9rem; background: var(--vp-c-bg); }
.note-topline { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.55rem; color: var(--vp-c-text-3); font-size: 0.65rem; font-weight: 750; letter-spacing: 0.08em; }
.note-status { display: inline-flex; align-items: center; gap: 0.35rem; }
.note-status span { width: 0.38rem; height: 0.38rem; }
.note-number { margin: 1.15rem 0 0; color: var(--vp-c-text-1); font-size: clamp(3.5rem, 7vw, 5.6rem); font-weight: 800; letter-spacing: -0.075em; line-height: 1; font-variant-numeric: tabular-nums; }
.note-caption { margin: 0.25rem 0 0; color: var(--vp-c-text-2); font-size: 0.88rem; }
.note-divider { height: 1px; margin: 1.15rem 0; background: var(--archive-border); }
.note-copy { margin: 0; color: var(--vp-c-text-2); font-size: 0.9rem; line-height: 1.7; }
.archive-section { margin: 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; }
.section-heading .eyebrow { margin-bottom: 0.35rem; }
.section-heading h2 { margin: 0; font-size: clamp(1.45rem, 2.5vw, 1.9rem); font-weight: 740; letter-spacing: -0.035em; line-height: 1.25; }
.archive-hint { margin: 0 0 0.12rem; color: var(--vp-c-text-3); font-size: 0.82rem; }
.archive-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(12rem, 15rem); gap: 0.7rem; }
.search-field, .category-select { display: flex; align-items: center; gap: 0.65rem; min-width: 0; min-height: 3rem; padding: 0.6rem 0.8rem; border: 1px solid var(--archive-border); border-radius: 0.75rem; background: var(--vp-c-bg-alt); color: var(--vp-c-text-2); transition: border-color 160ms ease, box-shadow 160ms ease; }
.search-field:focus-within, .category-select:focus-within { border-color: var(--vp-c-brand-1); box-shadow: 0 0 0 2px var(--vp-c-brand-soft); }
.search-field > svg { flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.search-field input, .category-select select { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--vp-c-text-1); font: inherit; font-size: 0.9rem; }
.search-field input::placeholder { color: var(--vp-c-text-3); opacity: 1; }
.clear-search { display: grid; flex: 0 0 auto; place-items: center; width: 1.7rem; height: 1.7rem; border: 0; border-radius: 0.45rem; background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); cursor: pointer; }
.clear-search svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.8; }
.category-select { position: relative; }
.category-select select { appearance: none; cursor: pointer; }
.category-select > svg { flex: 0 0 auto; pointer-events: none; fill: none; stroke: currentColor; stroke-width: 1.8; }
.category-select option { background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.category-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.9rem 0 1.2rem; }
.category-chips button { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.1rem; padding: 0.45rem 0.7rem; border: 1px solid var(--archive-border); border-radius: 999px; background: var(--vp-c-bg); color: var(--vp-c-text-2); font: inherit; font-size: 0.78rem; font-weight: 570; cursor: pointer; transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease; }
.category-chips button:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-text-1); }
.category-chips button.active { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 700; }
.category-chips button span { color: inherit; opacity: 0.8; font-size: 0.72rem; font-variant-numeric: tabular-nums; }
.results-line { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; margin: 0 0 0.9rem; }
.results-line p { margin: 0; color: var(--vp-c-text-3); font-size: 0.82rem; }
.results-line strong { color: var(--vp-c-text-1); font-variant-numeric: tabular-nums; }
.results-line button { padding: 0.3rem 0.2rem; border: 0; background: transparent; color: var(--vp-c-brand-1); font: inherit; font-size: 0.8rem; font-weight: 650; cursor: pointer; }
.featured-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-width: 0; overflow: hidden; border: 1px solid var(--archive-border); border-radius: 1rem; background: var(--vp-c-bg-alt); transition: border-color 170ms ease, box-shadow 170ms ease; }
.featured-card:hover, .article-card:hover { border-color: var(--vp-c-brand-1); box-shadow: 0 10px 25px rgba(20, 35, 25, 0.07); }
.featured-image, .card-image { display: block; overflow: hidden; min-width: 0; background: var(--vp-c-bg-soft); }
.featured-image { min-height: 21rem; }
.featured-image img, .card-image img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 300ms ease; }
.featured-image img { min-height: 21rem; }
.featured-image:hover img, .card-image:hover img { transform: scale(1.025); }
.featured-body { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-width: 0; padding: clamp(1.2rem, 3vw, 2.1rem); }
.article-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem 0.7rem; color: var(--vp-c-text-3); font-size: 0.73rem; line-height: 1.5; }
.category-label { color: var(--vp-c-brand-1); font-weight: 750; }
.featured-label { display: flex; align-items: center; gap: 0.4rem; margin: 1.2rem 0 0.35rem; color: var(--vp-c-text-3); font-size: 0.68rem; font-weight: 750; letter-spacing: 0.1em; }
.featured-body h3, .card-body h3 { margin: 0; color: var(--vp-c-text-1); font-size: 1.3rem; font-weight: 740; letter-spacing: -0.025em; line-height: 1.35; }
.featured-body h3 { font-size: clamp(1.45rem, 2.6vw, 2rem); }
.featured-body h3 a, .card-body h3 a { color: inherit; text-decoration: none; }
.featured-body h3 a:hover, .card-body h3 a:hover { color: var(--vp-c-brand-1); }
.article-description { margin: 0.7rem 0 0; color: var(--vp-c-text-2); font-size: 0.9rem; line-height: 1.75; }
.article-bottom { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 0.7rem; width: 100%; margin-top: auto; padding-top: 1.3rem; }
.topic-list { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.topic-list span { padding: 0.25rem 0.48rem; border-radius: 0.4rem; background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); font-size: 0.7rem; }
.read-link { display: inline-flex; align-items: center; gap: 0.35rem; flex: 0 0 auto; color: var(--vp-c-brand-1); font-size: 0.82rem; font-weight: 730; text-decoration: none; }
.read-link:hover { text-decoration: underline; text-underline-offset: 0.2em; }
.article-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1rem; }
.article-card { display: flex; flex-direction: column; min-width: 0; overflow: hidden; border: 1px solid var(--archive-border); border-radius: 0.95rem; background: var(--vp-c-bg-alt); transition: border-color 170ms ease, box-shadow 170ms ease; }
.card-image { aspect-ratio: 16 / 9; }
.card-body { display: flex; flex-direction: column; flex: 1; min-width: 0; padding: 1rem; }
.card-body h3 { margin-top: 0.65rem; font-size: 1.04rem; }
.card-body .article-description { margin-top: 0.5rem; font-size: 0.84rem; }
.card-body .article-bottom { padding-top: 1.1rem; }
.topic-summary { min-width: 0; color: var(--vp-c-text-3); font-size: 0.71rem; line-height: 1.5; }
.empty-state { padding: 2.5rem 1rem; border: 1px dashed var(--archive-border); border-radius: 1rem; text-align: center; }
.empty-mark { display: inline-grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 1rem; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.empty-mark svg { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.empty-state h3 { margin: 0.85rem 0 0.35rem; color: var(--vp-c-text-1); font-size: 1.15rem; }
.empty-state p { margin: 0 0 1rem; color: var(--vp-c-text-2); font-size: 0.9rem; }
.empty-state button { min-height: 2.45rem; padding: 0.55rem 0.8rem; border: 1px solid var(--vp-c-brand-1); border-radius: 0.65rem; background: var(--vp-c-brand-1); color: var(--vp-c-white); font: inherit; font-size: 0.85rem; font-weight: 650; cursor: pointer; }
.archive-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.7rem 1.2rem; margin: 2rem 0 0; padding: 1.1rem 0 0.4rem; border-top: 1px solid var(--archive-border); }
.archive-footer p { margin: 0; color: var(--vp-c-text-3); font-size: 0.8rem; line-height: 1.6; }
.archive-footer a { color: var(--vp-c-brand-1); font-size: 0.82rem; font-weight: 680; text-decoration: none; }
.archive-footer a:hover { text-decoration: underline; text-underline-offset: 0.2em; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; clip-path: inset(50%); }
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
@media (max-width: 1040px) { .article-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .archive-hero { grid-template-columns: minmax(0, 1.3fr) minmax(12rem, 0.7fr); } .featured-image, .featured-image img { min-height: 18rem; } }
@media (max-width: 720px) { .archive-hero { grid-template-columns: 1fr; margin-bottom: 2.2rem; } .hero-note { padding: 1rem; } .note-number { font-size: 3.3rem; } .section-heading { align-items: flex-start; flex-direction: column; gap: 0.35rem; } .archive-controls { grid-template-columns: 1fr; } .featured-card { grid-template-columns: 1fr; } .featured-image, .featured-image img { min-height: 0; height: auto; aspect-ratio: 16 / 8; } .featured-body { min-height: 18rem; } }
@media (max-width: 520px) { .article-grid { grid-template-columns: 1fr; } .hero-copy h1 { font-size: clamp(2rem, 10vw, 3rem); } .hero-links { width: 100%; } .hero-link { flex: 1 1 auto; } .article-grid { gap: 0.8rem; } .card-image { aspect-ratio: 16 / 8; } .card-body { padding: 0.95rem; } .featured-body { min-height: 0; } }
@media (prefers-reduced-motion: reduce) { .hero-link, .featured-card, .article-card, .featured-image img, .card-image img, .category-chips button { transition: none; } .hero-link:hover, .featured-image:hover img, .card-image:hover img { transform: none; } }
</style>
