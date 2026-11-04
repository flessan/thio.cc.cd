<script setup lang="ts">
/**
 * One task row, used by the dashboard and the full task list.
 * The row never edits data except through the store's toggle helpers; opening
 * the editor is delegated to the shell.
 */
import { computed, ref } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import { dueLabel, durationLabel } from '../../kerja/dates'
import { isOverdue } from '../../kerja/tasks'
import { PRIORITY_LABEL, subtaskProgress, type Task } from '../../kerja/model'
import { reminderLabel, reminderStatus } from '../../kerja/reminders'
import { outdoorRainAdvice, type Forecast } from '../../kerja/bmkg'
import { toggleTaskDone } from '../../kerja/state'
import { pop } from '../../effects'

const props = withDefaults(
  defineProps<{
    task: Task
    now?: Date
    forecast?: Forecast | null
    compact?: boolean
    /** Why this task appears in the focus list, e.g. "Overdue". */
    reason?: string
  }>(),
  { now: () => new Date(), forecast: null, compact: false, reason: '' }
)

const emit = defineEmits<{ edit: [id: string] }>()

const checking = ref(false)
const progress = computed(() => subtaskProgress(props.task))
const overdue = computed(() => isOverdue(props.task, props.now))
const due = computed(() => dueLabel(props.task.dueAt, props.now))
const reminder = computed(() => reminderLabel(props.task, props.now))
const reminderState = computed(() => reminderStatus(props.task, props.now))
const advice = computed(() => outdoorRainAdvice(props.task, props.forecast, props.now))

function toggle(event: MouseEvent) {
  checking.value = true
  toggleTaskDone(props.task.id)
  const target = event.currentTarget as HTMLElement | null
  if (target) pop(target)
  window.setTimeout(() => {
    checking.value = false
  }, 420)
}
</script>

<template>
  <article
    class="kw-task"
    :class="{ 'is-overdue': overdue, 'is-done': task.status === 'done' }"
  >
    <button
      type="button"
      class="kw-check"
      :class="{ 'is-done': task.status === 'done' }"
      :aria-label="task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`"
      :aria-pressed="task.status === 'done'"
      :disabled="checking"
      @click="toggle"
    >
      <WorkspaceIcon name="check" :size="15" />
    </button>

    <div class="kw-task-body">
      <button type="button" class="kw-task-title" @click="emit('edit', task.id)">
        {{ task.title }}
      </button>

      <div class="kw-task-meta">
        <span v-if="reason" class="kw-focus-reason" :class="{ 'is-overdue': reason === 'Overdue' }">
          {{ reason }}
        </span>
        <span class="kw-priority" :class="`kw-priority--${task.priority}`">
          {{ PRIORITY_LABEL[task.priority] }}
        </span>
        <span v-if="task.category">
          <WorkspaceIcon name="layers" :size="13" />
          {{ task.category }}
        </span>
        <span v-if="due" :class="{ 'is-alert': overdue }">
          <WorkspaceIcon name="calendar" :size="13" />
          {{ due }}
        </span>
        <span v-if="task.estimateMinutes">
          <WorkspaceIcon name="clock" :size="13" />
          {{ durationLabel(task.estimateMinutes) }}
        </span>
        <span v-if="reminder && reminderState !== 'completed'">
          <WorkspaceIcon name="bell" :size="13" />
          {{ reminder }}
        </span>
        <span v-if="progress.total">
          <span class="kw-mini-progress" aria-hidden="true">
            <span :style="{ width: `${Math.round(progress.ratio * 100)}%` }" />
          </span>
          {{ progress.done }}/{{ progress.total }}
        </span>
        <span v-if="task.outdoor">
          <WorkspaceIcon name="umbrella" :size="13" />
          Outdoor
        </span>
      </div>

      <p v-if="advice" class="kw-weather-hint" :class="`is-${advice.severity}`">
        <WorkspaceIcon name="umbrella" :size="14" />
        <span>
          <strong>{{ advice.title }}.</strong>
          {{ advice.detail }}
          <em>Forecast hint, not an official BMKG warning.</em>
        </span>
      </p>
    </div>

    <div class="kw-task-actions">
      <button
        type="button"
        class="kw-icon-btn"
        :aria-label="`Edit ${task.title}`"
        @click="emit('edit', task.id)"
      >
        <WorkspaceIcon name="edit" :size="17" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.kw-weather-hint em {
  display: block;
  margin-top: 0.15rem;
  font-style: normal;
  opacity: 0.78;
}
</style>
