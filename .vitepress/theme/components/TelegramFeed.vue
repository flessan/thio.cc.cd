<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchChannel,
  clearChannelCache,
  sortPosts,
  linkify,
  relTime,
  absTime,
  channelUrl,
  type TgPost
} from '../telegram'

const props = withDefaults(
  defineProps<{ limit?: number; title?: string }>(),
  { limit: 0, title: 'Live from Telegram' }
)

const posts = ref<TgPost[] | null>(null)
const failed = ref(false)
const updated = ref('')

async function load() {
  const data = await fetchChannel('posts.json')
  if (!data) {
    failed.value = true
    return
  }
  const all = sortPosts(data.posts ?? [])
  posts.value = props.limit > 0 ? all.slice(0, props.limit) : all
  updated.value = new Date().toLocaleTimeString()
}

function refresh() {
  clearChannelCache('posts.json')
  posts.value = null
  failed.value = false
  updated.value = ''
  load()
}

const hasText = computed(() =>
  (posts.value ?? []).some((p) => p.text && p.text.trim())
)

function mediaLabel(p: TgPost): string {
  if (!p.media) return ''
  if (p.media.type === 'photo') return 'photo'
  if (p.media.type === 'video') return 'video'
  return p.media.type
}

onMounted(load)
</script>

<template>
  <div class="tg">
    <template v-if="posts && posts.length">
      <h2 class="tg-title">{{ title }}</h2>
      <p class="tg-sub">
        Short updates land on my Telegram channel
        <a :href="channelUrl" target="_blank" rel="noopener">@{{ 'chfless' }}</a> first.
        <template v-if="updated">Fetched live (cached {{ updated }}).</template>
      </p>
      <ul class="tg-list">
        <li v-for="p in posts" :key="p.id" class="tg-item">
          <p class="tg-meta">
            <span class="tg-when" :title="absTime(p.published_at)">
              {{ relTime(p.published_at) }}
            </span>
            <span v-if="mediaLabel(p)" class="tg-badge">📷 {{ mediaLabel(p) }}</span>
          </p>
          <p v-if="p.text && p.text.trim()" class="tg-text">
            <template v-for="(seg, i) in linkify(p.text)" :key="i">
              <a v-if="seg.href" :href="seg.href" target="_blank" rel="noopener">{{ seg.text }}</a>
              <template v-else>{{ seg.text }}</template>
            </template>
          </p>
          <p v-else class="tg-nocaption">No caption — open the {{ mediaLabel(p) || 'post' }} on Telegram.</p>
          <a class="tg-open" :href="p.url" target="_blank" rel="noopener">Open on Telegram ↗</a>
        </li>
      </ul>
      <p class="tg-foot">
        <a :href="channelUrl" target="_blank" rel="noopener">Subscribe on Telegram</a>
        <span class="tg-sep">·</span>
        <a v-if="limit > 0" href="/news" class="tg-more">All updates →</a>
        <button class="tg-refresh" type="button" @click="refresh">Refresh</button>
      </p>
    </template>

    <template v-else-if="failed">
      <h2 class="tg-title">{{ title }}</h2>
      <p class="tg-sub">
        The channel feed is unreachable right now. Read the updates directly on
        <a :href="channelUrl" target="_blank" rel="noopener">Telegram (@chfless)</a>.
        <button class="tg-refresh" type="button" @click="refresh">Retry</button>
      </p>
    </template>

    <template v-else>
      <h2 class="tg-title">{{ title }}</h2>
      <p class="tg-sub">Loading updates from the channel…</p>
    </template>
  </div>
</template>

<style scoped>
.tg {
  margin: 0.5rem 0 2rem;
}

.tg-title {
  margin: 2.5rem 0 0.5rem;
  border-top: none;
  padding-top: 0;
}

.tg-sub {
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
  margin: 0 0 1rem;
}

.tg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--vp-c-divider);
}

.tg-item {
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tg-meta {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0 0 0.25rem;
}

.tg-when {
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
}

.tg-badge {
  font-size: 0.72rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 0 0.55rem;
  color: var(--vp-c-text-3);
  line-height: 1.6;
}

.tg-text {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.94rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.tg-nocaption {
  margin: 0;
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
  font-style: italic;
}

.tg-open {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.82rem;
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.tg-open:hover {
  text-decoration: none;
}

.tg-foot {
  margin: 0.9rem 0 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

.tg-foot a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.tg-sep {
  margin: 0 0.45rem;
}

.tg-refresh {
  border: none;
  background: none;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  margin-left: 0.45rem;
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
}

.tg-refresh:hover {
  color: var(--vp-c-brand-1);
}
</style>
