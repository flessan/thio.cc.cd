// @vitest-environment jsdom
/**
 * Mounts the real shell and walks every tab, plus the task editor. This is a
 * smoke test: it catches template/setup drift that type checking cannot see.
 */
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import Kerja from '../.vitepress/theme/components/Kerja.vue'
import { activeTab, goToTab, openReminderSheet, openTaskEditor } from '../.vitepress/theme/kerja/ui'
import { workspace } from '../.vitepress/theme/kerja/state'

let wrapper: VueWrapper | null = null

async function settle() {
  await flushPromises()
  await nextTick()
  await nextTick()
}

beforeAll(() => {
  localStorage.clear()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  workspace.tasks.splice(0, workspace.tasks.length)
  localStorage.clear()
})

async function mountShell() {
  wrapper = mount(Kerja, { attachTo: document.body })
  await settle()
  return wrapper
}

describe('workspace shell', () => {
  it('mounts the dashboard without errors', async () => {
    const app = await mountShell()
    expect(app.find('.kw-app').exists()).toBe(true)
    expect(app.findAll('.kw-rail-item')).toHaveLength(5)
    expect(app.text()).toContain('Kerja')
    expect(activeTab.value).toBe('home')
  })

  it('switches across every tab', async () => {
    const app = await mountShell()
    for (const tab of ['today', 'tasks', 'weather', 'cloud', 'home'] as const) {
      goToTab(tab)
      await settle()
      expect(activeTab.value).toBe(tab)
      expect(app.find('.kw-main-inner').exists()).toBe(true)
    }
    expect(app.text()).toContain('shortcuts')
  })

  it('creates a task through the editor dialog', async () => {
    await mountShell()
    goToTab('today')
    openTaskEditor()
    await settle()

    const input = document.querySelector<HTMLInputElement>('#task-title')
    expect(input).not.toBeNull()
    input!.value = 'Buy rain cover'
    input!.dispatchEvent(new Event('input'))
    await nextTick()

    const create = Array.from(document.querySelectorAll<HTMLButtonElement>('.kw-dialog button')).find(
      (button) => button.textContent?.includes('Create task')
    )
    expect(create).toBeTruthy()
    create!.click()
    await settle()

    expect(workspace.tasks.some((task) => task.title === 'Buy rain cover')).toBe(true)
    expect(document.querySelector('#task-title')).toBeNull()
  })

  it('opens the reminder panel with honest copy', async () => {
    await mountShell()
    openReminderSheet()
    await settle()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Reminders')
    expect(text).toContain('only appear while this browser is open')
  })
})
