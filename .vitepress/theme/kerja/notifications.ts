/**
 * Browser notifications, requested only when the visitor asks for them.
 *
 * This is a plain `new Notification()` integration. It works while the browser
 * is running with the workspace open in a tab, including a background tab. It
 * does **not** work once the browser is fully closed, because there is no
 * service worker push subscription — the UI says so instead of pretending.
 */
import { ref } from 'vue'

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

const PREFERENCE_KEY = 'kerja-browser-notifications-v1'

/** Visitor preference, independent from the browser permission itself. */
export const browserNotificationsEnabled = ref(false)

export function readNotificationPreference(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) === '1'
  } catch {
    return false
  }
}

export function setNotificationPreference(enabled: boolean): void {
  browserNotificationsEnabled.value = enabled
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFERENCE_KEY, enabled ? '1' : '0')
  } catch {
    /* private mode */
  }
}

export function browserPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as NotificationPermissionState
}

/** Ask the browser for permission. Must be called from a user gesture. */
export async function requestBrowserPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const result = await Notification.requestPermission()
    return result as NotificationPermissionState
  } catch {
    return 'denied'
  }
}

/**
 * Show a browser notification. Returns false when there is no usable
 * permission or the browser rejects it; callers still show the in-app banner.
 */
export function showBrowserNotification(title: string, body: string, tag?: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  if (!browserNotificationsEnabled.value) return false
  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: '/images/flessan-icon-180.png',
      badge: '/images/flessan-icon-64.png'
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    return true
  } catch {
    return false
  }
}

/** Plain-language description of when notifications can actually fire. */
export function notificationLimitations(): string {
  return 'Notifications only appear while this browser is open. If the browser is completely closed, Kerja cannot notify you; closing the tab may also stop them on some systems.'
}

export function permissionLabel(state: NotificationPermissionState): string {
  switch (state) {
    case 'granted':
      return 'Allowed'
    case 'denied':
      return 'Blocked in this browser'
    case 'unsupported':
      return 'Not supported here'
    default:
      return 'Not asked yet'
  }
}
