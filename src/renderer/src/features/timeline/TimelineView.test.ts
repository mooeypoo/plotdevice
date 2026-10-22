// @vitest-environment happy-dom
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import TimelineView from './TimelineView.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

const mountView = async (): Promise<ReturnType<typeof mount>> => {
  const view = mount(TimelineView)
  await flushPromises()
  return view
}

describe('TimelineView', () => {
  it('translates timeline controls and labels while preserving view state without reloading', async () => {
    fake.timeline.current = { ...fake.timeline.current, outside: 1 }
    const get = vi.spyOn(fake.api.timeline, 'getTimeline')
    const language = useUiLanguageStore()
    await language.initialize()
    const view = await mountView()
    const reads = get.mock.calls.length

    const gap = view.get<HTMLInputElement>('.gap-setting input')
    gap.element.value = '5'
    await gap.trigger('change')
    const characters = view.findAll('button').find((button) => button.text() === 'Characters')
    await characters?.trigger('click')
    const story = view.findAll('button').find((button) => button.text() === 'Story order')
    await story?.trigger('click')
    await view.get('[aria-label="Zoom"] button:last-child').trigger('click')

    await language.change('he')
    await flushPromises()

    expect(view.get('h1').text()).toBe('ציר הזמן')
    expect(view.get('[aria-label="סדר"]').text()).toContain('סדר הקריאה')
    expect(view.get('[aria-label="שורות"]').text()).toContain('דמויות')
    expect(view.get('[aria-label="קנה מידה"] .on').text()).toBe('שנה')
    expect(view.text()).toContain('פרק מחוץ לסדר הספר')
    expect(view.findAll('.row-name').map((row) => row.text())).toContain('Ilka')

    await view.get('[aria-label="סדר"] button').trigger('click')
    const translatedGap = view.get<HTMLInputElement>('.gap-setting input')
    expect(translatedGap.element.value).toBe('5')
    expect(translatedGap.attributes('aria-label')).toBe('פער מינימלי בפרקים: 5')
    expect(view.find('.cell').attributes('aria-label')).toContain('Ilka')
    expect(view.find('.cell').attributes('aria-label')).toContain('פרק')
    expect(get).toHaveBeenCalledTimes(reads)
    expect(fake.saves).toEqual([])
    expect(fake.codexWrites).toEqual([])
    view.unmount()
  })

  it('reformats cached dates, issues, tooltips and axis labels without reloading', async () => {
    fake.timeline.current = {
      ...fake.timeline.current,
      chapters: fake.timeline.current.chapters.map((chapter) => ({ ...chapter, threads: ['main'] }))
    }
    const get = vi.spyOn(fake.api.timeline, 'getTimeline')
    const language = useUiLanguageStore()
    await language.initialize()
    const view = await mountView()
    const reads = get.mock.calls.length
    expect(view.findAll('.column-head')[0]?.text()).toContain('3 October 1952')
    await language.change('he')
    await flushPromises()
    expect(view.findAll('.column-head')[0]?.text()).toContain('3 באוקטובר 1952')
    expect(view.find('.undated').text()).toContain('היום הזה אינו קיים')
    expect(view.find('.undated').text()).toContain('\u20681952-02-30\u2069')
    const story = view.findAll('button').find((button) => button.text() === 'סדר העלילה')
    await story?.trigger('click')
    await view.get('[aria-label="קנה מידה"] button').trigger('click')
    expect(view.findAll('.bar').map((bar) => bar.attributes('title'))).toContainEqual(
      expect.stringContaining('3 באוקטובר 1952')
    )
    expect(view.text()).toContain('אוק׳')
    await language.change('en')
    await flushPromises()
    expect(view.findAll('.bar').map((bar) => bar.attributes('title'))).toContainEqual(
      expect.stringContaining('3 October 1952')
    )
    expect(view.text()).toContain('Oct')
    expect(view.find('.undated').text()).toContain('that day doesn’t exist')
    expect(get).toHaveBeenCalledTimes(reads)
    expect(fake.saves).toEqual([])
    expect(fake.codexWrites).toEqual([])
    view.unmount()
  })

  it('shows chapters in reading order with dates, flagging a step back in time', async () => {
    const view = await mountView()
    const heads = view.findAll('.column-head').map((head) => head.text())
    expect(heads[0]).toContain('I·1')
    expect(heads[0]).toContain('3 October 1952')
    expect(heads[1]).toContain('↶ earlier')
    expect(view.findAll('.row-name').map((row) => row.text())).toEqual(['Main plot'])
    expect(view.findAll('.cell').map((cell) => cell.classes().includes('in'))).toEqual([
      true,
      false,
      true
    ])
  })

  it('flows the reading grid and story-date axis RTL without changing chapter or date order', async () => {
    const language = useUiLanguageStore()
    await language.initialize()
    const view = await mountView()
    const readingTitles = view.findAll('.column-head .chapter').map((head) => head.text())
    const readingCells = view.findAll('.cell').map((cell) => cell.classes().join(' '))
    expect(view.get('.timeline').attributes('dir')).toBe('ltr')

    await language.change('he')
    await flushPromises()
    expect(view.get('.timeline').attributes('dir')).toBe('rtl')
    expect(view.findAll('.column-head .chapter').map((head) => head.text())).toEqual(
      readingTitles
    )
    expect(view.findAll('.cell').map((cell) => cell.classes().join(' '))).toEqual(readingCells)

    await view.get('[aria-label="סדר"] button:last-child').trigger('click')
    await view.get('[aria-label="קנה מידה"] button:first-child').trigger('click')
    await flushPromises()
    expect(view.get('.timeline').attributes('dir')).toBe('rtl')
    const tick = view.get<HTMLElement>('.tick')
    const bar = view.get<HTMLElement>('.bar')
    expect(tick.element.style.getPropertyValue('inset-inline-start')).toMatch(/px$/u)
    expect(bar.element.style.getPropertyValue('inset-inline-start')).toMatch(/px$/u)
    expect(bar.attributes('dir')).toBe('rtl')
    expect(bar.find('bdi').text()).toBe('The Ferry')
    expect(view.findAll('.bar').map((item) => item.attributes('title'))).toContainEqual(
      expect.stringContaining('3 באוקטובר 1952')
    )
    expect(fake.saves).toEqual([])
    expect(fake.codexWrites).toEqual([])
    view.unmount()
  })

  it('switches to characters, marking point of view', async () => {
    const view = await mountView()
    const characters = view.findAll('button').find((button) => button.text() === 'Characters')
    await characters?.trigger('click')
    expect(view.findAll('.row-name').map((row) => row.text())).toEqual(['Ilka'])
    expect(view.find('.cell.pov').exists()).toBe(true)
  })

  it('draws story order on a time scale, a month-precise chapter as a vague bar', async () => {
    const view = await mountView()
    const story = view.findAll('button').find((button) => button.text() === 'Story order')
    await story?.trigger('click')
    // The zoom that fits the story is chosen once the dates have loaded.
    expect(view.find('[aria-label=Zoom] .on').exists()).toBe(true)
    const bars = view.findAll('.bar')
    expect(bars.map((bar) => bar.text())).toEqual(['The Ferry'])
    const characters = view.findAll('button').find((button) => button.text() === 'Characters')
    await characters?.trigger('click')
    expect(view.find('.bar.pov').exists()).toBe(true)
  })

  it('lists chapters without a usable date, opening one to fix it', async () => {
    const view = await mountView()
    expect(view.find('.undated').text()).toContain('that day doesn’t exist')
    await view.find('.undated button').trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('Lost.md')
    expect(useWorkbenchStore().centerView).toBe('write')
    expect(useWorkbenchNavigation().isViewChosen('properties')).toBe(true)
  })
})
