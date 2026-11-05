/**
 * A tiny toast queue shared by the workspace. Kept deliberately small: no
 * portal, no dependency, just a reactive array rendered by `ToastHost.vue`.
 */
import { ref } from 'vue'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastAction {
  label: string
  run: () => void
}

export interface Toast {
  id: string
  title: string
  message?: string
  tone: ToastTone
  actions: ToastAction[]
  createdAt: number
}

export const toasts = ref<Toast[]>([])
const MAX_TOASTS = 4

export function dismissToast(id: string): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function pushToast(
  input: {
    title: string
    message?: string
    tone?: ToastTone
    actions?: ToastAction[]
    duration?: number
  }
): string {
  const id = `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  const toast: Toast = {
    id,
    title: input.title,
    message: input.message,
    tone: input.tone ?? 'info',
    actions: input.actions ?? [],
    createdAt: Date.now()
  }
  toasts.value = [...toasts.value, toast].slice(-MAX_TOASTS)
  const duration = input.duration ?? 6000
  if (duration > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => dismissToast(id), duration)
  }
  return id
}
