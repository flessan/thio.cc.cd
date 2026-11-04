<script setup lang="ts">
/**
 * Accessible modal dialog: focus is moved inside, Escape closes it, the page
 * behind it cannot scroll, and focus returns to the trigger afterwards.
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    wide?: boolean
    closeOnOverlay?: boolean
  }>(),
  { description: '', wide: false, closeOnOverlay: true }
)

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null
let previousOverflow = ''

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
  }
}

function lockScroll(locked: boolean) {
  if (typeof document === 'undefined') return
  if (locked) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousOverflow
  }
}

watch(
  () => props.open,
  async (open) => {
    if (typeof window === 'undefined') return
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null
      lockScroll(true)
      document.addEventListener('keydown', onKeydown, true)
      await nextTick()
      const focusable = panel.value?.querySelector<HTMLElement>(
        '[data-autofocus], input:not([type="hidden"]), textarea, select, button'
      )
      ;(focusable ?? panel.value)?.focus()
    } else {
      lockScroll(false)
      document.removeEventListener('keydown', onKeydown, true)
      lastFocused?.focus?.()
      lastFocused = null
    }
  }
)

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onKeydown, true)
  if (props.open) lockScroll(false)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="kw-fade">
      <div
        v-if="open"
        class="kw-overlay"
        @click.self="closeOnOverlay && emit('close')"
      >
        <Transition name="kw-transition" appear>
          <section
            ref="panel"
            class="kw-dialog"
            :class="{ 'kw-dialog--wide': wide }"
            role="dialog"
            aria-modal="true"
            :aria-label="title"
            tabindex="-1"
          >
            <header class="kw-dialog-head">
              <div>
                <h2>{{ title }}</h2>
                <p v-if="description">{{ description }}</p>
              </div>
              <button type="button" class="kw-icon-btn" aria-label="Close dialog" @click="emit('close')">
                <WorkspaceIcon name="close" />
              </button>
            </header>
            <div class="kw-dialog-body">
              <slot />
            </div>
            <footer v-if="$slots.footer" class="kw-dialog-foot">
              <slot name="footer" />
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
