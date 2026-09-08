<script setup lang="ts">
import { computed } from 'vue'
import { linkify, extractUrls, type TgPost } from '../telegram'
import LinkPreview from './LinkPreview.vue'

const props = defineProps<{ post: TgPost }>()

function mediaLabel(p: TgPost): string {
  if (!p.media) return ''
  return p.media.type
}

// links inside a post embed themselves as preview cards (like Telegram's
// own link previews) — at most three, so a link-heavy post stays readable
const previewUrls = computed(() => extractUrls(props.post.text ?? '').slice(0, 3))
</script>

<template>
  <p v-if="post.text && post.text.trim()" class="tpt">
    <template v-for="(seg, i) in linkify(post.text)" :key="i">
      <a v-if="seg.href" :href="seg.href" target="_blank" rel="noopener">{{ seg.text }}</a>
      <template v-else>{{ seg.text }}</template>
    </template>
  </p>
  <p v-else class="tpt-none">
    No caption — open the {{ mediaLabel(post) || 'post' }} on Telegram.
  </p>

  <div v-if="previewUrls.length" class="tpt-cards">
    <LinkPreview v-for="u in previewUrls" :key="u" :url="u"></LinkPreview>
  </div>
</template>

<style scoped>
.tpt {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.94rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.tpt-none {
  margin: 0;
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
  font-style: italic;
}

.tpt-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
</style>
