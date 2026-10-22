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

  async function editEntry(path: string): Promise<void> {
    // Opening presents the document; an entry that is already open may be behind another view.
    const shown =
      editor.entry?.path === path
        ? await navigation.showCenterView('write')
        : await editor.open(path)
    if (shown) navigation.choosePanel('properties')
  }

  function consultEntry(path: string): void {
    if (codex.listing?.entries.some((entry) => entry.path === path)) reference.open(path)
    else void openEntry(path)
  }

  return { openEntry, editEntry, consultEntry, selectedCodexPath }
}
