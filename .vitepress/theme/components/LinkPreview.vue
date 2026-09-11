<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchLinkMeta, type LinkMeta } from '../og'

/**
 * A link that embeds itself: fetches the target's Open Graph metadata and
 * renders a preview card - site name, title, description, and photo -
 * exactly like the previews Telegram shows under a post.
 *
 * The optional `title` / `description` props are fallbacks used until (or
 * unless) live metadata arrives, so hand-written context is never lost.
 */
const props = withDefaults(
  defineProps<{
    url: string
    title?: string
    description?: string
  }>(),
  { title: '', description: '' }
)

const meta = ref<LinkMeta | null>(null)
const imgFailed = ref(false)

const domain = computed(() => {
  try {
    return new URL(props.url).hostname.replace(/^www\./, '')
  } catch {
    return props.url
  }
})

const shownTitle = computed(() => meta.value?.title || props.title || props.url)
const shownDesc = computed(() => meta.value?.description || props.description || '')

onMounted(async () => {
  meta.value = await fetchLinkMeta(props.url)
})
</script>

<template>
  <a :href="url" class="lp" target="_blank" rel="noopener noreferrer">
    <img
      v-if="meta?.image && !imgFailed"
      :src="meta.image"
      :alt="shownTitle"
      class="lp-img"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="imgFailed = true"
    />
    <div class="lp-body">
      <span class="lp-site">
        {{ meta?.siteName || domain }}
        <span class="lp-arrow">↗</span>
      </span>
      <span class="lp-title">{{ shownTitle }}</span>
      <span v-if="shownDesc" class="lp-desc">{{ shownDesc }}</span>
    </div>
  </a>
</template>

<style scoped>
.lp {
  display: flex;
  align-items: stretch;
  gap: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 10px 12px;
  text-decoration: none;
  transition: border-color 0.25s;
  min-width: 0;
}

.lp:hover {
  text-decoration: none;
  border-color: var(--vp-c-brand-1);
}

.lp-img {
  width: 96px;
  align-self: center;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
  background: var(--vp-c-default-soft);
}

.lp-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.lp-site {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-arrow {
  font-size: 0.7rem;
}

.lp-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}

.lp:hover .lp-title {
  color: var(--vp-c-brand-1);
}

.lp-desc {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 480px) {
  .lp {
    flex-direction: column;
  }

  .lp-img {
    width: 100%;
  }
}
</style>
