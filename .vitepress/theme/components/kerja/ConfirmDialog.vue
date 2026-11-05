<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    busy?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    danger: false,
    busy: false
  }
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <BaseDialog :open="open" :title="title" :description="message" @close="emit('cancel')">
    <div class="kw-inline" style="justify-content: flex-end; margin-top: 0.4rem">
      <button type="button" class="kw-btn kw-btn--outlined" :disabled="busy" @click="emit('cancel')">
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="kw-btn"
        :class="danger ? 'kw-btn--danger' : 'kw-btn--filled'"
        :disabled="busy"
        data-autofocus
        @click="emit('confirm')"
      >
        {{ busy ? 'Working…' : confirmLabel }}
      </button>
    </div>
  </BaseDialog>
</template>
