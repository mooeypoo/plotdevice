import { computed } from 'vue'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useReferenceStore } from './reference-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'

/** Separates list lookups from intentional editor navigation. */
export function useSidePanelNavigation() {
  const codex = useCodexStore()
  const editor = useEditorStore()
  const reference = useReferenceStore()
  const navigation = useWorkbenchNavigation()
  const selectedCodexPath = computed(() =>
    navigation.isViewChosen('reference') ? reference.path : (editor.entry?.path ?? null)
  )

  async function openEntry(path: string): Promise<void> {
    await editor.open(path)
  }

  /**
   * "Edit details" (D6): the entry on the page, with its Details panel in view, opening the side
   * that holds it if it is closed. An entry already open may be behind another view.
   */
  async function editDetails(path: string): Promise<boolean> {
    const shown =
      editor.entry?.path === path
        ? await navigation.showCenterView('write')
        : await editor.open(path)
    if (shown) navigation.revealView('properties')
    return shown
  }

  function consultEntry(path: string): void {
    if (codex.listing?.entries.some((entry) => entry.path === path)) reference.open(path)
    else void openEntry(path)
  }

  return { openEntry, editDetails, consultEntry, selectedCodexPath }
}
