// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi, sampleManuscript } from '../../app/fake-plot-device-api'
import { useInspectorStore } from '../../app/inspector-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import OverviewView from './OverviewView.vue'
import { useWorkbenchStore } from '../../app/workbench-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([
    useManuscriptStore().load(),
    useCodexStore().load(),
    useInspectorStore().loadVocabulary()
  ])
})

describe('OverviewView', () => {
  it('lists chapters by part with status, POV, and thread names', () => {
    const view = mount(OverviewView)
    expect(view.text()).toContain('Part I')
    expect(view.text()).toContain('The Ferry')
    expect(view.text()).toContain('Ilka')
    expect(view.text()).toContain('Main plot')
  })

  it('filters, and says how many of a part’s chapters match', async () => {
    const view = mount(OverviewView)
    const [, pov] = view.findAll('select')
    await pov?.setValue('Ilka')
    expect(view.text()).toContain('1 of 2')
    expect(view.text()).not.toContain('First frost')
    const clear = view.findAll('button').find((button) => button.text() === 'Clear filters')
    await clear?.trigger('click')
    expect(view.text()).toContain('First frost')
  })

  it('translates controls and generated labels while preserving filters and authored values', async () => {
    const view = mount(OverviewView)
    const [status, pov] = view.findAll('select')
    await status?.setValue('')
    await pov?.setValue('Ilka')
    expect(view.text()).toContain('1 of 2')

    useUiLanguageStore().locale = 'he'
    await view.vm.$nextTick()

    expect(view.get('h1').text()).toBe('מבט־על')
    expect(view.get('[role="group"]').attributes('aria-label')).toBe('מסננים')
    expect(view.text()).toContain('1 מתוך 2')
    expect(view.text()).toContain('The Ferry')
    expect(view.text()).toContain('ללא סטטוס')
    expect(view.get('select').element.value).toBe('')
    expect(view.findAll('select')[1]?.element.value).toBe('Ilka')
    expect(view.find('button.quiet').text()).toBe('ניקוי המסננים')

    await view.get('button.quiet').trigger('click')
    expect(view.text()).toContain('First frost')
  })

  it('reorders filter choices by locale while retaining the authored selection', async () => {
    const current = useManuscriptStore().manuscript
    if (current === null) throw new Error('Expected a manuscript')
    useManuscriptStore().manuscript = {
      ...current,
      parts: current.parts.map((part) => ({
        ...part,
        chapters: part.chapters.map((chapter, index) => ({
          ...chapter,
          pov: [index === 0 ? 'שירה' : 'Ari']
        }))
      }))
    }
    const stored = useManuscriptStore().manuscript
    const getManuscript = vi.spyOn(fake.api.manuscript, 'getManuscript')
    const view = mount(OverviewView)
    const pov = view.findAll('select')[1]
    if (pov === undefined) throw new Error('Expected a POV filter')
    const names = (): string[] =>
      Array.from(pov.element.options)
        .map((option) => option.value)
        .filter((value) => value !== '*')

    expect(names()).toEqual(['Ari', 'שירה'])
    await pov.setValue('Ari')
    const select = pov.element
    useUiLanguageStore().locale = 'he'
    await view.vm.$nextTick()

    expect(names()).toEqual(['שירה', 'Ari'])
    expect(select.value).toBe('Ari')
    expect(useManuscriptStore().manuscript).toBe(stored)
    expect(getManuscript).not.toHaveBeenCalled()
    expect(view.text()).toContain('First frost')
    view.unmount()
  })

  it('formats chapter word counts with the interface locale', async () => {
    const manuscript = {
      ...sampleManuscript,
      parts: sampleManuscript.parts.map((part) => ({
        ...part,
        wordCount: 1234,
        chapters: part.chapters.map((chapter, index) => ({
          ...chapter,
          wordCount: index === 0 ? 1234 : chapter.wordCount
        }))
      }))
    }
    vi.spyOn(fake.api.manuscript, 'getManuscript').mockResolvedValue({
      ok: true,
      value: manuscript
    })
    await useManuscriptStore().load()
    useUiLanguageStore().locale = 'he'

    const view = mount(OverviewView)
    expect(view.find('.words').text()).toBe(new Intl.NumberFormat('he').format(1234))
  })

  it('edits a synopsis in place, writing only that key', async () => {
    const view = mount(OverviewView)
    const cell = view.findAll('button.show').find((button) => button.text() === 'Add a synopsis…')
    await cell?.trigger('click')
    const box = view.get('textarea')
    await box.setValue('The ferry docks.')
    await box.trigger('blur')
    await flushPromises()
    expect(fake.properties.get('The Ferry.md')?.synopsis).toBe('The ferry docks.')
  })

  it('opens a chapter to write, leaving the Overview', async () => {
    useWorkbenchStore().centerView = 'overview'
    const view = mount(OverviewView)
    const title = view.findAll('button.open').find((button) => button.text() === 'First frost')
    await title?.trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('First frost.md')
    expect(useWorkbenchStore().centerView).toBe('write')
  })
})
