<script setup lang="ts">
import { linkify, type TgPost } from '../telegram'

defineProps<{ post: TgPost }>()

function mediaLabel(p: TgPost): string {
  if (!p.media) return ''
  return p.media.type
}
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
</style>
