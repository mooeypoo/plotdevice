// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderChoiceDto, RecentProjectDto } from '../../../../contract/dtos'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import InitializePrompt from './InitializePrompt.vue'
import RecentProjectList from './RecentProjectList.vue'
import WelcomeScreen from './WelcomeScreen.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
const name = 'יעל <img src=x> Book'
const root = '/novels/יעל <b> Book'
const chosen: FolderChoiceDto = { root, name, isProject: false }
const date = '2026-10-21T12:00:00.000Z'
const recents: readonly RecentProjectDto[] = [
  { root, title: name, available: true, lastOpenedAt: date },
  { root: '/gone', title: 'Gone', available: false, lastOpenedAt: 'not-a-date' }
]

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
})
afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
})

describe('welcome and project initialization translation', () => {
  it('translates the initialization form live, preserving the exact draft and focused control', async () => {
    const workspace = useWorkspaceStore()
    await workspace.useFolder(chosen)
    const page = mount(InitializePrompt, { attachTo: document.body })
    const input = page.get<HTMLInputElement>('input')
    await input.setValue('My novel טיוטה <b>')
    input.element.focus()
    const initialize = vi.spyOn(fake.api.workspace, 'initializeProject')
    const list = vi.spyOn(fake.api.workspace, 'listRecentProjects')
    const open = vi.spyOn(fake.api.workspace, 'openProject')
    const before = [...fake.files]
    expect(page.get('h1').text()).toBe(`Make “\u2068${name}\u2069” a project?`)
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(page.get('h1').text()).toBe(`להפוך את „\u2068${name}\u2069” לפרויקט?`)
    expect(page.get('form label').text()).toBe('כותרת')
    expect(page.get('button[type=submit]').text()).toBe('יצירת פרויקט')
    expect(page.get('form button[type=button]:not([role="combobox"])').text()).toBe('חזרה')
    expect(page.text()).toContain('novel.md')
    expect(page.text()).not.toContain('Nothing else')
    expect(page.find('img, b').exists()).toBe(false)
    expect(page.get('input').element).toBe(input.element)
    expect(input.element.value).toBe('My novel טיוטה <b>')
    expect(input.attributes('dir')).toBe('auto')
    expect(document.activeElement).toBe(input.element)
    expect(workspace.chosenFolder).toEqual(chosen)
    expect(initialize).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    expect([...fake.files]).toEqual(before)
    expect(fake.saves).toEqual([])
    await useUiLanguageStore().change('en')
    await flushPromises()
    expect(page.get('form label').text()).toBe('Title')
    expect(page.get('input').element).toBe(input.element)
    expect(input.element.value).toBe('My novel טיוטה <b>')
    expect(document.activeElement).toBe(input.element)
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(initialize).toHaveBeenCalledExactlyOnceWith(root, 'My novel טיוטה <b>', 'en')
    page.unmount()
  })

  it.each(['above', 'below'] as const)(
    'translates the project-%s refusal without changing the chosen folder or navigation',
    async (where) => {
      const workspace = useWorkspaceStore()
      await workspace.useFolder({
        ...chosen,
        ...(where === 'above'
          ? { projectAbove: { root: '/parent', title: name } }
          : { projectBelow: root })
      })
      const choice = workspace.chosenFolder
      const page = mount(InitializePrompt)
      const heading = page.get('h1').text()
      const open = vi.spyOn(fake.api.workspace, 'openProject')
      const initialize = vi.spyOn(fake.api.workspace, 'initializeProject')
      await useUiLanguageStore().change('he')
      await flushPromises()
      expect(page.get('h1').text()).not.toBe(heading)
      expect(page.get('h1').text()).toMatch(/[\u0590-\u05ff]/u)
      expect(page.text()).toContain(`\u2068${where === 'above' ? name : root}\u2069`)
      expect(page.text()).not.toContain('Projects')
      expect(page.find('img, b').exists()).toBe(false)
      expect(page.find('form').exists()).toBe(false)
      expect(workspace.chosenFolder).toBe(choice)
      expect(open).not.toHaveBeenCalled()
      expect(initialize).not.toHaveBeenCalled()
      if (where === 'above') {
        expect(page.get('button.primary').text()).toBe(`פתיחת \u2068${name}\u2069`)
        await page.get('button.primary').trigger('click')
        await flushPromises()
        expect(open).toHaveBeenCalledExactlyOnceWith('/parent')
      } else {
        await page.get('button:not([role="combobox"])').trigger('click')
        await flushPromises()
        expect(workspace.screen).toBe('welcome')
        expect(initialize).not.toHaveBeenCalled()
      }
      page.unmount()
    }
  )

  it('translates recent-project dates, missing state and accessible labels without replacing or reordering rows', async () => {
    const page = mount(RecentProjectList, {
      props: { recents, disabled: false },
      attachTo: document.body
    })
    const row = page.get('li').element
    const listing = page.props('recents')
    const button = page.get<HTMLButtonElement>('.remove').element
    button.focus()
    const list = vi.spyOn(fake.api.workspace, 'listRecentProjects')
    const remove = vi.spyOn(fake.api.workspace, 'removeRecentProject')
    const open = vi.spyOn(fake.api.workspace, 'openProject')
    expect(page.findAll('.date').map((value) => value.text())).toEqual([
      new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date)),
      ''
    ])
    const englishDate = page.get('.date').text()
    expect(button.getAttribute('aria-label')).toBe(
      `Remove \u2068${name}\u2069 from recent projects`
    )
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(page.get('h2').text()).toBe('פרויקטים אחרונים')
    expect(page.findAll('.date').map((value) => value.text())).toEqual([
      new Intl.DateTimeFormat('he', { dateStyle: 'medium' }).format(new Date(date)),
      ''
    ])
    expect(page.get('.date').text()).not.toBe(englishDate)
    expect(button.getAttribute('aria-label')).toBe(
      `הסרת \u2068${name}\u2069 מרשימת הפרויקטים האחרונים`
    )
    expect(button.title).toBe('הסרה מהרשימה (התיקייה לא תשתנה)')
    expect(page.findAll('.details')[1]?.text()).toBe('התיקייה לא נמצאה')
    expect(page.findAll('.open')[1]?.attributes('disabled')).toBeDefined()
    expect(page.get('li').element).toBe(row)
    expect(page.get('.remove').element).toBe(button)
    expect(document.activeElement).toBe(button)
    expect(page.find('img, b').exists()).toBe(false)
    expect(page.get('.title').text()).toBe(name)
    expect(page.get('.details').text()).toBe(root)
    expect(page.props('recents')).toBe(listing)
    expect(list).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    await page.get('.open').trigger('click')
    await page.get('.remove').trigger('click')
    expect(page.emitted('open')).toEqual([[root]])
    expect(page.emitted('remove')).toEqual([[root]])
    await page.setProps({ disabled: true })
    expect(page.get('.open').attributes('disabled')).toBeDefined()
    await page.get('.remove').trigger('click')
    expect(page.emitted('remove')).toHaveLength(2)
    page.unmount()
  })

  it('keeps an empty recent list hidden and switches all mounted welcome labels without refetching', async () => {
    const workspace = useWorkspaceStore()
    const page = mount(WelcomeScreen)
    expect(page.find('.recents').exists()).toBe(false)
    workspace.recents = recents
    await flushPromises()
    const list = vi.spyOn(fake.api.workspace, 'listRecentProjects')
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(page.get('button.primary').text()).toBe('פתיחת תיקייה…')
    expect(page.get('h2').text()).toBe('פרויקטים אחרונים')
    expect(list).not.toHaveBeenCalled()
    expect(workspace.recents).toEqual(recents)
    page.unmount()
  })
})
