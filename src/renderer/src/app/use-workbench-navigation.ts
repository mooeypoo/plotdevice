import { findView } from '../workbench/model/layout'
import { missingViews } from '../workbench/model/placement-actions'
import type { ViewId } from '../workbench/model/view-catalog'
import { activateSection, removeSection, setCenterView } from '../workbench/model/operations'
import { useEditorStore } from './editor-store'
import { useLayoutStore, type MainView, type RightTab } from './layout-store'
import { useWorkbenchStore } from './workbench-store'

/**
 * How features change what the screen shows, without knowing how it is arranged. The old shell
 * implements it with its fixed panels; the workbench reimplements it over its layout (ADR 0018).
 */
export function useWorkbenchNavigation() {
  const editor = useEditorStore()
  const layout = useLayoutStore()
  const workbench = useWorkbenchStore()

  /**
   * Shows a view in the main area, after saving the draft; refused while recovery is pending. A
   * view the layout already shows in a panel is brought forward there instead of duplicated.
   */
  function showCenterView(view: MainView): Promise<boolean> {
    if (layout.mainView === view) return Promise.resolve(true)
    const placed = view === 'write' ? undefined : findView(workbench.layout, view)
    if (placed !== undefined && workbench.shell === 'workbench') {
      return Promise.resolve(
        workbench.apply((current) => activateSection(current, placed.section.id))
      )
    }
    return editor.runNavigation(() => {
      // The classic panels have no shelf, so a view placed there moves to the main area.
      if (placed !== undefined) {
        workbench.apply((current) => {
          const removed = removeSection(current, placed.section.id)
          return removed.ok ? setCenterView(removed.value, placed.section.view) : removed
        })
      } else layout.mainView = view
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
   * Runs a change to the whole arrangement, such as resetting or deleting the layout in use, with
   * the same guards as switching layouts.
   */
  function rearrange(change: () => void): Promise<boolean> {
    return editor.runNavigation(change)
  }

  /** Makes `panel` the one its side shows, without opening a closed side. */
  function choosePanel(panel: RightTab): void {
    layout.rightTab = panel
  }

  /** Opens and shows `panel` wherever the layout keeps it; see `revealView`. */
  function revealPanel(panel: RightTab): void {
    revealView(panel)
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
    layout.exitFocusMode()
  }

  return { showCenterView, switchLayout, rearrange, choosePanel, revealPanel, revealView }
}
