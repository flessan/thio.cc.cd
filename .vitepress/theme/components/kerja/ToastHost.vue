<script setup lang="ts">
import { dismissToast, toasts } from '../../kerja/toasts'
import WorkspaceIcon from './WorkspaceIcon.vue'

const ICON: Record<string, string> = {
  info: 'info',
  success: 'check',
  warning: 'warning',
  error: 'warning'
}
</script>

<template>
  <div class="kw-toast-host" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="kw-transition">
      <div v-for="toast in toasts" :key="toast.id" class="kw-toast" :data-tone="toast.tone">
        <WorkspaceIcon :name="ICON[toast.tone] ?? 'info'" :size="18" />
        <div style="min-width: 0; flex: 1">
          <strong>{{ toast.title }}</strong>
          <p v-if="toast.message">{{ toast.message }}</p>
          <div v-if="toast.actions.length" class="kw-toast-actions">
            <button
              v-for="action in toast.actions"
              :key="action.label"
              type="button"
              @click="action.run(); dismissToast(toast.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <button type="button" class="kw-toast-close" aria-label="Dismiss notification" @click="dismissToast(toast.id)">
          <WorkspaceIcon name="close" :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
