<script setup lang="ts">
/**
 * Create or edit a task: priority, category, dates, estimate, reminder,
 * subtasks and the outdoor flag that unlocks the weather hint.
 */
import { computed, reactive, ref, watch } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import BaseDialog from './BaseDialog.vue'
import {
  PRIORITIES,
  PRIORITY_HINT,
  PRIORITY_LABEL,
  validateTaskDraft,
  type Priority,
  type Subtask,
  type Task
} from '../../kerja/model'
import {
  addTask,
  removeTask,
  replaceTask,
  updateTask,
  workspace
} from '../../kerja/state'
import { closeTaskEditor, taskEditor } from '../../kerja/ui'
import { collectCategories } from '../../kerja/tasks'
import { dateTimeLabel, fromDateTimeInput, toDateTimeInput } from '../../kerja/dates'
import { reminderStatus } from '../../kerja/reminders'
import { pushToast } from '../../kerja/toasts'

const titleInput = ref<HTMLInputElement | null>(null)

interface FormState {
  title: string
  description: string
  priority: Priority
  category: string
  startAt: string
  dueAt: string
  estimateMinutes: string
  reminderAt: string
  outdoor: boolean
  subtasks: Subtask[]
}

const form = reactive<FormState>(blankForm())
const errors = reactive<{ title?: string; estimate?: string; reminder?: string; dates?: string }>({})
const newSubtask = ref('')

const existing = computed<Task | null>(() => {
  if (!taskEditor.taskId) return null
  return workspace.tasks.find((task) => task.id === taskEditor.taskId) ?? null
})

const categories = computed(() => collectCategories(workspace.tasks))
const status = computed(() => (existing.value ? reminderStatus(existing.value) : 'none'))
const progress = computed(() => {
  const done = form.subtasks.filter((item) => item.done).length
  return { done, total: form.subtasks.length }
})

function blankForm(seed: Partial<Task> = {}): FormState {
  return {
    title: seed.title ?? '',
    description: seed.description ?? '',
    priority: seed.priority ?? 'medium',
    category: seed.category ?? '',
    startAt: toDateTimeInput(seed.startAt ?? null),
    dueAt: toDateTimeInput(seed.dueAt ?? null),
    estimateMinutes: seed.estimateMinutes ? String(seed.estimateMinutes) : '',
    reminderAt: toDateTimeInput(seed.reminderAt ?? null),
    outdoor: seed.outdoor ?? false,
    subtasks: (seed.subtasks ?? []).map((item) => ({ ...item }))
  }
}

function fillFrom(task: Task | null, seed: Partial<Task> | null) {
  Object.assign(form, blankForm(task ? { ...task } : seed ?? {}))
  clearErrors()
  newSubtask.value = ''
}

function clearErrors() {
  errors.title = undefined
  errors.estimate = undefined
  errors.reminder = undefined
  errors.dates = undefined
}

watch(
  () => [taskEditor.open, taskEditor.taskId] as const,
  ([open]) => {
    if (!open) return
    fillFrom(existing.value, taskEditor.seed)
    window.setTimeout(() => titleInput.value?.focus(), 80)
  }
)

watch(
  () => form.dueAt,
  (value) => {
    if (existing.value) return
    const offset = workspace.settings.defaultReminderMinutes
    if (!offset || form.reminderAt) return
    const due = fromDateTimeInput(value)
    if (!due) return
    form.reminderAt = toDateTimeInput(new Date(new Date(due).getTime() - offset * 60_000))
  }
)

const estimates = [15, 25, 30, 45, 60, 90, 120]

function setEstimate(minutes: number) {
  form.estimateMinutes = String(minutes)
}

function setReminderPreset(kind: '10m' | '1h' | 'at' | 'tomorrow' | 'clear') {
  if (kind === 'clear') {
    form.reminderAt = ''
    return
  }
  const due = fromDateTimeInput(form.dueAt)
  if (kind === 'tomorrow') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    form.reminderAt = toDateTimeInput(tomorrow)
    return
  }
  if (!due) {
    pushToast({
      tone: 'info',
      title: 'Set a deadline first',
      message: 'Relative reminder presets need a deadline. You can still pick a custom time.'
    })
    return
  }
  const offset = kind === '10m' ? 10 : kind === '1h' ? 60 : 0
  form.reminderAt = toDateTimeInput(new Date(new Date(due).getTime() - offset * 60_000))
}

function addSubtask() {
  const text = newSubtask.value.trim()
  if (!text) return
  form.subtasks.push({
    id: `sub_${Math.random().toString(36).slice(2, 10)}`,
    title: text.slice(0, 300),
    done: false
  })
  newSubtask.value = ''
}

function removeSubtask(id: string) {
  form.subtasks = form.subtasks.filter((item) => item.id !== id)
}

function save() {
  clearErrors()
  const estimate = form.estimateMinutes.trim() ? Number(form.estimateMinutes) : null
  const validation = validateTaskDraft({
    title: form.title,
    startAt: fromDateTimeInput(form.startAt),
    dueAt: fromDateTimeInput(form.dueAt),
    reminderAt: fromDateTimeInput(form.reminderAt),
    estimateMinutes: estimate
  })
  Object.assign(errors, validation)
  if (Object.keys(validation).length) return

  const patch: Partial<Task> = {
    title: form.title.trim(),
    description: form.description.trim(),
    priority: form.priority,
    category: form.category.trim(),
    startAt: fromDateTimeInput(form.startAt),
    dueAt: fromDateTimeInput(form.dueAt),
    estimateMinutes: estimate,
    reminderAt: fromDateTimeInput(form.reminderAt),
    outdoor: form.outdoor,
    subtasks: form.subtasks.map((item) => ({ ...item }))
  }

  if (existing.value) {
    updateTask(existing.value.id, patch)
    pushToast({ tone: 'success', title: 'Task updated', message: patch.title, duration: 2400 })
  } else {
    const created = addTask({ ...patch, status: 'open', createdAt: new Date().toISOString() })
    pushToast({
      tone: 'success',
      title: 'Task created',
      message: created.reminderAt
        ? `Reminder set for ${dateTimeLabel(created.reminderAt)}`
        : created.title,
      duration: 2800
    })
  }
  closeTaskEditor()
}

function remove() {
  const task = existing.value
  if (!task) return
  const snapshot = { ...task, subtasks: task.subtasks.map((item) => ({ ...item })) }
  removeTask(task.id)
  closeTaskEditor()
  pushToast({
    tone: 'info',
    title: 'Task deleted',
    message: snapshot.title,
    duration: 8000,
    actions: [
      {
        label: 'Undo',
        run: () => {
          replaceTask(snapshot)
          pushToast({ tone: 'success', title: 'Task restored', duration: 2400 })
        }
      }
    ]
  })
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    save()
  }
}

function close() {
  closeTaskEditor()
}

function toggleSubtask(item: Subtask) {
  item.done = !item.done
}

const seedDefault = computed(() => !existing.value && taskEditor.seed?.outdoor)
</script>

<template>
  <BaseDialog
    :open="taskEditor.open"
    :title="existing ? 'Edit task' : 'New task'"
    :description="existing ? 'Changes are saved to this device immediately.' : 'Only the title is required. Everything else can wait.'"
    wide
    @close="close"
  >
    <form class="task-form" @keydown="onKeydown" @submit.prevent="save">
      <div class="kw-field">
        <label class="kw-label" for="task-title">Task</label>
        <input
          id="task-title"
          ref="titleInput"
          v-model="form.title"
          class="kw-input"
          :class="{ 'is-invalid': errors.title }"
          type="text"
          maxlength="300"
          placeholder="What needs doing?"
          data-autofocus
        />
        <p v-if="errors.title" class="kw-error">{{ errors.title }}</p>
      </div>

      <div class="kw-field">
        <label class="kw-label" for="task-description">Description</label>
        <textarea
          id="task-description"
          v-model="form.description"
          class="kw-textarea"
          rows="3"
          maxlength="20000"
          placeholder="Notes, links, context…"
        />
      </div>

      <div class="kw-field">
        <span class="kw-label">Priority</span>
        <div class="kw-inline" role="group" aria-label="Priority">
          <button
            v-for="priority in PRIORITIES"
            :key="priority"
            type="button"
            class="kw-chip"
            :class="{ 'is-active': form.priority === priority }"
            :aria-pressed="form.priority === priority"
            @click="form.priority = priority"
          >
            {{ PRIORITY_LABEL[priority] }}
          </button>
        </div>
        <p class="kw-hint">{{ PRIORITY_HINT[form.priority] }}</p>
      </div>

      <div class="kw-row-2">
        <div class="kw-field">
          <label class="kw-label" for="task-category">Category</label>
          <input
            id="task-category"
            v-model="form.category"
            class="kw-input"
            type="text"
            list="task-category-options"
            maxlength="60"
            placeholder="Work, Personal, Study…"
          />
          <datalist id="task-category-options">
            <option v-for="name in categories" :key="name" :value="name" />
          </datalist>
        </div>
        <div class="kw-field">
          <label class="kw-label" for="task-estimate">Estimated duration (minutes)</label>
          <input
            id="task-estimate"
            v-model="form.estimateMinutes"
            class="kw-input"
            :class="{ 'is-invalid': errors.estimate }"
            type="number"
            min="1"
            max="43200"
            placeholder="e.g. 30"
          />
          <p v-if="errors.estimate" class="kw-error">{{ errors.estimate }}</p>
          <div class="kw-inline" style="gap: 0.25rem">
            <button
              v-for="minutes in estimates"
              :key="minutes"
              type="button"
              class="kw-chip"
              style="min-height: 26px; font-size: 0.68rem"
              @click="setEstimate(minutes)"
            >
              {{ minutes }}m
            </button>
          </div>
        </div>
      </div>

      <div class="kw-row-2">
        <div class="kw-field">
          <label class="kw-label" for="task-start">Start date</label>
          <input id="task-start" v-model="form.startAt" class="kw-input" type="datetime-local" />
        </div>
        <div class="kw-field">
          <label class="kw-label" for="task-due">Deadline</label>
          <input
            id="task-due"
            v-model="form.dueAt"
            class="kw-input"
            :class="{ 'is-invalid': errors.dates }"
            type="datetime-local"
          />
          <p v-if="errors.dates" class="kw-error">{{ errors.dates }}</p>
        </div>
      </div>

      <div class="kw-field">
        <label class="kw-label" for="task-reminder">Reminder</label>
        <input
          id="task-reminder"
          v-model="form.reminderAt"
          class="kw-input"
          :class="{ 'is-invalid': errors.reminder }"
          type="datetime-local"
        />
        <div class="kw-inline" style="gap: 0.25rem">
          <button type="button" class="kw-chip" style="min-height: 28px; font-size: 0.7rem" @click="setReminderPreset('10m')">
            10 min before
          </button>
          <button type="button" class="kw-chip" style="min-height: 28px; font-size: 0.7rem" @click="setReminderPreset('1h')">
            1 hour before
          </button>
          <button type="button" class="kw-chip" style="min-height: 28px; font-size: 0.7rem" @click="setReminderPreset('at')">
            At deadline
          </button>
          <button type="button" class="kw-chip" style="min-height: 28px; font-size: 0.7rem" @click="setReminderPreset('tomorrow')">
            Tomorrow 09:00
          </button>
          <button type="button" class="kw-chip" style="min-height: 28px; font-size: 0.7rem" @click="setReminderPreset('clear')">
            Clear
          </button>
        </div>
        <p v-if="errors.reminder" class="kw-error">{{ errors.reminder }}</p>
        <p v-if="form.reminderAt" class="kw-hint">
          Reminder: {{ dateTimeLabel(fromDateTimeInput(form.reminderAt)) }}
          <template v-if="status === 'dismissed'"> · dismissed for this occurrence</template>
          <template v-else-if="status === 'snoozed'"> · snoozed</template>
        </p>
        <p v-else class="kw-hint">
          Reminders appear in the workspace while it is open. Turn on browser
          notifications in the reminder panel for system alerts.
        </p>
      </div>

      <div class="kw-field">
        <label class="kw-label" style="display: flex; align-items: center; gap: 0.5rem">
          <input v-model="form.outdoor" type="checkbox" />
          Outdoor activity
        </label>
        <p class="kw-hint">
          When this is on and a deadline or start time is set, Kerja shows a small
          rain hint from the BMKG forecast. It never changes the task for you.
          <span v-if="seedDefault"> Suggested by the weather panel.</span>
        </p>
      </div>

      <div class="kw-field">
        <span class="kw-label">
          Subtasks
          <template v-if="progress.total"> · {{ progress.done }}/{{ progress.total }} done</template>
        </span>
        <div v-if="form.subtasks.length" class="subtasks">
          <div v-for="item in form.subtasks" :key="item.id" class="subtask">
            <button
              type="button"
              class="kw-check"
              :class="{ 'is-done': item.done }"
              :aria-label="item.done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`"
              :aria-pressed="item.done"
              @click="toggleSubtask(item)"
            >
              <WorkspaceIcon name="check" :size="14" />
            </button>
            <input v-model="item.title" class="kw-input" type="text" maxlength="300" aria-label="Subtask title" />
            <button
              type="button"
              class="kw-icon-btn"
              :aria-label="`Remove subtask ${item.title}`"
              @click="removeSubtask(item.id)"
            >
              <WorkspaceIcon name="close" :size="16" />
            </button>
          </div>
        </div>
        <div class="kw-inline">
          <input
            v-model="newSubtask"
            class="kw-input"
            type="text"
            placeholder="Add a subtask and press Enter"
            maxlength="300"
            style="flex: 1"
            @keydown.enter.prevent="addSubtask"
          />
          <button type="button" class="kw-btn kw-btn--tonal kw-btn--small" :disabled="!newSubtask.trim()" @click="addSubtask">
            <WorkspaceIcon name="plus" :size="15" />
            Add
          </button>
        </div>
      </div>
    </form>

    <template #footer>
      <button v-if="existing" type="button" class="kw-btn kw-btn--danger" @click="remove">
        Delete
      </button>
      <button type="button" class="kw-btn" @click="close">Cancel</button>
      <button type="button" class="kw-btn kw-btn--filled" @click="save">
        <WorkspaceIcon name="check" :size="16" />
        {{ existing ? 'Save changes' : 'Create task' }}
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.task-form {
  display: grid;
  gap: 0.9rem;
  padding-top: 0.2rem;
}

.subtasks {
  display: grid;
  gap: 0.35rem;
}

.subtask {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.subtask .kw-input {
  flex: 1;
  min-height: 38px;
  font-size: 0.84rem;
}
</style>
