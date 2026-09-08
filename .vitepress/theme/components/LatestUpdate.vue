<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchChannel,
  clearChannelCache,
  relTime,
  absTime,
  channelUrl,
  type TgPost
} from '../telegram'
import TelegramEmbed from './TelegramEmbed.vue'
import TelegramPostText from './TelegramPostText.vue'

const post = ref<TgPost | null>(null)
const updated = ref('')

async function load() {
  const data = await fetchChannel('latest.json')
  if (data?.latest) {
    post.value = data.latest
    updated.value = new Date().toLocaleTimeString()
  }
  // unreachable API -> the card simply stays hidden; the page still works
}

function refresh() {
  clearChannelCache('latest.json')
  post.value = null
  updated.value = ''
  load()
}

onMounted(load)
</script>

<template>
  <div v-if="post" class="lu">
    <h2 class="lu-title">News</h2>

    <!-- photo/video post: the official Telegram embed, image included -->
    <template v-if="post.media">
      <TelegramEmbed :post-id="post.id">
        <template #fallback>
          <div class="lu-card">
            <p class="lu-meta">
              <span class="lu-when" :title="absTime(post.published_at)">
                {{ relTime(post.published_at) }}
              </span>
              <span class="lu-badge">📷 {{ post.media.type }}</span>
            </p>
            <TelegramPostText :post="post"></TelegramPostText>
          </div>
        </template>
      </TelegramEmbed>
    </template>

    <!-- text post: light native card -->
    <div v-else class="lu-card">
      <p class="lu-meta">
        <span class="lu-when" :title="absTime(post.published_at)">
          {{ relTime(post.published_at) }}
        </span>
      </p>
      <TelegramPostText :post="post"></TelegramPostText>
    </div>

    <p class="lu-links">
      <a :href="post.url" target="_blank" rel="noopener">Open on Telegram ↗</a>
      <span class="lu-sep">·</span>
      <a href="/news">All updates</a>
      <span class="lu-sep">·</span>
      <a :href="channelUrl" target="_blank" rel="noopener">Subscribe</a>
      <span class="lu-sep">·</span>
      <button class="lu-refresh" type="button" title="Fetch the newest post again" @click="refresh">Refresh</button>
    </p>
    <p class="lu-note">
      Fresh from my Telegram channel @chfless, fetched live
      <template v-if="updated"> (cached {{ updated }})</template>.
    </p>
  </div>
</template>

<style scoped>
.lu {
  margin: 0.5rem 0 1rem;
}

.lu-title {
  margin: 2.5rem 0 0.8rem;
  border-top: none;
  padding-top: 0;
}

.lu-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem 1.2rem;
}

.lu-meta {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0 0 0.35rem;
}

.lu-when {
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
}

.lu-badge {
  font-size: 0.72rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 0 0.55rem;
  color: var(--vp-c-text-3);
  line-height: 1.6;
}

.lu-links {
  margin: 0.8rem 0 0;
  font-size: 0.85rem;
}

.lu-links a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.lu-sep {
  color: var(--vp-c-text-3);
  margin: 0 0.4rem;
}

.lu-refresh {
  border: none;
  background: none;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
}

.lu-refresh:hover {
  color: var(--vp-c-brand-1);
}

.lu-note {
  margin: 0.5rem 0 0;
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}
</style>
