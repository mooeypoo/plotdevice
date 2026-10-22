// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('moving on the board', () => {
  const mountBoard = async (): Promise<ReturnType<typeof mount>> => {
    fake.board.current = withInboxFirst
    const board = mount(PlotBoard, { attachTo: document.body })
    await flushPromises()
    return board
  }

  it('moves a card with Alt+arrows, keeps focus on it, and says what happened', async () => {
    const board = await mountBoard()
    await board.findAll('.beat')[0]?.trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(fake.boardMoves).toEqual(['beat [[The Ferry]]: Ilka arrives. #main → Part One end'])
    expect(document.activeElement?.getAttribute('data-position')).toBe('0-1')
    expect(board.get('.announcement').text()).toBe(
      'Moved ⁨[[The Ferry]]: Ilka arrives. #main⁩ to ⁨Part One⁩'
    )
    await board.findAll('.beat')[0]?.trigger('keydown', { key: 'ArrowRight', altKey: true })
    await flushPromises()
    expect(fake.boardMoves.at(-1)).toBe('beat [[The Ferry]]: Ilka arrives. #main → Empty end')
    board.unmount()
  })

  it('moves a card from its menu, and a column with Alt+arrows on its heading', async () => {
    const board = await mountBoard()
    await board.get('.beat .more button').trigger('click')
    const item = board
      .findAll('[role="menuitem"]')
      .find((entry) => entry.text() === 'Move to \u2068Inbox\u2069')
    await item?.trigger('click')
    await flushPromises()
    expect(fake.boardMoves).toEqual(['beat [[The Ferry]]: Ilka arrives. #main → Inbox end'])
    await board.findAll('.column-title')[0]?.trigger('keydown', { key: 'ArrowRight', altKey: true })
    await flushPromises()
    // In this file the Inbox comes first, so after Empty means the end of the file.
    expect(fake.boardMoves.at(-1)).toBe('column Part One → end')
    expect(document.activeElement?.getAttribute('data-column')).toBe('1')
    // The Inbox stays last: its heading neither drags nor moves.
    const inbox = board.findAll('.column-title').at(-1)
    expect(inbox?.attributes('draggable')).toBe('false')
    board.unmount()
  })

  it('drops a dragged card into another column', async () => {
    const board = await mountBoard()
    const card = board.findAll('.beat')[1]
    await card?.trigger('dragstart', { dataTransfer: null })
    await board.findAll('.column')[2]?.trigger('dragover', { dataTransfer: null })
    await board.findAll('.column')[2]?.trigger('drop', { dataTransfer: null })
    await flushPromises()
    expect(fake.boardMoves).toEqual(['beat Ilka finds the ledger. → Inbox end'])
    board.unmount()
  })

  it('refuses a stale board, says so, and reads it again', async () => {
    const board = await mountBoard()
    fake.board.current = { ...withInboxFirst, version: 'changed' }
    await board.findAll('.beat')[0]?.trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(fake.boardMoves).toEqual([])
    expect(board.get('.notice').text()).toBe(
      'The outline changed since the board read it; here it is again.'
    )
    await board.findAll('.beat')[0]?.trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(fake.boardMoves).toHaveLength(1)
    board.unmount()
  })

  it('saves the outline open in the editor first, reloads it after, and refuses a conflict', async () => {
    const editor = useEditorStore()
    await editor.open('Outline.md')
    const reload = vi.spyOn(editor, 'reloadAfterWrite')
    const board = await mountBoard()
    await board.findAll('.beat')[0]?.trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(fake.boardMoves).toHaveLength(1)
    expect(reload).toHaveBeenCalledWith('Outline.md')

    editor.edit('Mine.')
    fake.files.set('Outline.md', 'Outside.')
    await editor.flush()
    await board.findAll('.beat')[0]?.trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(fake.boardMoves).toHaveLength(1)
    expect(board.get('.notice').text()).toContain('resolve them first')
    expect(editor.text).toBe('Mine.')
    board.unmount()
  })

  it('offers no moves in a read-only project', async () => {
    const workspace = useWorkspaceStore()
    if (workspace.project === null) throw new Error('expected an open project')
    workspace.project = { ...workspace.project, readOnly: true }
    const board = await mountBoard()
    expect(board.findAll('[draggable="true"]')).toHaveLength(0)
    expect(board.find('.more').exists()).toBe(false)
    await board.findAll('.beat')[0]?.trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(fake.boardMoves).toEqual([])
    board.unmount()
  })
})
