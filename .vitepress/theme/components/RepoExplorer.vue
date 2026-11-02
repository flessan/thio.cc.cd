<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Repo {
  id: number
  name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  pushed_at: string
  fork: boolean
  archived: boolean
  license: { spdx_id: string } | null
  homepage: string | null
  topics?: string[]
}

const CACHE_KEY = 'flessan:repos'
const TTL = 10 * 60 * 1000
const API = 'https://api.github.com/users/flessan/repos?per_page=100&sort=pushed'

const repos = ref<Repo[] | null>(null)
const failed = ref(false)
const updated = ref('')

const query = ref('')
const language = ref('')
const sort = ref<'pushed' | 'name' | 'stars'>('pushed')

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

async function load() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { ts, data } = JSON.parse(cached)
      if (Date.now() - ts < TTL) {
        repos.value = data
        updated.value = new Date(ts).toLocaleString()
        return
      }
    }
  } catch {
    /* ignore cache errors */
  }

  try {
    const res = await fetch(API, {
      headers: { Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as Repo[]
    repos.value = data
    updated.value = new Date().toLocaleString()
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
    } catch {
      /* storage full or blocked - fine */
    }
  } catch {
    // rate-limited or offline: the curated list in the page still works
    failed.value = true
  }
}

function refresh() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
  repos.value = null
  failed.value = false
  updated.value = ''
  load()
}

const languages = computed(() => {
  if (!repos.value) return []
  return [...new Set(repos.value.map((r) => r.language).filter((l): l is string => !!l))].sort()
})

const filtered = computed(() => {
  let list = repos.value ?? []
  const q = query.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.topics ?? []).some((t) => t.toLowerCase().includes(q))
    )
  }
  if (language.value) list = list.filter((r) => r.language === language.value)

  const sorted = [...list]
  if (sort.value === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort.value === 'stars') sorted.sort((a, b) => b.stargazers_count - a.stargazers_count)
  else sorted.sort((a, b) => +new Date(b.pushed_at) - +new Date(a.pushed_at))
  return sorted
})

onMounted(load)
</script>

<template>
  <div class="re">
    <template v-if="repos">
      <div class="re-controls">
        <input
          v-model="query"
          class="re-input"
          type="search"
          placeholder="Filter repositories by name, description, or topic…"
          aria-label="Filter repositories"
        />
        <select v-model="language" class="re-select" aria-label="Filter by language">
          <option value="">All languages</option>
          <option v-for="l in languages" :key="l" :value="l">{{ l }}</option>
        </select>
        <select v-model="sort" class="re-select" aria-label="Sort repositories">
          <option value="pushed">Recently updated</option>
          <option value="name">Name</option>
          <option value="stars">Stars</option>
        </select>
        <button class="re-refresh" type="button" @click="refresh">Refresh</button>
      </div>

      <p class="re-count">
        Showing {{ filtered.length }} of {{ repos.length }} public repositories
        · live from the
        <a href="https://github.com/flessan?tab=repositories" target="_blank" rel="noopener">GitHub API</a>
        <template v-if="updated"> · cached {{ updated }}</template>
      </p>

      <ul class="re-list">
        <li v-for="r in filtered" :key="r.id" class="re-item">
          <p class="re-item-head">
            <a class="re-name" :href="r.html_url" target="_blank" rel="noopener">{{ r.name }}</a>
            <span v-if="r.fork" class="re-badge">fork</span>
            <span v-if="r.archived" class="re-badge">archived</span>
            <a
              v-if="r.homepage"
              class="re-home"
              :href="r.homepage"
              target="_blank"
              rel="noopener"
            >Website ↗</a>
          </p>
          <p v-if="r.description" class="re-desc">{{ r.description }}</p>
          <p class="re-meta">
            <span v-if="r.language">{{ r.language }}</span>
            <span>★ {{ r.stargazers_count }}</span>
            <span>Updated {{ relTime(r.pushed_at) }}</span>
            <span v-if="r.license && r.license.spdx_id !== 'NOASSERTION'">{{ r.license.spdx_id }}</span>
          </p>
        </li>
      </ul>

      <p v-if="filtered.length === 0" class="re-count">
        No repositories match your filters.
      </p>
    </template>

    <p v-else-if="failed" class="re-note">
      Live data is unavailable right now (offline or GitHub API rate limit) -
      the curated list below always works. <button class="re-refresh" type="button" @click="refresh">Retry</button>
    </p>
    <p v-else class="re-note">Loading live data from GitHub…</p>
  </div>
</template>

<style scoped>
.re {
  margin: 0.5rem 0 3rem;
}

.re-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.re-input,
.re-select {
  min-height: 44px;
  border: 0;
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
  border-radius: var(--md-shape-full);
  padding: 0.4rem 1rem;
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  transition: box-shadow var(--md-duration-short) var(--md-ease-standard),
    background-color var(--md-duration-short) var(--md-ease-standard);
}

.re-input:focus,
.re-select:focus {
  background: var(--md-surface-container-highest);
  box-shadow: inset 0 0 0 2px var(--md-primary);
}

.re-input::placeholder {
  color: var(--md-on-surface-variant);
}

.re-input {
  flex: 1;
  min-width: 220px;
}

.re-select {
  cursor: pointer;
}

.re-refresh {
  min-height: 44px;
  border: 0;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  border-radius: var(--md-shape-full);
  padding: 0 1.1rem;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color var(--md-duration-short) var(--md-ease-standard);
}

.re-refresh:hover {
  background: color-mix(in srgb, var(--md-secondary-container) 82%, var(--md-on-secondary-container));
}

.re-count,
.re-note {
  color: var(--md-on-surface-variant);
  font-size: 0.82rem;
  margin: 0 0 0.9rem;
}

.re-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--md-outline-variant);
}

.re-item {
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--md-outline-variant);
}

.re-item-head {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.re-name {
  font-weight: 500;
  font-size: 0.98rem;
  color: var(--md-primary);
  overflow-wrap: anywhere;
}

.re-home {
  font-size: 0.8rem;
  color: var(--md-on-surface-variant);
  margin-left: auto;
}

.re-home:hover {
  color: var(--vp-c-brand-1);
}

.re-badge {
  font-size: 0.7rem;
  border: 0;
  border-radius: var(--md-shape-full);
  padding: 0 0.6rem;
  background: var(--md-surface-container-high);
  color: var(--md-on-surface-variant);
  line-height: 1.7;
}

.re-desc {
  margin: 0.25rem 0 0;
  color: var(--md-on-surface-variant);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.re-meta {
  margin: 0.25rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  color: var(--md-on-surface-variant);
  font-size: 0.8rem;
}
</style>
