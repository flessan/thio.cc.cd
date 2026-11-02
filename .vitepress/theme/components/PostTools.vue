<script setup lang="ts">
import { onMounted, ref } from 'vue'

const copied = ref(false)
const notice = ref('')
const canShare = ref(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    notice.value = 'Article link copied.'
  } catch {
    copied.value = false
    notice.value = 'Copy is unavailable here. You can copy the URL from the address bar.'
  }
}

async function shareArticle() {
  if (!navigator.share) return
  try {
    await navigator.share({
      title: document.title,
      url: window.location.href
    })
  } catch (error) {
    // A user cancelling the native share sheet is not an error to announce.
    if (error instanceof Error && error.name !== 'AbortError') {
      notice.value = 'Sharing was not available in this browser.'
    }
  }
}

onMounted(() => {
  canShare.value = typeof navigator.share === 'function'
})
</script>

<template>
  <div class="post-tools">
    <!-- The reading line lives once, at the top of the layout (ReadingProgress). -->
    <div class="share-actions">
      <span class="share-label">Share this article</span>
      <button type="button" @click="copyLink">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
        </svg>
        {{ copied ? 'Copied' : 'Copy link' }}
      </button>
      <button v-if="canShare" type="button" @click="shareArticle">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.3 10.8 7.4-4.5M8.3 13.2l7.4 4.5" />
        </svg>
        Share
      </button>
      <span v-if="notice" class="share-notice" role="status">{{ notice }}</span>
    </div>
  </div>
</template>

<style scoped>
.share-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
}
.share-label {
  margin-right: 0.2rem;
  color: var(--md-on-surface-variant);
  font-size: 0.78rem;
}
.share-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 38px;
  padding: 0 0.95rem;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-on-surface-variant);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    border-color var(--md-duration-short) var(--md-ease-standard),
    color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-short) var(--md-ease-spring);
}
.share-actions button:hover {
  border-color: transparent;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}
.share-actions button:active {
  transform: scale(0.97);
}
.share-actions svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.share-notice {
  flex-basis: 100%;
  color: var(--md-on-surface-variant);
  font-size: 0.78rem;
}
.post-tools {
  margin: 0 0 2.4rem;
}
@media (prefers-reduced-motion: reduce) {
  .share-actions button:hover,
  .share-actions button:active {
    transform: none;
  }
}
</style>
