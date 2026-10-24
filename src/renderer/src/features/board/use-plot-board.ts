import { computed, ref, shallowRef, watch } from 'vue'
import type {
  ApiResult,
  BoardBeatDto,
  BoardColumnDto,
  OutlineItemRefDto,
  PlotBoardDto
} from '../../../../contract/dtos'
import { uiDirection } from '../../../../i18n/locales'
import { useEditorStore } from '../../app/editor-store'
import { placeOf } from '../../app/entry-owners'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useOutlineStore } from '../../app/outline-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useReferenceStore } from '../../app/reference-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useEditorLinks } from '../../app/use-editor-links'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { useWorkspaceStore } from '../../app/workspace-store'
import { writeOutline } from '../../app/outline-writes'
import { useErrorNotice } from '../../shared/use-error-notice'
import { newColumnPlacement, type BeatMove, type ColumnMove } from './board-moves'

/** A column as the board draws it: the Inbox goes last, whatever its place in the file. */
export interface ShownColumn {
  readonly column: BoardColumnDto
  readonly beats: readonly BoardBeatDto[]
}

/**
 * The beat board over the current outline (ADR 0020): read from the file whenever the outline,
 * the outline list or the manuscript changes. It holds nothing the file doesn't say.
 */
export function usePlotBoard() {
  const outlines = useOutlineStore()
  const manuscript = useManuscriptStore()
  const workspace = useWorkspaceStore()
  const language = useUiLanguageStore()
  const editor = useEditorStore()
  const navigation = useWorkbenchNavigation()
  const board = shallowRef<PlotBoardDto | null>(null)
  const loading = ref(false)
  const { message: error, source: errorSource } = useErrorNotice()
  /** Why the last move was refused; the board has been read again. */
  const { message: moveError, source: moveErrorSource } = useErrorNotice()
  /** What the last move did, for the board's live region. */
  const announcement = ref('')
  let request = 0

  const path = computed(() => outlines.currentPath)

  async function load(): Promise<void> {
    const identity = ++request
    const current = path.value
    errorSource.value = null
    if (current === null) {
      board.value = null
      loading.value = false
      return
    }
    loading.value = board.value?.path !== current
    const result = await plotDeviceApi.current().outline.readBoard(current)
    if (identity !== request) return
    loading.value = false
    if (result.ok) board.value = result.value
    else {
      board.value = null
      errorSource.value = result.error
    }
  }

  watch([path, () => outlines.revision, () => manuscript.manuscript], () => void load(), {
    immediate: true
  })

  const columns = computed((): readonly ShownColumn[] => {
    const all = (board.value?.columns ?? []).map((column) => ({ column, beats: column.beats }))
    return [...all.filter((shown) => !shown.column.inbox), ...all.filter((s) => s.column.inbox)]
  })

  /** The book's direction when it declares a language, otherwise the interface's (ADR 0016). */
  const direction = computed(
    () => workspace.project?.language.direction ?? uiDirection(language.locale)
  )

  const threads = computed(
    () => new Map((board.value?.threads ?? []).map((thread) => [thread.key, thread]))
  )

  /**
   * Runs a board command against the board's version (ADR 0020). On success the board shows the
   * file as the main process read it after writing, and `done` is announced; on refusal it says
   * why, and a stale board is read again.
   */
  async function change(
    run: (outline: string, version: string) => Promise<ApiResult<PlotBoardDto>>,
    done: string
  ): Promise<boolean> {
    const current = board.value
    if (current === null || (workspace.project?.readOnly ?? true)) return false
    request += 1
    moveErrorSource.value = null
    const result = await writeOutline(current.path, () => run(current.path, current.version))
    if (result.ok) {
      board.value = result.value
      announcement.value = done
      return true
    }
    const error = result.error
    const changed =
      'code' in error &&
      (error.code === 'changed-on-disk' || error.code === 'outline-shape-changed')
    moveErrorSource.value = changed ? { notice: 'board-outline-changed' } : error
    announcement.value = ''
    if (changed) await load()
    return false
  }

  function moveBeat(move: BeatMove, done: string): Promise<boolean> {
    return change(
      (outline, version) =>
        plotDeviceApi
          .current()
          .outline.moveBeat(outline, version, move.beat, move.column, move.placement),
      done
    )
  }

  function moveColumn(move: ColumnMove, done: string): Promise<boolean> {
    return change(
      (outline, version) =>
        plotDeviceApi.current().outline.moveColumn(outline, version, move.column, move.placement),
      done
    )
  }

  function addBeat(column: OutlineItemRefDto, title: string, done: string): Promise<boolean> {
    return change(
      (outline, version) =>
        plotDeviceApi.current().outline.addBeat(outline, version, column, title, 'end'),
      done
    )
  }

  function addColumn(title: string, done: string): Promise<boolean> {
    const placement = newColumnPlacement(board.value?.columns ?? [])
    return change(
      (outline, version) =>
        plotDeviceApi.current().outline.addColumn(outline, version, title, placement),
      done
    )
  }

  function retitleBeat(beat: OutlineItemRefDto, title: string, done: string): Promise<boolean> {
    return change(
      (outline, version) =>
        plotDeviceApi.current().outline.retitleBeat(outline, version, beat, title),
      done
    )
  }

  function editNotes(beat: OutlineItemRefDto, notes: string, done: string): Promise<boolean> {
    return change(
      (outline, version) =>
        plotDeviceApi.current().outline.editNotes(outline, version, beat, notes),
      done
    )
  }

  /** Says what an edit outside the outline (a chapter's synopsis or status) did. */
  function announce(done: string): void {
    moveErrorSource.value = null
    announcement.value = done
  }

  /** Chapters open for writing: back in Writing mode, through the navigation queue. */
  async function writeChapter(chapterPath: string): Promise<void> {
    if (!(await navigation.switchMode('writing'))) return
    await editor.open(chapterPath)
  }

  const links = useEditorLinks(async (target) => {
    const kind = placeOf(target)?.kind
    if (kind === 'chapter' || kind === 'part') await writeChapter(target)
    else useReferenceStore().open(target)
  })

  return {
    board,
    loading,
    error,
    path,
    columns,
    direction,
    threads,
    linkNotice: links.linkNotice,
    openLink: links.openLink,
    writeChapter,
    moveBeat,
    moveColumn,
    addBeat,
    addColumn,
    retitleBeat,
    editNotes,
    announce,
    moveError,
    announcement,
    readOnly: computed(() => workspace.project?.readOnly ?? true),
    reload: load
  }
}
