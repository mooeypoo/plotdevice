// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import TimelineView from './TimelineView.vue'

beforeEach(async () => {
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

const mountView = async (): Promise<ReturnType<typeof mount>> => {
  const view = mount(TimelineView)
  await flushPromises()
  return view
}

describe('TimelineView', () => {
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
    expect(useLayoutStore()).toMatchObject({ mainView: 'write', rightTab: 'properties' })
  })
})
