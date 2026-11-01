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
  min-width: 0;
  border: 0;
  border-radius: var(--md-shape-xl);
  padding: 12px;
  background: var(--md-surface-container-low);
  text-decoration: none;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    box-shadow var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring);
}

.lp:hover {
  text-decoration: none;
  background: var(--md-surface-container-high);
  box-shadow: var(--md-elevation-1);
  transform: translateY(-2px);
}

.lp-img {
  width: 96px;
  align-self: center;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: var(--md-shape-md);
  flex-shrink: 0;
  background: var(--md-surface-container-highest);
  transition: transform var(--md-duration-long) var(--md-ease-spring);
}

.lp:hover .lp-img {
  transform: scale(1.03);
}

.lp-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 2px 4px 2px 0;
}

.lp-site {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--md-on-surface-variant);
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-arrow {
  display: inline-block;
  font-size: 0.7rem;
  transition: transform var(--md-duration-medium) var(--md-ease-spring);
}

.lp:hover .lp-arrow {
  transform: translate(2px, -2px);
}

.lp-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--md-primary);
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.lp-desc {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--md-on-surface-variant);
  line-height: 1.6;
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
