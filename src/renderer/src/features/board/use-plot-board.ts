import { computed, ref, shallowRef, watch } from 'vue'
import type { BoardBeatDto, BoardColumnDto, PlotBoardDto } from '../../../../contract/dtos'
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
import { useErrorNotice } from '../../shared/use-error-notice'

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
    reload: load
  }
}
