<script setup lang="ts">
/**
 * The full task library: search, filters, sorting and grouped buckets.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import TaskRow from './TaskRow.vue'
import TaskQuickAdd from './TaskQuickAdd.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { removeTask, workspace } from '../../kerja/state'
import { openTaskEditor } from '../../kerja/ui'
import {
  TASK_SORT_LABELS,
  collectCategories,
  filterTasks,
  groupTasks,
  type TaskSort
} from '../../kerja/tasks'
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../kerja/model'
import { pushToast } from '../../kerja/toasts'
import { weather } from '../../kerja/useWeather'
import { reveal } from '../../kerja/animations'

const search = ref('')
const status = ref<'all' | 'open' | 'done'>('open')
const priorities = ref<Priority[]>([])
const category = ref('')
const sort = ref<TaskSort>('smart')
const now = ref(new Date())
const confirmClear = ref(false)
const clearing = ref(false)
let timer: number | undefined

const categories = computed(() => collectCategories(workspace.tasks))
const filtered = computed(() =>
  filterTasks(workspace.tasks, {
    search: search.value,
    status: status.value,
    priorities: priorities.value,
    categories: category.value ? [category.value] : [],
    showCompleted: true
  })
)
const groups = computed(() => groupTasks(filtered.value, sort.value, now.value))
const openCount = computed(() => workspace.tasks.filter((task) => task.status !== 'done').length)
const doneCount = computed(() => workspace.tasks.filter((task) => task.status === 'done').length)
const completion = computed(() =>
  workspace.tasks.length ? doneCount.value / workspace.tasks.length : 0
)
const filtersActive = computed(
  () =>
    Boolean(search.value.trim()) ||
    status.value !== 'open' ||
    priorities.value.length > 0 ||
    Boolean(category.value) ||
    sort.value !== 'smart'
)
const hasVisibleTasks = computed(
  () =>
    groups.value.overdue.length +
      groups.value.today.length +
      groups.value.upcoming.length +
      groups.value.unscheduled.length +
      groups.value.completed.length >
    0
)

function togglePriority(priority: Priority) {
  priorities.value = priorities.value.includes(priority)
    ? priorities.value.filter((item) => item !== priority)
    : [...priorities.value, priority]
}

function clearFilters() {
  search.value = ''
  status.value = 'open'
  priorities.value = []
  category.value = ''
  sort.value = 'smart'
}

function confirmClearCompleted() {
  const completed = workspace.tasks.filter((task) => task.status === 'done')
  if (!completed.length) return
  clearing.value = true
  completed.forEach((task) => removeTask(task.id))
  clearing.value = false
  confirmClear.value = false
  pushToast({
    tone: 'success',
    title: 'Completed tasks removed',
    message: `${completed.length} finished task${completed.length === 1 ? '' : 's'} deleted. Cloud copies update on your next sync.`
  })
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 60_000)
  reveal(document.querySelectorAll('.kw-main .kw-reveal'), 40)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="tasks-tab">
    <header class="kw-section-head kw-reveal" style="margin-bottom: 0.8rem">
      <div>
        <span class="kw-eyebrow">Everything in one place</span>
        <h1 style="margin: 0.1rem 0 0; font-size: clamp(1.4rem, 3vw, 1.8rem); letter-spacing: -0.02em">
          Tasks
        </h1>
      </div>
      <div class="kw-inline">
        <span class="kw-hint">{{ openCount }} open · {{ doneCount }} done</span>
        <button type="button" class="kw-btn kw-btn--filled kw-btn--small" @click="openTaskEditor()">
          <WorkspaceIcon name="plus" :size="16" />
          New task
        </button>
      </div>
    </header>

    <div class="kw-reveal">
      <TaskQuickAdd />
    </div>

    <section class="kw-card kw-reveal" style="margin-top: 0.9rem" aria-label="Filters">
      <div class="kw-inline" style="justify-content: space-between">
        <div class="kw-inline">
          <label class="kw-sr" for="task-search">Search tasks</label>
          <input
            id="task-search"
            v-model="search"
            class="kw-input"
            type="search"
            placeholder="Search tasks, notes, categories…"
            style="min-width: min(300px, 62vw)"
          />
          <div class="kw-inline" role="group" aria-label="Status">
            <button
              v-for="option in (['open', 'all', 'done'] as const)"
              :key="option"
              type="button"
              class="kw-chip"
              :class="{ 'is-active': status === option }"
              :aria-pressed="status === option"
              @click="status = option"
            >
              {{ option === 'open' ? 'Active' : option === 'done' ? 'Completed' : 'All' }}
            </button>
          </div>
        </div>
        <button v-if="filtersActive" type="button" class="kw-btn kw-btn--small" @click="clearFilters">
          Clear filters
        </button>
      </div>

      <div class="kw-inline kw-mt-sm">
        <span class="kw-hint">Priority</span>
        <button
          v-for="priority in PRIORITIES"
          :key="priority"
          type="button"
          class="kw-chip"
          :class="{ 'is-active': priorities.includes(priority) }"
          :aria-pressed="priorities.includes(priority)"
          @click="togglePriority(priority)"
        >
          <span class="kw-dot" :class="`kw-priority--${priority}`" style="width: 7px; height: 7px" />
          {{ PRIORITY_LABEL[priority] }}
        </button>

        <label class="kw-sr" for="task-category">Category</label>
        <select id="task-category" v-model="category" class="kw-select" style="width: auto; min-height: 34px; font-size: 0.76rem">
          <option value="">All categories</option>
          <option v-for="name in categories" :key="name" :value="name">{{ name }}</option>
        </select>

        <label class="kw-sr" for="task-sort">Sort by</label>
        <select id="task-sort" v-model="sort" class="kw-select" style="width: auto; min-height: 34px; font-size: 0.76rem">
          <option v-for="(label, key) in TASK_SORT_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>

      <div class="kw-mt-sm">
        <div class="kw-mini-progress" style="width: 100%; height: 5px" aria-hidden="true">
          <span :style="{ width: `${Math.round(completion * 100)}%` }" />
        </div>
        <p class="kw-hint" style="margin: 0.3rem 0 0">
          {{ Math.round(completion * 100) }}% of all tasks completed ·
          {{ filtered.length }} match{{ filtered.length === 1 ? 'es' : '' }} your filters
        </p>
      </div>
    </section>

    <div v-if="!hasVisibleTasks" class="kw-section kw-empty kw-reveal">
      <WorkspaceIcon name="filter" :size="30" />
      <strong>{{ workspace.tasks.length ? 'No tasks match those filters' : 'No tasks yet' }}</strong>
      <p v-if="workspace.tasks.length">
        Try clearing the filters, or switch the status to All to see completed work.
      </p>
      <p v-else>Add a task above. Everything stays on this device until you sync.</p>
      <button v-if="filtersActive" type="button" class="kw-btn kw-btn--tonal kw-btn--small" @click="clearFilters">
        Clear filters
      </button>
    </div>

    <template v-else>
      <section v-if="groups.overdue.length" class="kw-section">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="warning" :size="18" />
            Overdue
            <span class="kw-count">{{ groups.overdue.length }}</span>
          </h2>
        </header>
        <div class="kw-task-list">
          <TaskRow v-for="task in groups.overdue" :key="task.id" :task="task" :now="now" :forecast="weather.forecast" @edit="openTaskEditor($event)" />
        </div>
      </section>

      <section v-if="groups.today.length" class="kw-section">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="today" :size="18" />
            Today
            <span class="kw-count">{{ groups.today.length }}</span>
          </h2>
        </header>
        <div class="kw-task-list">
          <TaskRow v-for="task in groups.today" :key="task.id" :task="task" :now="now" :forecast="weather.forecast" @edit="openTaskEditor($event)" />
        </div>
      </section>

      <section v-if="groups.upcoming.length" class="kw-section">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="calendar" :size="18" />
            Upcoming
            <span class="kw-count">{{ groups.upcoming.length }}</span>
          </h2>
        </header>
        <div class="kw-task-list">
          <TaskRow v-for="task in groups.upcoming" :key="task.id" :task="task" :now="now" :forecast="weather.forecast" @edit="openTaskEditor($event)" />
        </div>
      </section>

      <section v-if="groups.unscheduled.length" class="kw-section">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="list" :size="18" />
            No date
            <span class="kw-count">{{ groups.unscheduled.length }}</span>
          </h2>
        </header>
        <div class="kw-task-list">
          <TaskRow v-for="task in groups.unscheduled" :key="task.id" :task="task" :now="now" :forecast="weather.forecast" @edit="openTaskEditor($event)" />
        </div>
      </section>

      <section v-if="groups.completed.length" class="kw-section">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="check" :size="18" />
            Completed
            <span class="kw-count">{{ groups.completed.length }}</span>
          </h2>
          <button type="button" class="kw-btn kw-btn--small" @click="confirmClear = true">
            Clear completed
          </button>
        </header>
        <div class="kw-task-list">
          <TaskRow v-for="task in groups.completed" :key="task.id" :task="task" :now="now" :forecast="weather.forecast" @edit="openTaskEditor($event)" />
        </div>
      </section>
    </template>

    <ConfirmDialog
      :open="confirmClear"
      title="Clear completed tasks?"
      :message="`This removes ${doneCount} finished task${doneCount === 1 ? '' : 's'} from this device. Cloud data changes only when you sync, and this cannot be undone here.`"
      confirm-label="Clear completed"
      danger
      :busy="clearing"
      @cancel="confirmClear = false"
      @confirm="confirmClearCompleted"
    />
  </div>
</template>
