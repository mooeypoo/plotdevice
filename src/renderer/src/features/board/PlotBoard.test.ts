// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { createFakePlotDeviceApi, sampleBoard } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useOutlineStore } from '../../app/outline-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import PlotBoard from './PlotBoard.vue'

let fake: ReturnType<typeof createFakePlotDeviceApi>
beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useUiLanguageStore().locale = 'en'
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useWorkspaceStore().openProject('/book')
  await Promise.all([useManuscriptStore().load(), useCodexStore().load(), useOutlineStore().load()])
})

const withInboxFirst = {
  ...sampleBoard,
  columns: [
    {
      line: 0,
      title: 'Inbox',
      inbox: true,
      beats: [{ line: 1, title: 'Idea', notes: '', tags: [], threads: [] }]
    },
    ...sampleBoard.columns,
    { line: 9, title: 'Empty', inbox: false, beats: [] }
  ]
}

describe('PlotBoard', () => {
  it('shows columns in document order with the Inbox last, and cards with their facts', async () => {
    fake.board.current = withInboxFirst
    const board = mount(PlotBoard)
    await flushPromises()
    expect(board.findAll('.column-title > span:first-child').map((title) => title.text())).toEqual([
      'Part One',
      'Empty',
      'Inbox'
    ])
    const [ferry, ledger] = board.findAll('.column')[0]?.findAll('.beat') ?? []
    expect(ferry?.get('.thread').text()).toBe('Main plot')
    expect(ferry?.get('.facts').text()).toBe('draft · POV: Ilka · 3 words')
    expect(ferry?.find('a.markdown-link').exists()).toBe(true)
    expect(ledger?.get('.notes').text()).toBe('Bea lies.')
    expect(ledger?.find('.facts').exists()).toBe(false)
    board.unmount()
  })

  it('runs its columns in the book’s direction', async () => {
    const workspace = useWorkspaceStore()
    if (workspace.project === null) throw new Error('expected an open project')
    workspace.project = { ...workspace.project, language: { declared: 'he', direction: 'rtl' } }
    const board = mount(PlotBoard)
    await flushPromises()
    expect(board.get('.columns').attributes('dir')).toBe('rtl')
    board.unmount()
  })

  it('moves focus with arrow keys in visual order, and Enter writes the linked chapter', async () => {
    fake.board.current = withInboxFirst
    const board = mount(PlotBoard, { attachTo: document.body })
    await flushPromises()
    const cards = board.findAll('.beat')
    expect(cards.map((card) => card.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    await cards[0]?.trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()
    expect(document.activeElement).toBe(cards[1]?.element)
    await cards[1]?.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(document.activeElement).toBe(cards[2]?.element)

    await useWorkbenchNavigation().switchMode('plotting')
    await cards[0]?.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(useWorkbenchStore().mode).toBe('writing')
    expect(useEditorStore().entry?.path).toBe('The Ferry.md')
    board.unmount()
  })

  it('explains an empty board, and offers to start an outline', async () => {
    fake.board.current = { ...sampleBoard, columns: [] }
    const board = mount(PlotBoard)
    await flushPromises()
    expect(board.text()).toContain('no ## headings')
    useOutlineStore().outlines = []
    await flushPromises()
    expect(board.text()).toContain('There is no outline yet')
    await useUiLanguageStore().change('he')
    expect(board.get('button.primary').text()).toBe('התחלת כתיבת מתווה')
    board.unmount()
  })
})
