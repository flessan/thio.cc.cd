<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import shortcutData from 'virtual:kerja-shortcuts'

type Shortcut = {
  name: string
  url: string
  icon: string
  category: string
}

const shortcuts = shortcutData as Shortcut[]
const query = ref('')
const activeCategory = ref('Semua')
const searchInput = ref<HTMLInputElement | null>(null)
const failedIcons = ref(new Set<string>())

const categories = computed(() => [
  'Semua',
  ...new Set(shortcuts.map((shortcut) => shortcut.category))
])

const filteredShortcuts = computed(() => {
  const term = query.value.trim().toLowerCase()

  return shortcuts.filter((shortcut) => {
    const matchesCategory =
      activeCategory.value === 'Semua' ||
      shortcut.category === activeCategory.value
    const searchable = `${shortcut.name} ${shortcut.category} ${shortcut.url}`.toLowerCase()
    return matchesCategory && (!term || searchable.includes(term))
  })
})

const groupedShortcuts = computed(() => {
  const groups = new Map<string, Shortcut[]>()

  for (const shortcut of filteredShortcuts.value) {
    const group = groups.get(shortcut.category) ?? []
    group.push(shortcut)
    groups.set(shortcut.category, group)
  }

  return [...groups.entries()].map(([category, items]) => ({ category, items }))
})

function searchGoogle() {
  const term = query.value.trim()
  if (!term) {
    searchInput.value?.focus()
    return
  }

  window.location.href =
    `https://www.google.com/search?client=firefox-b-d&q=${encodeURIComponent(term)}`
}

function focusSearch() {
  searchInput.value?.focus()
  searchInput.value?.select()
}

function handleShortcutKeys(event: KeyboardEvent) {
  const target = event.target
  const isTyping =
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    focusSearch()
  } else if (event.key === '/' && !isTyping) {
    event.preventDefault()
    focusSearch()
  } else if (event.key === 'Escape' && document.activeElement === searchInput.value) {
    query.value = ''
    searchInput.value?.blur()
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function hostname(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

onMounted(() => window.addEventListener('keydown', handleShortcutKeys))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcutKeys))
</script>

<template>
  <div class="kerja-shell">
    <header class="workspace-header">
      <a class="brand" href="/" aria-label="Back to thio.cc.cd">
        <span class="brand-mark">f.</span>
        <span>flessan</span>
      </a>
      <span class="workspace-label">PERSONAL WORKSPACE</span>
      <a class="site-link" href="/">thio.cc.cd <span aria-hidden="true">↗</span></a>
    </header>

    <main class="workspace-main">
      <section class="hero" aria-labelledby="workspace-title">
        <p class="eyebrow">YOUR EVERYDAY START PAGE</p>
        <h1 id="workspace-title">What are we working on?</h1>
        <p class="hero-description">Search the web or jump straight into something.</p>

        <form class="search-form" role="search" @submit.prevent="searchGoogle">
          <button class="search-submit" type="submit" aria-label="Search Google">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.2 4.2" />
            </svg>
          </button>
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            name="q"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-label="Search Google or filter shortcuts"
            placeholder="Search Google or filter shortcuts..."
          />
          <button class="enter-key" type="submit" aria-label="Submit search">Enter ↵</button>
        </form>

        <div class="search-notes">
          <span><kbd>/</kbd> or <kbd>Ctrl K</kbd> to focus</span>
          <span>Enter searches Google</span>
        </div>
      </section>

      <section class="shortcuts-section" aria-labelledby="shortcuts-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ALL IN ONE PLACE</p>
            <h2 id="shortcuts-title">Quick access</h2>
          </div>
          <span class="shortcut-count">{{ filteredShortcuts.length }} links</span>
        </div>

        <nav class="category-tabs" aria-label="Filter shortcut categories">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            :class="{ active: activeCategory === category }"
            :aria-pressed="activeCategory === category"
            @click="activeCategory = category"
          >
            {{ category }}
          </button>
        </nav>

        <div v-if="groupedShortcuts.length" class="shortcut-groups">
          <section
            v-for="group in groupedShortcuts"
            :key="group.category"
            class="shortcut-group"
            :aria-label="group.category"
          >
            <h3>{{ group.category }}</h3>
            <div class="shortcut-grid">
              <a
                v-for="shortcut in group.items"
                :key="shortcut.name"
                class="shortcut-card"
                :href="shortcut.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="`${shortcut.name} (opens in a new tab)`"
              >
                <span class="shortcut-icon" aria-hidden="true">
                  <img
                    v-if="!failedIcons.has(shortcut.name)"
                    :src="shortcut.icon"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    @error="failedIcons.add(shortcut.name)"
                  />
                  <span v-else class="icon-fallback">{{ initials(shortcut.name) }}</span>
                </span>
                <span class="shortcut-copy">
                  <span class="shortcut-name">{{ shortcut.name }}</span>
                  <span class="shortcut-host">{{ hostname(shortcut.url) }}</span>
                </span>
                <span class="shortcut-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </section>
        </div>

        <div v-else class="empty-state">
          <span class="empty-mark">?</span>
          <strong>No shortcuts found</strong>
          <span>Try a different keyword or select another category.</span>
          <button type="button" @click="query = ''; activeCategory = 'Semua'">Clear filters</button>
        </div>
      </section>
    </main>

    <footer class="workspace-footer">
      <span>Made for the way you work.</span>
      <a
        href="https://github.com/flessan/thio.cc.cd/edit/main/data/kerja.md"
        target="_blank"
        rel="noopener noreferrer"
      >
        Edit shortcuts on GitHub <span aria-hidden="true">↗</span>
      </a>
    </footer>
  </div>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  min-height: 100%;
  margin: 0;
}

:global(html) {
  background: #f4f6f2;
  color-scheme: light dark;
}

:global(body) {
  background: #f4f6f2;
}

.kerja-shell {
  --workspace-bg: #f4f6f2;
  --workspace-surface: #ffffff;
  --workspace-text: #202820;
  --workspace-muted: #727d72;
  --workspace-border: #e1e7df;
  --workspace-accent: #2f704d;
  --workspace-accent-soft: #e4f0e6;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 28px clamp(18px, 4.2vw, 64px) 22px;
  display: flex;
  flex-direction: column;
  background: var(--workspace-bg);
  color: var(--workspace-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.workspace-header,
.workspace-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
  max-width: 1320px;
  margin-inline: auto;
}

.brand,
.site-link,
.workspace-footer a {
  color: inherit;
  text-decoration: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.035em;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 10px;
  background: var(--workspace-accent);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.08em;
}

.workspace-label,
.eyebrow {
  color: var(--workspace-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.16em;
}

.site-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--workspace-muted);
  font-size: 12px;
  font-weight: 600;
}

.site-link:hover,
.workspace-footer a:hover {
  color: var(--workspace-accent);
}

.workspace-main {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  flex: 1;
}

.hero {
  padding: clamp(56px, 8.4vh, 100px) 0 58px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 15px;
}

.hero h1 {
  margin: 0;
  font-size: clamp(30px, 4.5vw, 52px);
  line-height: 1.12;
  letter-spacing: -0.055em;
  font-weight: 760;
}

.hero-description {
  margin: 15px 0 28px;
  color: var(--workspace-muted);
  font-size: 14px;
}

.search-form {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(100%, 700px);
  min-height: 62px;
  margin: 0 auto;
  padding: 8px 10px 8px 18px;
  border: 1px solid var(--workspace-border);
  border-radius: 18px;
  background: var(--workspace-surface);
  box-shadow: 0 8px 24px rgb(28 52 34 / 4%);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.search-form:focus-within {
  border-color: #8bb49a;
  box-shadow: 0 0 0 3px rgb(71 132 88 / 10%), 0 8px 24px rgb(28 52 34 / 4%);
}

.search-submit {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--workspace-muted);
  cursor: pointer;
}

.search-submit svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.search-form input {
  min-width: 0;
  flex: 1;
  padding: 11px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--workspace-text);
  font: inherit;
  font-size: 14px;
}

.search-form input::placeholder {
  color: #8c968d;
}

.search-form input::-webkit-search-cancel-button {
  cursor: pointer;
}

.enter-key {
  flex: 0 0 auto;
  padding: 8px 10px;
  border: 1px solid var(--workspace-border);
  border-radius: 9px;
  background: var(--workspace-bg);
  color: var(--workspace-muted);
  font-size: 11px;
  cursor: pointer;
}

.enter-key:hover {
  color: var(--workspace-text);
}

.search-notes {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 13px;
  color: var(--workspace-muted);
  font-size: 11px;
}

kbd {
  padding: 2px 5px;
  border: 1px solid var(--workspace-border);
  border-radius: 5px;
  background: var(--workspace-surface);
  color: var(--workspace-muted);
  font: inherit;
  font-size: 10px;
}

.shortcuts-section {
  padding-bottom: 42px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.section-heading .eyebrow {
  margin-bottom: 7px;
  font-size: 9px;
}

.section-heading h2 {
  margin: 0;
  font-size: 23px;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.shortcut-count {
  padding-bottom: 3px;
  color: var(--workspace-muted);
  font-size: 12px;
  white-space: nowrap;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.category-tabs button {
  padding: 8px 13px;
  border: 1px solid var(--workspace-border);
  border-radius: 999px;
  background: transparent;
  color: var(--workspace-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}

.category-tabs button:hover {
  border-color: #a8bca9;
  color: var(--workspace-text);
}

.category-tabs button.active {
  border-color: var(--workspace-accent);
  background: var(--workspace-accent);
  color: #fff;
}

.shortcut-groups {
  display: grid;
  gap: 27px;
}

.shortcut-group h3 {
  margin: 0 0 12px;
  color: var(--workspace-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.015em;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.shortcut-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 76px;
  box-sizing: border-box;
  padding: 13px 14px;
  border: 1px solid var(--workspace-border);
  border-radius: 15px;
  background: var(--workspace-surface);
  color: var(--workspace-text);
  text-decoration: none;
  transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.shortcut-card:hover {
  transform: translateY(-2px);
  border-color: #b6cab8;
  box-shadow: 0 7px 18px rgb(28 52 34 / 5%);
}

.shortcut-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 39px;
  height: 39px;
  overflow: hidden;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
  background: var(--workspace-bg);
}

.shortcut-icon img {
  display: block;
  width: 23px;
  height: 23px;
  object-fit: contain;
}

.icon-fallback {
  color: var(--workspace-accent);
  font-size: 11px;
  font-weight: 800;
}

.shortcut-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.shortcut-name {
  overflow: hidden;
  font-size: 12px;
  font-weight: 690;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-host {
  overflow: hidden;
  color: var(--workspace-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-arrow {
  margin-left: auto;
  align-self: flex-start;
  color: var(--workspace-muted);
  font-size: 13px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.shortcut-card:hover .shortcut-arrow,
.shortcut-card:focus-visible .shortcut-arrow {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 45px 16px;
  border: 1px dashed var(--workspace-border);
  border-radius: 16px;
  color: var(--workspace-muted);
  text-align: center;
  font-size: 12px;
}

.empty-state strong {
  color: var(--workspace-text);
  font-size: 14px;
}

.empty-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  margin-bottom: 4px;
  border-radius: 12px;
  background: var(--workspace-accent-soft);
  color: var(--workspace-accent);
  font-weight: 800;
}

.empty-state button {
  margin-top: 7px;
  padding: 7px 11px;
  border: 1px solid var(--workspace-border);
  border-radius: 8px;
  background: var(--workspace-surface);
  color: var(--workspace-text);
  font: inherit;
  cursor: pointer;
}

.workspace-footer {
  padding-top: 20px;
  border-top: 1px solid var(--workspace-border);
  color: var(--workspace-muted);
  font-size: 11px;
}

.workspace-footer a {
  font-weight: 650;
}

@media (max-width: 780px) {
  .workspace-label {
    display: none;
  }

  .hero {
    padding-top: 58px;
    padding-bottom: 45px;
  }

  .shortcut-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .kerja-shell {
    padding: 19px 15px 16px;
  }

  .site-link {
    font-size: 11px;
  }

  .hero {
    padding-top: 54px;
  }

  .hero h1 {
    max-width: 340px;
    margin-inline: auto;
    font-size: clamp(28px, 9vw, 38px);
  }

  .hero-description {
    max-width: 290px;
    margin-inline: auto;
    margin-top: 13px;
    margin-bottom: 23px;
    font-size: 13px;
  }

  .search-form {
    min-height: 58px;
    gap: 8px;
    padding-left: 12px;
    border-radius: 15px;
  }

  .search-form input {
    font-size: 13px;
  }

  .enter-key {
    padding: 7px 8px;
    font-size: 10px;
  }

  .search-notes {
    gap: 13px;
    font-size: 10px;
  }

  .section-heading h2 {
    font-size: 21px;
  }

  .category-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 3px;
    scrollbar-width: thin;
  }

  .category-tabs button {
    flex: 0 0 auto;
  }

  .shortcut-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .shortcut-card {
    min-height: 68px;
  }

  .shortcut-arrow {
    opacity: 1;
  }

  .workspace-footer {
    align-items: flex-start;
    font-size: 10px;
  }
}

@media (prefers-color-scheme: dark) {
  :global(html),
  :global(body) {
    background: #171b18;
  }

  .kerja-shell {
    --workspace-bg: #171b18;
    --workspace-surface: #202621;
    --workspace-text: #edf2ed;
    --workspace-muted: #a0ada1;
    --workspace-border: #303a32;
    --workspace-accent: #8bc99e;
    --workspace-accent-soft: #283e2e;
  }

  .brand-mark {
    color: #142118;
  }

  .category-tabs button.active {
    color: #142118;
  }

  .shortcut-card:hover {
    border-color: #587660;
    box-shadow: 0 7px 18px rgb(0 0 0 / 12%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-form,
  .category-tabs button,
  .shortcut-card,
  .shortcut-arrow {
    transition: none;
  }

  .shortcut-card:hover {
    transform: none;
  }
}
</style>
