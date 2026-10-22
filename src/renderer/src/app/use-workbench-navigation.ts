import { useEditorStore } from './editor-store'
import { useLayoutStore, type MainView, type RightTab } from './layout-store'

/**
 * How features change what the screen shows, without knowing how it is arranged. The old shell
 * implements it with its fixed panels; the workbench reimplements it over its layout (ADR 0018).
 */
export function useWorkbenchNavigation() {
  const editor = useEditorStore()
  const layout = useLayoutStore()

  /** Shows a view in the main area, after saving the draft; refused while recovery is pending. */
  function showCenterView(view: MainView): Promise<boolean> {
    if (layout.mainView === view) return Promise.resolve(true)
    return editor.runNavigation(() => {
      layout.mainView = view
    })
  }

  /** Makes `panel` the one its side shows, without opening a closed side. */
  function choosePanel(panel: RightTab): void {
    layout.rightTab = panel
  }

  /** Opens and shows `panel`, leaving focus mode so it can be seen. */
  function revealPanel(panel: RightTab): void {
    layout.inspectorOpen = true
    layout.rightTab = panel
    layout.exitFocusMode()
  }

  return { showCenterView, choosePanel, revealPanel }
}
