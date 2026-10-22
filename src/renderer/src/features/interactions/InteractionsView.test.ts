// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi, sampleInteractions } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import InteractionsView from './InteractionsView.vue'
import { useWorkbenchStore } from '../../app/workbench-store'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
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
    expect(details.get('h2').text()).toBe('⁨Ilka⁩ and ⁨יעל⁩ share 2 chapters')
    expect(details.findAll('li').map((item) => item.text().replace(/\s+/gu, ' '))).toEqual([
      'The Ferry · ⁨Ilka⁩’s point of view',
      'Lost · ⁨יעל⁩’s point of view'
    ])
    await details.find('button.link').trigger('click')
    await flushPromises()
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    expect(useWorkbenchStore().centerView).toBe('write')
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

  it('translates the matrix live while preserving selection and avoiding project access', async () => {
    const getInteractions = vi.spyOn(fake.api.interactions, 'getInteractions')
    const view = await mountView()
    const orderButton = view
      .findAll('button')
      .find((candidate) => candidate.text() === 'Most appearances first')
    await orderButton?.trigger('click')
    await view.findAll('tbody tr')[0]?.findAll('.cell')[1]?.trigger('click')

    const initialReads = getInteractions.mock.calls.length
    const initialSaves = [...fake.saves]
    expect(view.get('.details').text()).toContain('share 2 chapters')
    expect(view.findAll('thead th bdi').map((name) => name.text())).toEqual([
      'Ilka',
      'יעל',
      'Aunt Bea'
    ])

    useUiLanguageStore().locale = 'he'
    await flushPromises()

    expect(view.get('h1').text()).toBe('מפגשים')
    expect(view.get('[role="group"]').attributes('aria-label')).toBe('סדר')
    expect(view.text()).toContain('לפי מספר ההופעות')
    expect(view.text()).toContain('1 פרק מחוץ לסדר הספר ולא נספר.')
    expect(view.findAll('thead th bdi').map((name) => name.text())).toEqual([
      'Ilka',
      'יעל',
      'Aunt Bea'
    ])
    expect(view.get('.details').text()).toContain(
      'מספר הפרקים המשותפים ל־⁨Ilka⁩ ול־⁨יעל⁩: 2 פרקים'
    )
    expect(view.get('.details').text()).toContain('נקודת המבט של ⁨Ilka⁩')
    expect(getInteractions).toHaveBeenCalledTimes(initialReads)
    expect(fake.saves).toEqual(initialSaves)

    useUiLanguageStore().locale = 'en'
    await flushPromises()
    expect(view.get('.details').text()).toContain('share 2 chapters')
    expect(getInteractions).toHaveBeenCalledTimes(initialReads)
    expect(fake.saves).toEqual(initialSaves)
  })

  it('flows matrix headings RTL without changing row/column identities or the picked cell', async () => {
    const getInteractions = vi.spyOn(fake.api.interactions, 'getInteractions')
    const view = await mountView()
    const headings = view.findAll('thead th bdi').map((heading) => heading.text())
    const rowNames = view.findAll('tbody th bdi').map((heading) => heading.text())
    const matrixCounts = counts(view)
    const selected = view.findAll('tbody tr')[1]?.findAll('.cell')[2]
    if (selected === undefined) throw new Error('Expected an interaction matrix cell')
    await selected.trigger('click')
    const selectedElement = view.get('.cell.picked').element
    const initialReads = getInteractions.mock.calls.length

    expect(view.get('.interactions').attributes('dir')).toBe('ltr')
    expect(selected.text()).toBe('2')
    await useUiLanguageStore().change('he')
    await flushPromises()

    expect(view.get('.interactions').attributes('dir')).toBe('rtl')
    expect(view.findAll('thead th bdi').map((heading) => heading.text())).toEqual(headings)
    expect(view.findAll('tbody th bdi').map((heading) => heading.text())).toEqual(rowNames)
    expect(counts(view)).toEqual(matrixCounts)
    expect(view.get('.cell.picked').element).toBe(selectedElement)
    expect(view.get('.cell.picked').text()).toBe('2')
    expect(view.get('.details').text()).toContain('מספר הפרקים המשותפים')
    expect(getInteractions).toHaveBeenCalledTimes(initialReads)
    expect(fake.saves).toEqual([])
    view.unmount()
  })

  it('formats visible and accessible interaction counts with the interface locale', async () => {
    const chapters = Array.from({ length: 1234 }, (_, index) => ({
      path: `Chapter ${String(index + 1)}.md`,
      title: `Chapter ${String(index + 1)}`
    }))
    const interactions = {
      ...sampleInteractions,
      chapters,
      outside: 1234,
      characters: sampleInteractions.characters.map((character) => ({
        ...character,
        chapters: chapters.map((_, index) => index),
        povChapters: []
      }))
    }
    vi.spyOn(fake.api.interactions, 'getInteractions').mockResolvedValue({
      ok: true,
      value: interactions
    })
    useUiLanguageStore().locale = 'he'

    const view = await mountView()
    const formatted = new Intl.NumberFormat('he').format(1234)

    expect(view.findAll('.cell')[1]?.text()).toBe(formatted)
    expect(view.findAll('.cell')[1]?.attributes('aria-label')).toContain(formatted)
    expect(view.get('header .hint:last-child').text()).toContain(formatted)
  })
})
