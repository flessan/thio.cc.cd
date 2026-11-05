/**
 * Pure task queries: buckets, scoring, filtering, sorting and progress.
 * None of this touches the DOM or storage, which keeps it easy to test and
 * makes the dashboard and the task list agree on what "today" means.
 */
import {
  DAY,
  HOUR,
  addDays,
  endOfDay,
  localDayKey,
  minutesBetween,
  parseDate,
  startOfDay
} from './dates'
import { PRIORITY_RANK, subtaskProgress, type Priority, type Task } from './model'

export type TaskBucket = 'overdue' | 'today' | 'upcoming' | 'completed' | 'unscheduled'
export type TaskStatusFilter = 'all' | 'open' | 'done'
export type TaskSort = 'smart' | 'due' | 'priority' | 'created' | 'title' | 'estimate'

export const TASK_SORT_LABELS: Record<TaskSort, string> = {
  smart: 'Smart focus',
  due: 'Due date',
  priority: 'Priority',
  created: 'Newest',
  title: 'Title',
  estimate: 'Estimate'
}

export const TASK_BUCKET_LABELS: Record<TaskBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  unscheduled: 'No date',
  completed: 'Completed'
}

/** Is a task still actionable? */
export function isOpen(task: Task): boolean {
  return task.status !== 'done'
}

export function isOverdue(task: Task, now = new Date()): boolean {
  const due = parseDate(task.dueAt)
  return isOpen(task) && Boolean(due && due.getTime() < now.getTime())
}

/** Due today, starting today, or already started and still open. */
export function isTodayTask(task: Task, now = new Date()): boolean {
  if (!isOpen(task)) return false
  const key = localDayKey(now)
  const due = parseDate(task.dueAt)
  const start = parseDate(task.startAt)
  if (due && localDayKey(due) === key) return true
  if (start && localDayKey(start) === key) return true
  if (start && start.getTime() <= now.getTime() && !due) return true
  return false
}

export function isCompletedToday(task: Task, now = new Date()): boolean {
  const completed = parseDate(task.completedAt)
  return task.status === 'done' && Boolean(completed && localDayKey(completed) === localDayKey(now))
}

export function bucketOf(task: Task, now = new Date()): TaskBucket {
  if (!isOpen(task)) return 'completed'
  if (isOverdue(task, now)) return 'overdue'
  if (isTodayTask(task, now)) return 'today'
  const due = parseDate(task.dueAt)
  const start = parseDate(task.startAt)
  if (due || start) return 'upcoming'
  return 'unscheduled'
}

/**
 * Focus score: priority dominates, then urgency. Overdue work always outranks
 * work that is merely due today, and reminders that are firing add a nudge.
 */
export function taskScore(task: Task, now = new Date()): number {
  if (!isOpen(task)) return -1
  const rank = PRIORITY_RANK[task.priority]
  let score = rank * 1_000
  const due = parseDate(task.dueAt)
  const start = parseDate(task.startAt)

  if (due) {
    const hours = (due.getTime() - now.getTime()) / HOUR
    if (hours < 0) {
      score += 2_000 + Math.min(1_000, Math.abs(hours) * 12)
    } else if (localDayKey(due) === localDayKey(now)) {
      score += 1_400 + Math.max(0, 200 - hours * 12)
    } else if (hours <= 72) {
      score += 700 - hours * 4
    } else {
      score += Math.max(0, 200 - hours / 12)
    }
  }

  if (start) {
    const startDiff = start.getTime() - now.getTime()
    if (startDiff <= 0) score += 160
    else if (startDiff <= 4 * HOUR) score += 90
  }

  const reminder = parseDate(task.reminderAt)
  if (reminder && reminder.getTime() <= now.getTime() && isOpen(task)) score += 260

  // A task with some subtasks finished is already in motion.
  const { ratio } = subtaskProgress(task)
  if (ratio > 0 && ratio < 1) score += 40

  return score
}

function compareByDue(a: Task, b: Task): number {
  const aDue = parseDate(a.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY
  const bDue = parseDate(b.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY
  return aDue - bDue
}

export function sortTasks(tasks: Task[], sort: TaskSort, now = new Date()): Task[] {
  const list = [...tasks]
  switch (sort) {
    case 'due':
      return list.sort(
        (a, b) => compareByDue(a, b) || PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      )
    case 'priority':
      return list.sort(
        (a, b) =>
          PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
          compareByDue(a, b) ||
          a.title.localeCompare(b.title)
      )
    case 'created':
      return list.sort(
        (a, b) => (parseDate(b.createdAt)?.getTime() ?? 0) - (parseDate(a.createdAt)?.getTime() ?? 0)
      )
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    case 'estimate':
      return list.sort(
        (a, b) =>
          (b.estimateMinutes ?? 0) - (a.estimateMinutes ?? 0) || compareByDue(a, b)
      )
    case 'smart':
    default:
      return list.sort(
        (a, b) =>
          taskScore(b, now) - taskScore(a, now) ||
          compareByDue(a, b) ||
          a.title.localeCompare(b.title)
      )
  }
}

export interface TaskFilters {
  search?: string
  status?: TaskStatusFilter
  priorities?: Priority[]
  categories?: string[]
  showCompleted?: boolean
}

/** Case- and accent-insensitive substring match over the useful text fields. */
export function matchesSearch(task: Task, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  const haystack = [
    task.title,
    task.description,
    task.category,
    ...task.subtasks.map((item) => item.title)
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

export function filterTasks(tasks: Task[], filters: TaskFilters = {}): Task[] {
  const priorities = filters.priorities?.length ? new Set(filters.priorities) : null
  const categories = filters.categories?.length ? new Set(filters.categories) : null
  return tasks.filter((task) => {
    if (filters.status === 'open' && !isOpen(task)) return false
    if (filters.status === 'done' && isOpen(task)) return false
    if (priorities && !priorities.has(task.priority)) return false
    if (categories && !categories.has(task.category || 'Uncategorised')) return false
    if (!filters.showCompleted && filters.status === undefined && !isOpen(task)) return false
    if (filters.search && !matchesSearch(task, filters.search)) return false
    return true
  })
}

export interface WorkspaceGroups {
  overdue: Task[]
  today: Task[]
  upcoming: Task[]
  unscheduled: Task[]
  completed: Task[]
}

/** Group by bucket while keeping the requested sort inside each group. */
export function groupTasks(tasks: Task[], sort: TaskSort = 'smart', now = new Date()): WorkspaceGroups {
  const groups: WorkspaceGroups = {
    overdue: [],
    today: [],
    upcoming: [],
    unscheduled: [],
    completed: []
  }
  tasks.forEach((task) => groups[bucketOf(task, now)].push(task))
  for (const key of Object.keys(groups) as TaskBucket[]) {
    groups[key] = sortTasks(groups[key], key === 'completed' ? 'due' : sort, now)
  }
  groups.completed.sort(
    (a, b) => (parseDate(b.completedAt)?.getTime() ?? 0) - (parseDate(a.completedAt)?.getTime() ?? 0)
  )
  return groups
}

/** Categories that actually exist in the workspace, plus Uncategorised. */
export function collectCategories(tasks: Task[]): string[] {
  const names = new Set<string>()
  tasks.forEach((task) => names.add(task.category.trim() || 'Uncategorised'))
  return [...names].sort((a, b) => a.localeCompare(b))
}

export interface ProgressSummary {
  /** Tasks whose deadline is today, plus anything completed today. */
  planned: number
  completed: number
  ratio: number
  overdue: number
  dueToday: number
  dueOpen: number
  completedToday: number
  remainingMinutes: number
  totalMinutes: number
}

/**
 * The "today" plan used by the dashboard ring. A task counts as planned when
 * its deadline is today; tasks completed today also count so the ring can reach
 * 100% after finishing work that was never given a deadline.
 */
export function todayProgress(tasks: Task[], now = new Date()): ProgressSummary {
  const todayKey = localDayKey(now)
  const plannedTasks = tasks.filter((task) => {
    const due = parseDate(task.dueAt)
    const completed = parseDate(task.completedAt)
    const dueToday = Boolean(due && localDayKey(due) === todayKey)
    // Work completed today counts even when it never had a deadline today, so
    // the ring reflects the effort actually spent rather than only deadlines.
    const doneToday = Boolean(
      task.status === 'done' && completed && localDayKey(completed) === todayKey
    )
    return dueToday || doneToday
  })
  const dueToday = tasks.filter((task) => {
    const due = parseDate(task.dueAt)
    return Boolean(due && localDayKey(due) === todayKey)
  })
  const completedToday = tasks.filter((task) => isCompletedToday(task, now))
  const overdue = tasks.filter((task) => isOverdue(task, now))
  const openToday = dueToday.filter(isOpen)
  const openOverdue = overdue.filter(isOpen)
  // A task that is both overdue and due today must only be counted once.
  const remainingTasks = new Map<string, Task>()
  ;[...openToday, ...openOverdue].forEach((task) => remainingTasks.set(task.id, task))
  const remainingMinutes = [...remainingTasks.values()].reduce(
    (sum, task) => sum + (task.estimateMinutes ?? 0),
    0
  )
  const totalMinutes = dueToday.reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0)
  const completed = plannedTasks.filter((task) => task.status === 'done').length
  return {
    planned: plannedTasks.length,
    completed,
    ratio: plannedTasks.length === 0 ? 0 : completed / plannedTasks.length,
    overdue: overdue.length,
    dueToday: dueToday.length,
    dueOpen: openToday.length,
    completedToday: completedToday.length,
    remainingMinutes,
    totalMinutes
  }
}

export interface FocusItem {
  task: Task
  bucket: TaskBucket
  reason: string
}

/**
 * What the dashboard puts in front of the visitor: overdue work first, then
 * today's ranked tasks, then the most important undated task — never the whole
 * list. `limit` keeps it to a small, actionable set.
 */
export function focusTasks(tasks: Task[], now = new Date(), limit = 3): FocusItem[] {
  const open = tasks.filter(isOpen)
  const overdue = sortTasks(open.filter((task) => isOverdue(task, now)), 'smart', now)
  const today = sortTasks(
    open.filter((task) => !isOverdue(task, now) && isTodayTask(task, now)),
    'smart',
    now
  )
  const rest = sortTasks(
    open.filter((task) => !isOverdue(task, now) && !isTodayTask(task, now)),
    'priority',
    now
  )

  const items: FocusItem[] = []
  const seen = new Set<string>()
  const push = (task: Task, bucket: TaskBucket, reason: string) => {
    if (seen.has(task.id) || items.length >= limit) return
    seen.add(task.id)
    items.push({ task, bucket, reason })
  }

  overdue.forEach((task) => push(task, 'overdue', 'Overdue'))
  today.forEach((task) => push(task, 'today', 'Due today'))
  // Fill the remaining slots with the highest-priority task that has no date,
  // so the dashboard never looks empty while work is waiting.
  rest.forEach((task) => push(task, bucketOf(task, now), 'No date yet'))
  return items.slice(0, limit)
}

export interface UpcomingGroup {
  dayKey: string
  label: string
  tasks: Task[]
}

/** Next seven days of scheduled work, grouped by local day. */
export function upcomingDays(tasks: Task[], now = new Date(), days = 7): UpcomingGroup[] {
  const groups: UpcomingGroup[] = []
  const start = startOfDay(now)
  for (let index = 1; index <= days; index += 1) {
    const day = addDays(start, index)
    const key = localDayKey(day)
    const items = tasks
      .filter((task) => {
        if (!isOpen(task)) return false
        const due = parseDate(task.dueAt)
        if (due && localDayKey(due) === key) return true
        const taskStart = parseDate(task.startAt)
        if (taskStart && localDayKey(taskStart) === key && !due) return true
        return false
      })
      .sort((a, b) => compareByDue(a, b) || PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])
    if (items.length) {
      groups.push({
        dayKey: key,
        label: index === 1 ? 'Tomorrow' : new Intl.DateTimeFormat('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }).format(day),
        tasks: items
      })
    }
  }
  return groups
}

/** Everything due in the next `hours`, used by the weather outlook. */
export function scheduledWithin(tasks: Task[], from: Date, to: Date): Task[] {
  return tasks.filter((task) => {
    if (!isOpen(task)) return false
    const at = parseDate(task.startAt) ?? parseDate(task.dueAt)
    if (!at) return false
    return at.getTime() >= from.getTime() - DAY && at.getTime() <= to.getTime()
  })
}

/** Minutes until the next deadline; null when nothing is scheduled. */
export function nextDeadline(tasks: Task[], now = new Date()): { task: Task; minutes: number } | null {
  let best: { task: Task; minutes: number } | null = null
  tasks.forEach((task) => {
    if (!isOpen(task)) return
    const due = parseDate(task.dueAt)
    if (!due) return
    const minutes = minutesBetween(now, due)
    if (minutes < 0) return
    if (!best || minutes < best.minutes) best = { task, minutes }
  })
  return best
}

/** True when the deadline falls on today's calendar day. */
export function isDueOn(task: Task, day: Date): boolean {
  const due = parseDate(task.dueAt)
  return Boolean(due && localDayKey(due) === localDayKey(day))
}

/** Clamp an end date into a sane end-of-day for day-based pickers. */
export function endOfDayISO(day: Date): string {
  return endOfDay(day).toISOString()
}
