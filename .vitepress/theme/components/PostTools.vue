<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const progress = ref(0)
const copied = ref(false)
const notice = ref('')
const canShare = ref(false)

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  progress.value = scrollable > 0
    ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100))
    : 0
}

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
  updateProgress()
  window.addEventListener('scroll', updateProgress, { passive: true })
  window.addEventListener('resize', updateProgress, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateProgress)
  window.removeEventListener('resize', updateProgress)
})
</script>

<template>
  <div class="post-tools">
    <div
      class="reading-progress"
      role="progressbar"
      aria-label="Article reading progress"
      :aria-valuenow="Math.round(progress)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ width: progress + '%' }"></span>
    </div>
    <div class="share-actions">
      <span class="share-label">Keep this one</span>
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
.reading-progress {
  position: fixed;
  z-index: 60;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.reading-progress span {
  display: block;
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 100ms linear;
}
.share-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
}
.share-label {
  margin-right: 0.2rem;
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}
.share-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.55rem;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.share-actions button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
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
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
}
.post-tools {
  margin: -1.45rem 0 2.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .reading-progress span {
    transition: none;
  }
}
</style>
