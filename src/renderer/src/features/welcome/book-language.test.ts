// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePlotDeviceApi, sampleSummary } from '../../app/fake-plot-device-api'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import InitializePrompt from './InitializePrompt.vue'
import ProjectOverview from './ProjectOverview.vue'
import { chooseOption, selectedLabel } from '../../shared/select-field-testing'

let fake: ReturnType<typeof createFakePlotDeviceApi>

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

describe('choosing the book language', () => {
  it('starts a new book in the interface language, and sends the writer’s choice', async () => {
    await useUiLanguageStore().change('he')
    const workspace = useWorkspaceStore()
    await workspace.useFolder({ root: '/novels/new', name: 'new', isProject: false })
    const initialize = vi.spyOn(fake.api.workspace, 'initializeProject')
    const page = mount(InitializePrompt)

    expect(selectedLabel(page.get('.book-language [role="combobox"]'))).toBe('עברית')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(initialize).toHaveBeenCalledWith('/novels/new', 'new', 'he')
  })

  it('changes an open book’s language only when the writer applies it', async () => {
    const workspace = useWorkspaceStore()
    workspace.project = sampleSummary
    const set = vi.spyOn(fake.api.workspace, 'setBookLanguage')
    const page = mount(ProjectOverview)

    const select = page.get('.book-language [role="combobox"]')
    expect(selectedLabel(select)).toBe('Not set (English)')
    expect(page.find('.book-language button[type="submit"]').exists()).toBe(false)

    await chooseOption(select, 'he')
    expect(set).not.toHaveBeenCalled()
    await page.get('.book-language form').trigger('submit')
    await flushPromises()
    expect(set).toHaveBeenCalledExactlyOnceWith('he')
    expect(workspace.project.language).toEqual({ declared: 'he', direction: 'rtl' })
    expect(page.find('.book-language button[type="submit"]').exists()).toBe(false)
  })

  it('shows a declared language the app has no words for', () => {
    const workspace = useWorkspaceStore()
    workspace.project = { ...sampleSummary, language: { declared: 'ar', direction: 'rtl' } }
    const page = mount(ProjectOverview)
    expect(selectedLabel(page.get('.book-language [role="combobox"]'))).toBe(
      'ar (words in English)'
    )
  })
})
