import { describe, expect, it } from 'vitest'
import {
  bucketOf,
  collectCategories,
  filterTasks,
  focusTasks,
  groupTasks,
  isOverdue,
  sortTasks,
  todayProgress,
  upcomingDays
} from '../.vitepress/theme/kerja/tasks'
import {
  createTask,
  normalizeTask,
  subtaskProgress,
  validateTaskDraft
} from '../.vitepress/theme/kerja/model'

const now = new Date(2026, 10, 4, 9, 0, 0) // Wed 4 Nov 2026, 09:00 local

const task = (input: Parameters<typeof createTask>[0]) => createTask(input, now)

describe('task buckets', () => {
  it('separates overdue, today, upcoming, undated and completed work', () => {
    const overdue = task({ title: 'Overdue', dueAt: new Date(2026, 10, 4, 8, 0).toISOString() })
    const today = task({ title: 'Today', dueAt: new Date(2026, 10, 4, 17, 0).toISOString() })
    const upcoming = task({ title: 'Upcoming', dueAt: new Date(2026, 10, 6, 12, 0).toISOString() })
    const undated = task({ title: 'Someday' })
    const done = task({ title: 'Done', status: 'done', completedAt: now.toISOString() })

    expect(bucketOf(overdue, now)).toBe('overdue')
    expect(bucketOf(today, now)).toBe('today')
    expect(bucketOf(upcoming, now)).toBe('upcoming')
    expect(bucketOf(undated, now)).toBe('unscheduled')
    expect(bucketOf(done, now)).toBe('completed')
    expect(isOverdue(overdue, now)).toBe(true)
    expect(isOverdue(done, now)).toBe(false)
  })

  it('treats a started task without a deadline as today', () => {
    const started = task({ title: 'In motion', startAt: new Date(2026, 10, 4, 8, 0).toISOString() })
    expect(bucketOf(started, now)).toBe('today')
  })

  it('groups every task exactly once', () => {
    const tasks = [
      task({ title: 'a', dueAt: new Date(2026, 10, 3, 9, 0).toISOString() }),
      task({ title: 'b', dueAt: new Date(2026, 10, 4, 18, 0).toISOString() }),
      task({ title: 'c', dueAt: new Date(2026, 10, 9, 18, 0).toISOString() }),
      task({ title: 'd' }),
      task({ title: 'e', status: 'done' })
    ]
    const groups = groupTasks(tasks, 'smart', now)
    const total = Object.values(groups).reduce((sum, list) => sum + list.length, 0)
    expect(total).toBe(tasks.length)
  })
})

describe('focus scoring', () => {
  it('puts overdue critical work ahead of a high task due today', () => {
    const critical = task({
      title: 'Critical overdue',
      priority: 'critical',
      dueAt: new Date(2026, 10, 4, 7, 0).toISOString()
    })
    const high = task({
      title: 'High today',
      priority: 'high',
      dueAt: new Date(2026, 10, 4, 16, 0).toISOString()
    })
    const low = task({ title: 'Low', priority: 'low' })
    const focus = focusTasks([low, high, critical], now, 3)
    expect(focus.map((item) => item.task.title)).toEqual([
      'Critical overdue',
      'High today',
      'Low'
    ])
    expect(focus[0].reason).toBe('Overdue')
    expect(focus[1].reason).toBe('Due today')
    expect(focus[2].reason).toBe('No date yet')
  })

  it('never shows completed tasks in the focus list', () => {
    const done = task({ title: 'Finished', status: 'done', priority: 'critical' })
    expect(focusTasks([done], now)).toEqual([])
  })

  it('limits the focus list to the requested size', () => {
    const tasks = Array.from({ length: 8 }, (_, index) =>
      task({ title: `Task ${index}`, priority: 'high' })
    )
    expect(focusTasks(tasks, now, 3)).toHaveLength(3)
  })
})

describe('progress', () => {
  it('counts deadlines today and work completed today', () => {
    const dueToday = task({ title: 'Due today', dueAt: new Date(2026, 10, 4, 17, 0).toISOString() })
    const doneToday = task({
      title: 'Finished',
      status: 'done',
      completedAt: new Date(2026, 10, 4, 8, 0).toISOString()
    })
    const doneAnotherDay = task({
      title: 'Old',
      status: 'done',
      completedAt: new Date(2026, 10, 1, 8, 0).toISOString()
    })
    const summary = todayProgress([dueToday, doneToday, doneAnotherDay], now)
    expect(summary.planned).toBe(2)
    expect(summary.completed).toBe(1)
    expect(summary.ratio).toBe(0.5)
    expect(summary.dueToday).toBe(1)
    expect(summary.completedToday).toBe(1)
  })

  it('computes subtask ratios', () => {
    const withSubtasks = task({
      title: 'Ship',
      subtasks: [
        { id: 's1', title: 'One', done: true },
        { id: 's2', title: 'Two', done: false }
      ]
    })
    expect(subtaskProgress(withSubtasks)).toEqual({ done: 1, total: 2, ratio: 0.5 })
    expect(subtaskProgress(task({ title: 'Empty' }))).toEqual({ done: 0, total: 0, ratio: 0 })
  })

  it('summarises remaining estimates for today and overdue', () => {
    const a = task({
      title: 'a',
      estimateMinutes: 30,
      dueAt: new Date(2026, 10, 4, 17, 0).toISOString()
    })
    const b = task({
      title: 'b',
      estimateMinutes: 45,
      dueAt: new Date(2026, 10, 4, 6, 0).toISOString()
    })
    expect(todayProgress([a, b], now).remainingMinutes).toBe(75)
  })
})

describe('filters and sorting', () => {
  const tasks = [
    task({ title: 'Write report', category: 'Work', priority: 'high' }),
    task({ title: 'Buy milk', category: 'Errands', priority: 'low', status: 'done' }),
    task({ title: 'Study BMKG docs', category: 'Study', priority: 'medium', description: 'weather' })
  ]

  it('filters by status, priority, category and search text', () => {
    expect(filterTasks(tasks, { status: 'open' })).toHaveLength(2)
    expect(filterTasks(tasks, { status: 'done' })).toHaveLength(1)
    expect(filterTasks(tasks, { priorities: ['high'] })).toHaveLength(1)
    expect(filterTasks(tasks, { categories: ['Study'] })).toHaveLength(1)
    expect(filterTasks(tasks, { search: 'weather' })).toHaveLength(1)
    expect(filterTasks(tasks, { search: 'bmkg' })).toHaveLength(1)
    expect(filterTasks(tasks, { status: 'all' })).toHaveLength(3)
  })

  it('sorts by priority and by due date', () => {
    const sorted = sortTasks(tasks, 'priority', now)
    expect(sorted[0].priority).toBe('high')
    const due = sortTasks(
      [
        task({ title: 'later', dueAt: new Date(2026, 10, 9).toISOString() }),
        task({ title: 'sooner', dueAt: new Date(2026, 10, 5).toISOString() })
      ],
      'due',
      now
    )
    expect(due.map((item) => item.title)).toEqual(['sooner', 'later'])
  })

  it('collects categories, including uncategorised tasks when present', () => {
    expect(collectCategories(tasks)).toEqual(['Errands', 'Study', 'Work'])
    expect(collectCategories([...tasks, task({ title: 'Loose end' })])).toEqual([
      'Errands',
      'Study',
      'Uncategorised',
      'Work'
    ])
  })

  it('lists the next seven days of scheduled work', () => {
    const days = upcomingDays(
      [task({ title: 'Tomorrow', dueAt: new Date(2026, 10, 5, 10, 0).toISOString() })],
      now
    )
    expect(days[0].label).toBe('Tomorrow')
    expect(days[0].tasks[0].title).toBe('Tomorrow')
  })
})

describe('normalisation and validation', () => {
  it('repairs unknown priorities and invalid dates', () => {
    const normalized = normalizeTask({
      id: 'x',
      title: '  Hello  ',
      priority: 'urgent!',
      dueAt: 'not a date',
      estimateMinutes: -4
    })
    expect(normalized.priority).toBe('medium')
    expect(normalized.title).toBe('Hello')
    expect(normalized.dueAt).toBeNull()
    expect(normalized.estimateMinutes).toBeNull()
  })

  it('requires a title and sane dates', () => {
    expect(validateTaskDraft({ title: '   ' }).title).toBeTruthy()
    expect(
      validateTaskDraft({
        title: 'x',
        startAt: new Date(2026, 10, 5).toISOString(),
        dueAt: new Date(2026, 10, 4).toISOString()
      }).dates
    ).toBeTruthy()
    expect(
      validateTaskDraft({
        title: 'x',
        dueAt: new Date(2026, 10, 4).toISOString(),
        reminderAt: new Date(2026, 10, 5).toISOString()
      }).reminder
    ).toBeTruthy()
    expect(validateTaskDraft({ title: 'ok', estimateMinutes: 30 })).toEqual({})
  })
})
