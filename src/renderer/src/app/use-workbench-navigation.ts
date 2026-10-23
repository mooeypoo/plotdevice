import { findView } from '../workbench/model/layout'
import { missingViews } from '../workbench/model/placement-actions'
import type { ViewId } from '../workbench/model/view-catalog'
import { activateSection, selectSection, setAreaCollapsed } from '../workbench/model/operations'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useOutlineStore } from './outline-store'
import { useWorkbenchStore, type MainView } from './workbench-store'
import type { Mode } from '../workbench/model/vocabulary'

/**
 * How features change what the screen shows, without knowing how the workbench arranges it
 * (ADR 0017, 0018). Views are named by id; the layout decides where they are.
 */
export function useWorkbenchNavigation() {
  const editor = useEditorStore()
  const workbench = useWorkbenchStore()
  const tabs = useDocumentTabsStore()

  /**
   * Shows a view in the main area, after saving the draft; refused while recovery is pending.
   * The page belongs to Write and the board and book views to Plot, so this switches mode when
   * needed (D1). A view the layout already shows in a panel is brought forward there instead.
   */
  function showCenterView(view: MainView): Promise<boolean> {
    const mode: Mode = view === 'write' ? 'writing' : 'plotting'
    if (workbench.mode === mode && workbench.centerView === view) return Promise.resolve(true)
    const placed = view === 'write' ? undefined : findView(workbench.layout, view)
    if (placed !== undefined) {
      return Promise.resolve(
        workbench.apply((current) => activateSection(current, placed.section.id))
      )
    }
    return editor.runNavigation(() => {
      workbench.setMode(mode)
      workbench.centerView = view
    })
  }

  /** Uses another layout, after saving the draft; refused while recovery is pending. */
  function switchLayout(id: string): Promise<boolean> {
    if (workbench.activeLayoutId === id) return Promise.resolve(true)
    let switched = false
    return editor
      .runNavigation(() => {
        switched = workbench.setActiveLayout(id)
      })
      .then((ran) => ran && switched)
  }

  /**
   * Switches between Writing and Plotting, after saving the draft; refused while recovery is
   * pending. Back in Writing, an editor left on the outline's text returns to the Writing chapter.
   */
  async function switchMode(next: Mode): Promise<boolean> {
    if (workbench.mode === next) return true
    const outline = useOutlineStore().currentPath
    const onOutline = editor.entry !== null && editor.entry.path === outline
    let switched = false
    const done = await editor
      .runNavigation(() => {
        switched = workbench.setMode(next)
      })
      .then((ran) => ran && switched)
    if (!done) return false
    if (next === 'writing' && onOutline && tabs.writingPath !== null) await editor.returnToWriting()
    return true
  }

  /**
   * "Edit as text": the current outline's Markdown on the page, in Write. The board and the text
   * are never both on screen, so only one can be edited (brief §4.4).
   */
  async function showOutlineText(): Promise<boolean> {
    const outline = useOutlineStore().currentPath
    if (!(await showCenterView('write'))) return false
    return outline === null || editor.entry?.path === outline ? true : editor.open(outline)
  }

  /**
   * Runs a change to the whole arrangement, such as resetting or deleting the layout in use, with
   * the same guards as switching layouts.
   */
  function rearrange(change: () => void): Promise<boolean> {
    return editor.runNavigation(change)
  }

  /**
   * Shows a document read-only beside the editor (ADR 0018). Splits sit beside the document, so
   * the main area returns to it first; refused when every split is locked.
   */
  async function openBeside(path: string): Promise<boolean> {
    if (!(await showCenterView('write'))) return false
    return workbench.openBeside(path)
  }

  /**
   * Makes a split's document the writable one, through the navigation queue, and pins it as the
   * Writing target if it is part of the manuscript (ADR 0015). The document the editor had moves
   * into the split, so the comparison continues; with none, the split closes.
   */
  async function writeHere(splitId: string): Promise<boolean> {
    const target = workbench.splits[splitId]?.path
    if (target === undefined) return false
    const previous = editor.entry?.path ?? null
    if (!(await editor.open(target))) return false
    tabs.writeHere(target)
    if (previous !== null && previous !== target) workbench.showInSplit(splitId, previous)
    else workbench.closeSplitView(splitId)
    return true
  }

  /** Makes `view` the one its area shows, without opening a collapsed area. */
  function choosePanel(view: ViewId): void {
    const section = findView(workbench.layout, view)?.section
    if (section !== undefined) workbench.apply((current) => selectSection(current, section.id))
  }

  /** Whether `view` is on screen: the one its area shows, in an open area. */
  function isViewShown(view: ViewId): boolean {
    const placed = findView(workbench.layout, view)
    if (placed === undefined) return false
    const area = workbench.layout[placed.region]
    return !area.collapsed && area.activeSection === placed.section.id
  }

  /** Whether `view` is the one its area shows, open or collapsed. */
  function isViewChosen(view: ViewId): boolean {
    const placed = findView(workbench.layout, view)
    return (
      placed !== undefined && workbench.layout[placed.region].activeSection === placed.section.id
    )
  }

  /** Whether the area holding `view` is open, whichever of its views it shows. */
  function isAreaOpen(view: ViewId): boolean {
    const placed = findView(workbench.layout, view)
    return placed !== undefined && !workbench.layout[placed.region].collapsed
  }

  /**
   * Opens or closes the area holding `view`, keeping the view it shows (Toggle Binder, Toggle
   * Inspector). A view the layout no longer has comes back where it usually lives.
   */
  function toggleArea(view: ViewId): void {
    setAreaOpen(view, !isAreaOpen(view))
  }

  /** Opens or closes the area holding `view`; opening a view the layout lost brings it back. */
  function setAreaOpen(view: ViewId, open: boolean): void {
    const placed = findView(workbench.layout, view)
    if (placed === undefined) {
      if (open) revealView(view)
      return
    }
    workbench.apply((current) => setAreaCollapsed(current, placed.region, !open))
  }

  /** Hides `view`'s area if `view` is showing there, and otherwise shows it (Toggle Outline). */
  function toggleView(view: ViewId): void {
    const placed = findView(workbench.layout, view)
    if (placed !== undefined && isViewShown(view)) {
      workbench.apply((current) => setAreaCollapsed(current, placed.region, true))
    } else revealView(view)
  }

  /**
   * Opens and shows a view wherever the layout keeps it, leaving focus mode so it can be seen. A
   * view the layout doesn't show comes back where it usually lives.
   */
  function revealView(view: ViewId): void {
    if (findView(workbench.layout, view) === undefined) {
      const missing = missingViews(workbench.layout, [view])[0]
      if (missing !== undefined) workbench.apply(missing.apply)
    }
    const section = findView(workbench.layout, view)?.section
    if (section !== undefined) {
      workbench.apply((current) => activateSection(current, section.id))
    }
    workbench.exitFocusMode()
  }

  return {
    showCenterView,
    switchLayout,
    switchMode,
    showOutlineText,
    rearrange,
    openBeside,
    writeHere,
    choosePanel,
    isViewShown,
    isViewChosen,
    isAreaOpen,
    toggleArea,
    setAreaOpen,
    toggleView,
    revealView
  }
}
