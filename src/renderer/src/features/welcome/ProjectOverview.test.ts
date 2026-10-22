// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleSummary, createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import ProjectOverview from './ProjectOverview.vue'

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

describe('ProjectOverview localization', () => {
  it('translates generated counts and overview chrome without changing project data', async () => {
    const workspace = useWorkspaceStore()
    const project = {
      ...sampleSummary,
      title: 'סיפור <טיוטה>',
      author: 'יעל',
      root: '/novels/סיפור',
      readOnly: true,
      counts: {
        part: 1,
        chapter: 1234,
        character: 2,
        location: 3,
        note: 1,
        outline: 2,
        scene: 1,
        untyped: 2
      }
    }
    workspace.project = project
    const refresh = vi.spyOn(fake.api.workspace, 'refreshProject')
    const page = mount(ProjectOverview)

    expect(page.find('.eyebrow').text()).toBe('Project')
    expect(page.get('.hint').text()).toBe('Choose a chapter in the binder to start writing.')
    expect(page.get('.banner').text()).toBe(
      'This project is open read-only, so Plot Device won’t change its files.'
    )
    expect(page.get('#contents-heading').text()).toBe('Contents')

    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(document.documentElement.dir).toBe('rtl')
    expect(page.find('.eyebrow').text()).toBe('פרויקט')
    expect(page.get('.hint').text()).toBe('יש לבחור פרק בקלסר כדי להתחיל לכתוב.')
    expect(page.get('.banner').text()).toBe(
      'הפרויקט פתוח לקריאה בלבד, ולכן Plot Device לא ישנה את הקבצים שלו.'
    )
    expect(page.get('#contents-heading').text()).toBe('תוכן הפרויקט')
    expect(page.findAll('.counts li').map((item) => item.text())).toEqual([
      '1 חלק',
      `${new Intl.NumberFormat('he').format(1234)} פרקים`,
      '2 דמויות',
      '3 מקומות',
      '1 הערה',
      '2 מתווים',
      '1 סצנה',
      '2 קבצים ללא סוג'
    ])
    expect(page.get('h1').text()).toBe(project.title)
    expect(page.get('.author').text()).toBe(project.author)
    expect(page.get('.root').text()).toBe(project.root)
    expect(page.find('img, script').exists()).toBe(false)
    expect(workspace.project).toEqual(project)
    expect(refresh).not.toHaveBeenCalled()
    page.unmount()
  })

  it('translates the empty-project state without inventing count rows', async () => {
    const workspace = useWorkspaceStore()
    workspace.project = {
      ...sampleSummary,
      counts: {
        part: 0,
        chapter: 0,
        character: 0,
        location: 0,
        note: 0,
        outline: 0,
        scene: 0,
        untyped: 0
      }
    }
    const page = mount(ProjectOverview)
    expect(page.get('.muted').text()).toBe('No markdown files yet.')
    expect(page.findAll('.counts li')).toHaveLength(0)
    await useUiLanguageStore().change('he')
    await flushPromises()
    expect(page.get('.muted').text()).toBe('עדיין אין קובצי Markdown.')
    expect(page.findAll('.counts li')).toHaveLength(0)
    page.unmount()
  })
})
