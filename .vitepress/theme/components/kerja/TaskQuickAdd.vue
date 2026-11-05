<script setup lang="ts">
/**
 * The one-line task composer. Enter adds immediately, the dropdown sets a
 * deadline preset, and "More" hands the draft to the full editor.
 */
import { computed, nextTick, ref } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import { addTask, workspace } from '../../kerja/state'
import { pushToast } from '../../kerja/toasts'
import { openTaskEditor } from '../../kerja/ui'
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../kerja/model'
import { bump } from '../../kerja/animations'

const title = ref('')
const priority = ref<Priority>('medium')
const duePreset = ref<'none' | 'today' | 'tomorrow' | 'week'>('none')
const input = ref<HTMLInputElement | null>(null)

const placeholder = computed(() =>
  workspace.tasks.length ? 'Add a task and press Enter…' : 'What needs doing? Press Enter to add…'
)

const dueOptions = [
  { value: 'none', label: 'No deadline' },
  { value: 'today', label: 'Today 17:00' },
  { value: 'tomorrow', label: 'Tomorrow 09:00' },
  { value: 'week', label: 'In a week' }
] as const

function presetToDate(preset: typeof duePreset.value, now = new Date()): string | null {
  const date = new Date(now)
  if (preset === 'today') {
    date.setHours(17, 0, 0, 0)
    return date.toISOString()
  }
  if (preset === 'tomorrow') {
    date.setDate(date.getDate() + 1)
    date.setHours(9, 0, 0, 0)
    return date.toISOString()
  }
  if (preset === 'week') {
    date.setDate(date.getDate() + 7)
    date.setHours(9, 0, 0, 0)
    return date.toISOString()
  }
  return null
}

function add() {
  const text = title.value.trim()
  if (!text) {
    input.value?.focus()
    return
  }
  const task = addTask({ title: text, priority: priority.value, dueAt: presetToDate(duePreset.value) })
  pushToast({
    tone: 'success',
    title: 'Task added',
    message: task.dueAt ? `${task.title} · ${dueOptions.find((option) => option.value === duePreset.value)?.label}` : task.title,
    duration: 2600
  })
  title.value = ''
  bump(input.value)
  nextTick(() => input.value?.focus())
}

function more() {
  openTaskEditor(undefined, {
    title: title.value.trim(),
    priority: priority.value,
    dueAt: presetToDate(duePreset.value)
  })
  title.value = ''
}
</script>

<template>
  <form class="kw-quick-add" @submit.prevent="add">
    <WorkspaceIcon name="plus" :size="19" style="margin-left: 0.5rem; color: var(--md-primary)" />
    <input
      ref="input"
      v-model="title"
      type="text"
      :placeholder="placeholder"
      aria-label="New task title"
      autocomplete="off"
      maxlength="300"
    />
    <label class="kw-sr" for="kw-quick-priority">Priority</label>
    <select id="kw-quick-priority" v-model="priority" aria-label="Priority">
      <option v-for="item in PRIORITIES" :key="item" :value="item">{{ PRIORITY_LABEL[item] }}</option>
    </select>
    <label class="kw-sr" for="kw-quick-due">Deadline</label>
    <select id="kw-quick-due" v-model="duePreset" aria-label="Deadline">
      <option v-for="option in dueOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <button
      type="button"
      class="kw-btn kw-btn--small"
      data-no-ripple
      @click="more"
    >
      More
    </button>
    <button type="submit" class="kw-btn kw-btn--filled kw-btn--small" :disabled="!title.trim()">
      Add
    </button>
  </form>
</template>
