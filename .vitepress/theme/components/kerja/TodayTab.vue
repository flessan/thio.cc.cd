<script setup lang="ts">
/**
 * The dashboard: a small, ranked answer to "what should I do now?" instead of
 * a wall of every task. Overdue work first, then today, then a gentle nudge.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import WeatherIcon from './WeatherIcon.vue'
import ProgressRing from './ProgressRing.vue'
import TaskRow from './TaskRow.vue'
import TaskQuickAdd from './TaskQuickAdd.vue'
import { workspace } from '../../kerja/state'
import { openTaskEditor, goToTab } from '../../kerja/ui'
import { focusTasks, groupTasks, isCompletedToday, todayProgress, upcomingDays } from '../../kerja/tasks'
import { dateTimeLabel, durationLabel, fullDateLabel } from '../../kerja/dates'
import { currentSlot } from '../../kerja/bmkg'
import { weather, weatherLocation } from '../../kerja/useWeather'
import { reveal } from '../../kerja/animations'

const now = ref(new Date())
let timer: number | undefined

const summary = computed(() => todayProgress(workspace.tasks, now.value))
const focus = computed(() => focusTasks(workspace.tasks, now.value, 3))
const groups = computed(() => groupTasks(workspace.tasks, 'smart', now.value))
const completedToday = computed(() =>
  groups.value.completed.filter((task) => isCompletedToday(task, now.value))
)
const upcoming = computed(() => upcomingDays(workspace.tasks, now.value, 5).slice(0, 2))
const nextSlot = computed(() => (weather.forecast ? currentSlot(weather.forecast, now.value) : null))

const greeting = computed(() => {
  const hour = now.value.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const focusSentence = computed(() => {
  if (summary.value.overdue) {
    return `${summary.value.overdue} overdue ${summary.value.overdue === 1 ? 'task needs' : 'tasks need'} attention before anything else.`
  }
  if (summary.value.dueOpen) {
    return `${summary.value.dueOpen} ${summary.value.dueOpen === 1 ? 'task is' : 'tasks are'} due today${summary.value.remainingMinutes ? ` · about ${durationLabel(summary.value.remainingMinutes)} of work` : ''}.`
  }
  if (workspace.tasks.length === 0) {
    return 'Add the first task and Kerja will keep the day focused on what matters.'
  }
  return 'Nothing is due today. Pick one meaningful thing, or get ahead on what is coming up.'
})

const showCompleted = ref(false)

function edit(id: string) {
  openTaskEditor(id)
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 60_000)
  reveal(document.querySelectorAll('.kw-main .kw-reveal'), 50)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="today">
    <section class="kw-hero kw-reveal">
      <div class="kw-greeting">
        <div>
          <span class="kw-eyebrow">{{ fullDateLabel(now) }}</span>
          <h1>{{ greeting }}<span v-if="workspace.tasks.length">.</span></h1>
          <p>{{ focusSentence }}</p>
        </div>
        <div class="kw-greeting-actions">
          <button type="button" class="kw-btn kw-btn--filled" @click="openTaskEditor()">
            <WorkspaceIcon name="plus" :size="17" />
            New task
          </button>
          <button type="button" class="kw-btn kw-btn--outlined" @click="goToTab('tasks')">
            See all tasks
          </button>
        </div>
      </div>

      <div class="kw-stats" aria-label="Today at a glance">
        <div class="kw-ring-card" style="grid-column: 1 / -1">
          <ProgressRing :ratio="summary.ratio" aria-label="Today's plan completed" />
          <div>
            <strong>{{ summary.completed }} of {{ summary.planned }} done today</strong>
            <p v-if="summary.remainingMinutes">
              {{ durationLabel(summary.remainingMinutes) }} of estimated work left on today's list.
            </p>
            <p v-else-if="summary.planned">Today's plan is complete. Nicely done.</p>
            <p v-else>Nothing scheduled for today yet.</p>
          </div>
        </div>
        <div class="kw-stat" :class="{ 'is-alert': summary.overdue > 0 }">
          <strong>{{ summary.overdue }}</strong>
          <span>Overdue</span>
        </div>
        <div class="kw-stat">
          <strong>{{ summary.dueOpen }}</strong>
          <span>Due today</span>
        </div>
        <div class="kw-stat">
          <strong>{{ summary.completedToday }}</strong>
          <span>Finished today</span>
        </div>
        <button
          type="button"
          class="kw-stat"
          style="border: 0; text-align: left; cursor: pointer; font-family: inherit"
          @click="goToTab('weather')"
        >
          <strong v-if="nextSlot" style="font-size: 1rem">
            {{ nextSlot.temperature }}°C · {{ nextSlot.desc }}
          </strong>
          <strong v-else style="font-size: 0.86rem">Set a weather location</strong>
          <span>{{ weatherLocation?.label ?? 'BMKG forecast' }}</span>
        </button>
      </div>
    </section>

    <div class="kw-mt-md kw-reveal">
      <TaskQuickAdd />
    </div>

    <section v-if="workspace.tasks.length === 0" class="kw-section kw-reveal">
      <div class="kw-empty">
        <WorkspaceIcon name="target" :size="30" />
        <strong>Your day starts with one task</strong>
        <p>
          Add a task above, give it a priority and maybe a deadline. Kerja keeps
          everything on this device, works offline, and only touches GitHub when
          you press Sync.
        </p>
      </div>
    </section>

    <template v-else>
      <section v-if="focus.length" class="kw-section kw-reveal">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="target" :size="19" />
            Focus now
            <span class="kw-count">{{ focus.length }}</span>
          </h2>
          <span class="kw-hint">Highest priority first</span>
        </header>
        <div class="kw-focus">
          <TaskRow
            v-for="item in focus"
            :key="item.task.id"
            :task="item.task"
            :now="now"
            :forecast="weather.forecast"
            :reason="item.reason"
            @edit="edit"
          />
        </div>
      </section>

      <section v-if="groups.overdue.length" class="kw-section kw-reveal">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="warning" :size="19" />
            Overdue
            <span class="kw-count">{{ groups.overdue.length }}</span>
          </h2>
        </header>
        <div class="kw-task-list">
          <TaskRow
            v-for="task in groups.overdue"
            :key="task.id"
            :task="task"
            :now="now"
            :forecast="weather.forecast"
            @edit="edit"
          />
        </div>
      </section>

      <section v-if="groups.today.length" class="kw-section kw-reveal">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="today" :size="19" />
            Today's list
            <span class="kw-count">{{ groups.today.length }}</span>
          </h2>
        </header>
        <div class="kw-task-list">
          <TaskRow
            v-for="task in groups.today"
            :key="task.id"
            :task="task"
            :now="now"
            :forecast="weather.forecast"
            @edit="edit"
          />
        </div>
      </section>

      <section v-if="upcoming.length" class="kw-section kw-reveal">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="calendar" :size="19" />
            Next up
          </h2>
          <button type="button" class="kw-btn kw-btn--small" @click="goToTab('tasks')">
            All tasks
          </button>
        </header>
        <div class="kw-days">
          <div v-for="day in upcoming" :key="day.dayKey" class="kw-day">
            <header class="kw-day-head">
              <strong>{{ day.label }}</strong>
              <span>{{ day.tasks.length }} task{{ day.tasks.length === 1 ? '' : 's' }}</span>
            </header>
            <div class="kw-task-list" style="padding: 0.45rem">
              <TaskRow
                v-for="task in day.tasks.slice(0, 3)"
                :key="task.id"
                :task="task"
                :now="now"
                :forecast="weather.forecast"
                @edit="edit"
              />
              <p v-if="day.tasks.length > 3" class="kw-hint" style="margin: 0.2rem 0.4rem">
                {{ day.tasks.length - 3 }} more scheduled
              </p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="completedToday.length" class="kw-section kw-reveal">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="check" :size="19" />
            Completed today
            <span class="kw-count">{{ completedToday.length }}</span>
          </h2>
          <button type="button" class="kw-btn kw-btn--small" @click="showCompleted = !showCompleted">
            {{ showCompleted ? 'Hide' : 'Show' }}
          </button>
        </header>
        <div v-if="showCompleted" class="kw-task-list">
          <TaskRow
            v-for="task in completedToday"
            :key="task.id"
            :task="task"
            :now="now"
            :forecast="weather.forecast"
            @edit="edit"
          />
        </div>
      </section>

      <section v-if="groups.unscheduled.length" class="kw-section kw-reveal">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="list" :size="19" />
            No date yet
            <span class="kw-count">{{ groups.unscheduled.length }}</span>
          </h2>
          <span class="kw-hint">Give these a deadline when you are ready</span>
        </header>
        <div class="kw-task-list">
          <TaskRow
            v-for="task in groups.unscheduled.slice(0, 4)"
            :key="task.id"
            :task="task"
            :now="now"
            :forecast="weather.forecast"
            @edit="edit"
          />
        </div>
      </section>

      <section v-if="groups.completed.length && !completedToday.length" class="kw-section kw-reveal">
        <header class="kw-section-head">
          <h2>
            <WorkspaceIcon name="check" :size="19" />
            Recently completed
          </h2>
          <button type="button" class="kw-btn kw-btn--small" @click="goToTab('tasks')">
            View all
          </button>
        </header>
        <p class="kw-hint">
          {{ groups.completed.length }} completed task{{ groups.completed.length === 1 ? '' : 's' }} ·
          last finished {{ dateTimeLabel(groups.completed[0].completedAt, now) }}
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.today {
  display: block;
}
</style>
