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
import InteractionsView from './InteractionsView.vue'

beforeEach(async () => {
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await Promise.all([useManuscriptStore().load(), useCodexStore().load()])
})

const mountView = async (): Promise<ReturnType<typeof mount>> => {
  const view = mount(InteractionsView)
  await flushPromises()
  return view
}

const counts = (view: ReturnType<typeof mount>): string[][] =>
  view.findAll('tbody tr').map((row) => row.findAll('.cell').map((cell) => cell.text()))

describe('InteractionsView', () => {
  it('shows who shares chapters with whom, leaving pairs that never meet empty', async () => {
    const view = await mountView()
    expect(view.findAll('thead th bdi').map((name) => name.text())).toEqual([
      'Aunt Bea',
      'Ilka',
      'יעל'
    ])
    expect(counts(view)).toEqual([
      ['1', '1', ''],
      ['1', '3', '2'],
      ['', '2', '2']
    ])
    expect(view.text()).toContain('1 chapter is outside the book’s order')
  })

  it('isolates each name, so a Hebrew name can’t reorder the label around it', async () => {
    const view = await mountView()
    const cell = view.findAll('tbody tr')[1]?.findAll('.cell')[2]
    expect(cell?.attributes('aria-label')).toBe('⁨Ilka⁩ and ⁨יעל⁩: 2 chapters together')
  })

  it('lists a pair’s shared chapters with whose point of view, and opens one', async () => {
    const view = await mountView()
    await view.findAll('tbody tr')[1]?.findAll('.cell')[2]?.trigger('click')
    const details = view.get('.details')
    expect(details.findAll('h2 bdi').map((name) => name.text())).toEqual(['Ilka', 'יעל'])
    expect(details.findAll('li').map((item) => item.text().replace(/\s+/gu, ' '))).toEqual([
      'The Ferry · Ilka’s point of view',
      'Lost · יעל’s point of view'
    ])
    await details.find('button.link').trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    expect(useLayoutStore().mainView).toBe('write')
  })

  it('says when two characters never share a chapter', async () => {
    const view = await mountView()
    await view.findAll('tbody tr')[0]?.findAll('.cell')[2]?.trigger('click')
    expect(view.get('.details').text()).toContain('never appear in the same chapter')
  })

  it('puts the busiest characters first when asked', async () => {
    const view = await mountView()
    const button = view
      .findAll('button')
      .find((candidate) => candidate.text() === 'Most appearances first')
    await button?.trigger('click')
    expect(view.findAll('thead th bdi').map((name) => name.text())).toEqual([
      'Ilka',
      'יעל',
      'Aunt Bea'
    ])
  })
})
