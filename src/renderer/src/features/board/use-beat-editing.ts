import { ref } from 'vue'
import type { BoardBeatDto, BoardColumnDto } from '../../../../contract/dtos'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'
import type { BeatEdit } from './beat-edit'
import type { BoardPosition } from './board-keys'
import type { usePlotBoard } from './use-plot-board'

const refOf = (item: { readonly line: number; readonly title: string }) => ({
  line: item.line,
  title: item.title
})

/**
 * Editing on the board, one card at a time: renaming, notes, and a linked chapter's synopsis and
 * status (P4). Outline edits go through the board's version-checked commands; chapter keys go
 * through the manuscript's property commands (ADR 0004). Focus returns to the card after each.
 */
export function useBeatEditing(
  plot: ReturnType<typeof usePlotBoard>,
  focusCard: (position: BoardPosition) => Promise<void>
) {
  const manuscript = useManuscriptStore()
  const language = useUiLanguageStore()
  const editing = ref<{ readonly position: BoardPosition; readonly edit: BeatEdit } | null>(null)
  /** The column whose "Add card" field is open, by shown index. */
  const adding = ref<number | null>(null)

  const editOf = (position: BoardPosition): BeatEdit | null =>
    editing.value?.position.column === position.column &&
    editing.value.position.beat === position.beat
      ? editing.value.edit
      : null

  function start(position: BoardPosition, edit: BeatEdit): void {
    if (plot.readOnly.value) return
    adding.value = null
    editing.value = { position, edit }
  }

  async function cancel(): Promise<void> {
    const position = editing.value?.position
    editing.value = null
    if (position !== undefined) await focusCard(position)
  }

  async function save(
    position: BoardPosition,
    beat: BoardBeatDto,
    edit: BeatEdit,
    value: string
  ): Promise<void> {
    const chapter = beat.chapter
    let saved = false
    if (edit === 'title') {
      if (value.trim() === beat.title) saved = true
      else {
        saved = await plot.retitleBeat(
          refOf(beat),
          value,
          language.t('board-renamed', isolate(value.trim()))
        )
      }
    } else if (edit === 'notes') {
      saved = await plot.editNotes(refOf(beat), value, language.t('board-notes-saved'))
    } else if (chapter !== undefined) {
      saved = await manuscript.updateChapterProperties(
        chapter.path,
        edit === 'synopsis' ? { synopsis: value } : { status: value }
      )
      if (saved) {
        plot.announce(
          edit === 'synopsis'
            ? language.t('board-synopsis-saved', isolate(chapter.title))
            : language.t('board-status-set', isolate(chapter.title), isolate(value))
        )
      }
    }
    if (!saved) return
    editing.value = null
    await focusCard(position)
  }

  function openAdding(column: number): void {
    if (plot.readOnly.value) return
    editing.value = null
    adding.value = column
  }

  /** Adds a card at the end of the column; the field stays open for the next one. */
  function addCard(column: BoardColumnDto, title: string): Promise<boolean> {
    if (title.trim() === '') return Promise.resolve(false)
    return plot.addBeat(
      refOf(column),
      title,
      language.t('board-added', isolate(title.trim()), isolate(column.title))
    )
  }

  return { editing, adding, editOf, start, cancel, save, openAdding, addCard }
}
