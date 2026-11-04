/** Shared UI state so the shell, keyboard shortcuts and panels can navigate. */
import { reactive, ref } from 'vue'
import type { Task } from './model'

export type WorkspaceTab = 'home' | 'today' | 'tasks' | 'weather' | 'cloud'

export const WORKSPACE_TABS: Array<{
  id: WorkspaceTab
  label: string
  short: string
  hint: string
}> = [
  { id: 'home', label: 'Home', short: 'Home', hint: 'search and shortcuts' },
  { id: 'today', label: 'Today', short: 'Today', hint: 'your daily focus' },
  { id: 'tasks', label: 'Tasks', short: 'Tasks', hint: 'everything, filtered' },
  { id: 'weather', label: 'Weather', short: 'Weather', hint: 'BMKG forecast' },
  { id: 'cloud', label: 'Cloud', short: 'Cloud', hint: 'manual GitHub sync' }
]

export const activeTab = ref<WorkspaceTab>('home')
export const reminderSheetOpen = ref(false)
/** Increment to ask the Home tab to focus its search field. */
export const searchFocusRequest = ref(0)

export interface EditorState {
  open: boolean
  taskId: string | null
  seed: Partial<Task> | null
}

export const taskEditor = reactive<EditorState>({ open: false, taskId: null, seed: null })

export function goToTab(tab: WorkspaceTab): void {
  activeTab.value = tab
}

export function focusGlobalSearch(): void {
  activeTab.value = 'home'
  searchFocusRequest.value += 1
}

export function openTaskEditor(taskId?: string, seed?: Partial<Task>): void {
  taskEditor.open = true
  taskEditor.taskId = taskId ?? null
  taskEditor.seed = seed ?? null
}

export function closeTaskEditor(): void {
  taskEditor.open = false
  taskEditor.taskId = null
  taskEditor.seed = null
}

export function openReminderSheet(): void {
  reminderSheetOpen.value = true
}

export function closeReminderSheet(): void {
  reminderSheetOpen.value = false
}
