import type { OutlineViewKind, SaveStatusView, Workspace } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * How an outline is shown: the board, the list, or its Markdown as text (Milestone 14). Text is never
 * remembered, so the app reopens on the board or list it came from.
 */
export type OutlineMode = OutlineViewKind | 'text'

/** The keys that switch to Text and back, as the author's keyboard names them. */
export const textViewKeys = (): string => (navigator.platform.startsWith('Mac') ? '⌘⇧E' : 'Ctrl+Shift+E')

/** How the window is arranged right now. The workspace and outline view are remembered per project. */
export const useViewStore = defineStore('view', () => {
  /** `story` is the Story workspace's fixed internal ID; its name comes only from the message catalogs. */
  const workspace = ref<Workspace>('write')
  const outlineView = ref<OutlineMode>('board')
  /** The board or list last shown: what Text goes back to, and what is remembered. */
  const outlineLayout = ref<OutlineViewKind>('board')
  watch(outlineView, (mode) => {
    if (mode !== 'text') outlineLayout.value = mode
  })
  const focusMode = ref(false)
  const navigatorHidden = ref(false)
  /** A chapter chosen outside Write (in the manuscript outline): Write opens it. */
  const chapterRequest = ref<ProjectPath | null>(null)
  /** The chapter open in Write and its save status, for the top bar and the book menu. */
  const writingChapter = ref<{ file: ProjectPath; name: string } | null>(null)
  const saveStatus = ref<SaveStatusView | null>(null)

  function writeChapter(file: ProjectPath): void {
    chapterRequest.value = file
    workspace.value = 'write'
  }

  function setFocusMode(on: boolean): void {
    focusMode.value = on
  }

  /** Ctrl+Shift+E: the outline as text, and back to the board or list. */
  function toggleText(): void {
    outlineView.value = outlineView.value === 'text' ? outlineLayout.value : 'text'
  }

  return {
    workspace,
    outlineView,
    outlineLayout,
    toggleText,
    focusMode,
    navigatorHidden,
    chapterRequest,
    writingChapter,
    saveStatus,
    writeChapter,
    setFocusMode,
  }
})
