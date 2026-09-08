<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Official Telegram post embed (https://core.telegram.org/widgets/post).
// Loads telegram-widget.js, which replaces itself with an auto-height
// iframe of https://t.me/chfless/<id>?embed=1 — the post photo included.
// No bot token involved; it is the public embeddable version of the post.
const props = defineProps<{ postId: number | string }>()

const slotEl = ref<HTMLElement | null>(null)
const failed = ref(false)

let observer: MutationObserver | undefined
let lastDark = false

function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}

function mount() {
  if (!slotEl.value) return
  failed.value = false
  slotEl.value.innerHTML = ''

  const s = document.createElement('script')
  s.async = true
  s.src = 'https://telegram.org/js/telegram-widget.js?22'
  s.setAttribute('data-telegram-post', `chfless/${props.postId}`)
  s.setAttribute('data-width', '100%')
  if (isDark()) s.setAttribute('data-dark', '1')
  s.onerror = () => {
    // telegram.org unreachable: caller's fallback slot takes over
    failed.value = true
  }
  slotEl.value.appendChild(s)
}

onMounted(() => {
  lastDark = isDark()
  mount()

  // follow the site's light/dark toggle by re-mounting the widget
  observer = new MutationObserver(() => {
    const d = isDark()
    if (d !== lastDark) {
      lastDark = d
      mount()
    }
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="tge">
    <div v-show="!failed" ref="slotEl" class="tge-slot"></div>
    <slot v-if="failed" name="fallback"></slot>
  </div>
</template>

<style scoped>
.tge {
  width: 100%;
}

.tge-slot {
  width: 100%;
  /* keeps the layout from collapsing while the widget loads */
  min-height: 96px;
}

.tge :deep(iframe) {
  max-width: 100%;
  border-radius: 8px;
}
</style>
