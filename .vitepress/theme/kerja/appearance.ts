/**
 * Light / dark / system appearance, shared by the workspace shell and the
 * command palette. Mirrors VitePress's own `vitepress-theme-appearance` key so
 * navigating between /kerja and the rest of the site keeps the same theme.
 */
import { ref } from 'vue'

export type Mode = 'system' | 'light' | 'dark'

export const mode = ref<Mode>('system')
export const isDark = ref(false)

export const THEME_OPTIONS: Array<{ id: Mode; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Auto' }
]

let media: MediaQueryList | null = null
let installed = false

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyMode(): void {
  if (typeof window === 'undefined') return
  const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark())
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
  try {
    window.localStorage.setItem(
      'vitepress-theme-appearance',
      mode.value === 'system' ? 'auto' : mode.value
    )
  } catch {
    /* private mode */
  }
}

export function pickMode(next: Mode): void {
  mode.value = next
  applyMode()
}

export function cycleTheme(): void {
  pickMode(isDark.value ? 'light' : 'dark')
}

export function initAppearance(): void {
  if (typeof window === 'undefined' || installed) return
  installed = true
  try {
    const stored = window.localStorage.getItem('vitepress-theme-appearance')
    if (stored === 'dark' || stored === 'light') mode.value = stored
  } catch {
    /* ignore */
  }
  applyMode()
  media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    if (mode.value === 'system') applyMode()
  })
}
