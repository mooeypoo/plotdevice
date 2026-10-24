// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useInspectorStore } from '../../app/inspector-store'
import { createFakePlotDeviceApi, sampleBoard } from '../../app/fake-plot-device-api'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useOutlineStore } from '../../app/outline-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkbenchStore } from '../../app/workbench-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import PlotBoard from './PlotBoard.vue'
import { chooseOption } from '../../shared/select-field-testing'

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
  it('names the outline, offers Edit as text, and keeps the keyboard hint behind ?', async () => {
    const board = mount(PlotBoard, { attachTo: document.body })
    await flushPromises()
    expect(board.find('header .hint').isVisible()).toBe(false)
    expect(board.get('header .help summary').attributes('aria-label')).toBe('Keyboard')
    await board.get('header .edit-text').trigger('click')
    await flushPromises()
    expect(useWorkbenchStore().mode).toBe('writing')
    expect(useEditorStore().entry?.path).toBe(useOutlineStore().currentPath)
    board.unmount()
    await useEditorStore().flush()
  })

  it('adds a column after the last one, and offers to create the part it names', async () => {
    fake.board.current = withInboxFirst
    const board = mount(PlotBoard, { attachTo: document.body })
    await flushPromises()
    const tiles = board.findAll('.columns > li')
    expect(tiles.at(-2)?.classes()).toContain('add-column')
    expect(tiles.at(-1)?.classes()).toContain('inbox')
    await board.get('.add-column button').trigger('click')
    await board.get('.add-column input').setValue('Part Three')
    await board.get('.add-column form').trigger('submit')
    await flushPromises()
    expect(fake.boardMoves).toEqual(['add column Part Three end'])
    expect(board.get('.announcement').text()).toBe('Column \u2068Part Three\u2069 added')
    expect(board.get('.offer').text()).toContain('No part is called \u2068Part Three\u2069 yet')
    await board.get('.offer .primary').trigger('click')
    await flushPromises()
    expect(fake.created).toContain('Part Three/Part Three.md')
    expect(board.find('.offer').exists()).toBe(false)
    board.unmount()
  })

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
    expect(board.find('.add-column').exists()).toBe(true)
    expect(board.findAll('button').filter((b) => b.text() === 'Edit as text')).toHaveLength(1)
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

describe('editing on the board', () => {
  const mountBoard = async (): Promise<ReturnType<typeof mount>> => {
    fake.board.current = withInboxFirst
    await useInspectorStore().loadVocabulary()
    const board = mount(PlotBoard, { attachTo: document.body })
    await flushPromises()
    return board
  }
  const menuItem = async (
    board: ReturnType<typeof mount>,
    card: number,
    label: string
  ): Promise<void> => {
    await board.findAll('.beat')[card]?.get('.more button').trigger('click')
    const item = board.findAll('[role="menuitem"]').find((entry) => entry.text() === label)
    if (item === undefined) throw new Error(`no menu item ${label}`)
    await item.trigger('click')
    await flushPromises()
  }

  it('adds several cards in a row, and Escape closes the field', async () => {
    const board = await mountBoard()
    await board.get('.add-card').trigger('click')
    await flushPromises()
    const input = board.get<HTMLInputElement>('.add-field input')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('First new')
    await board.get('.add-field').trigger('submit')
    await flushPromises()
    await board.get('.add-field input').setValue('Second new')
    await board.get('.add-field').trigger('submit')
    await flushPromises()
    expect(fake.boardMoves).toEqual([
      'add First new → Part One end',
      'add Second new → Part One end'
    ])
    expect(board.get('.announcement').text()).toBe('Added ⁨Second new⁩ to ⁨Part One⁩')
    await board.get('.add-field input').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(board.find('.add-field').exists()).toBe(false)
    expect(document.activeElement?.getAttribute('data-column')).toBe('0')
    board.unmount()
  })

  it('renames with F2: Enter saves, Escape cancels, and focus returns to the card', async () => {
    const board = await mountBoard()
    await board.findAll('.beat')[1]?.trigger('keydown', { key: 'F2' })
    await flushPromises()
    const field = board.get<HTMLInputElement>('.beat .field')
    expect(field.element.value).toBe('Ilka finds the ledger.')
    await field.trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(fake.boardMoves).toEqual([])
    expect(document.activeElement?.getAttribute('data-position')).toBe('0-1')

    await board.findAll('.beat')[1]?.trigger('keydown', { key: 'F2' })
    await flushPromises()
    await board.get('.beat .field').setValue('Ilka steals the ledger.')
    await board.get('.beat .field').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(fake.boardMoves).toEqual(['retitle Ilka finds the ledger. → Ilka steals the ledger.'])
    expect(board.find('.beat .field').exists()).toBe(false)
    expect(document.activeElement?.getAttribute('data-position')).toBe('0-1')
    board.unmount()
  })

  it('keeps the field open with the reason when a title is refused', async () => {
    const board = await mountBoard()
    vi.spyOn(fake.api.outline, 'retitleBeat').mockResolvedValue({
      ok: false,
      error: {
        code: 'invalid-title',
        message: 'A beat is one line of text.',
        diagnostic: { reason: 'outline-invalid-beat' }
      }
    })
    await board.findAll('.beat')[1]?.trigger('keydown', { key: 'F2' })
    await flushPromises()
    await board.get('.beat .field').setValue('---')
    await board.get('.beat .field').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(board.find('.beat .field').exists()).toBe(true)
    expect(board.get('.notice').text()).toContain('one line of text')
    board.unmount()
  })

  it('edits notes from the menu, saving with Ctrl+Enter', async () => {
    const board = await mountBoard()
    await menuItem(board, 1, 'Edit notes')
    const area = board.get<HTMLTextAreaElement>('.beat textarea')
    expect(area.element.value).toBe('Bea lies.')
    await area.setValue('Bea lies.\n- and Ilka knows')
    await area.trigger('keydown', { key: 'Enter', ctrlKey: true })
    await flushPromises()
    expect(fake.boardMoves).toEqual(['notes Ilka finds the ledger. → Bea lies.\n- and Ilka knows'])
    board.unmount()
  })

  it('sets a linked chapter’s synopsis and status through the property commands', async () => {
    const board = await mountBoard()
    const write = vi.spyOn(fake.api.manuscript, 'updateEntryProperties')
    await menuItem(board, 0, 'Edit chapter synopsis')
    await board.get('.beat textarea').setValue('Ilka comes home.')
    await board.get('.beat .primary').trigger('click')
    await flushPromises()
    expect(write).toHaveBeenLastCalledWith('The Ferry.md', expect.any(String), {
      synopsis: 'Ilka comes home.'
    })
    expect(board.get('.announcement').text()).toBe('Synopsis of ⁨The Ferry⁩ saved')

    await menuItem(board, 0, 'Chapter status')
    await chooseOption(board.get('.beat [role="combobox"]'), 'idea')
    await flushPromises()
    expect(write).toHaveBeenLastCalledWith('The Ferry.md', expect.any(String), {
      status: 'idea'
    })
    expect(fake.boardMoves).toEqual([])
    board.unmount()
  })

  it('offers no edits in a read-only project', async () => {
    const workspace = useWorkspaceStore()
    if (workspace.project === null) throw new Error('expected an open project')
    workspace.project = { ...workspace.project, readOnly: true }
    const board = await mountBoard()
    expect(board.find('.add-card').exists()).toBe(false)
    await board.findAll('.beat')[1]?.trigger('keydown', { key: 'F2' })
    await flushPromises()
    expect(board.find('.beat .field').exists()).toBe(false)
    board.unmount()
  })

  it('labels the editing controls in Hebrew', async () => {
    const board = await mountBoard()
    await useUiLanguageStore().change('he')
    expect(board.get('.add-card').text()).toBe('+ הוספת נקודת עלילה')
    board.unmount()
  })
})
