import type { OutlineViewKind, SaveStatusView, Workspace } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * How an outline is shown: the board, the list, or its Markdown as text (Milestone 14). Text is never
 * remembered, so the app reopens on the board or list it came from.
 */
export type OutlineMode = OutlineViewKind | 'text'

/** The keys that show and hide the sidebar, in both workspaces (Milestone 17); Ctrl+B is bold. */
export const sidebarKeys = (): string => (navigator.platform.startsWith('Mac') ? '⌘\\' : 'Ctrl+\\')

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
  /** The save status of the page or outline text open in Story, for the same place in the top bar (Milestone 17). */
  const storySaveStatus = ref<SaveStatusView | null>(null)
  /** "Edit as plain text" from the outline's menu: Text opens as plain text (ADR 0010). */
  const plainTextRequest = ref(false)
  /** "Kinds of pages" is open (Milestone 18), and the unsorted folder it should offer to make a kind, if any. */
  const kindsDialog = ref(false)
  const kindsAdopt = ref<string | null>(null)

  function writeChapter(file: ProjectPath): void {
    chapterRequest.value = file
    workspace.value = 'write'
  }

  function setFocusMode(on: boolean): void {
    focusMode.value = on
  }

  /**
   * The sidebar, in Write and Story alike (Milestone 17, decision 2). Showing it from Focus leaves Focus,
   * since Focus is the sidebar and shelf put away.
   */
  function toggleNavigator(): void {
    if (focusMode.value) {
      focusMode.value = false
      navigatorHidden.value = false
      return
    }
    navigatorHidden.value = !navigatorHidden.value
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
    storySaveStatus,
    plainTextRequest,
    kindsDialog,
    kindsAdopt,
    writeChapter,
    setFocusMode,
    toggleNavigator,
  }
})
