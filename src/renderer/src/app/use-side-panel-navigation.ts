import { computed } from 'vue'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useLayoutStore } from './layout-store'
import { useReferenceStore } from './reference-store'

/** Separates list lookups from intentional editor navigation. */
export function useSidePanelNavigation() {
  const codex = useCodexStore()
  const editor = useEditorStore()
  const layout = useLayoutStore()
  const reference = useReferenceStore()
  const selectedCodexPath = computed(() =>
    layout.rightTab === 'reference' ? reference.path : (editor.entry?.path ?? null)
  )

  async function openEntry(path: string): Promise<void> {
    if (await editor.open(path)) layout.mainView = 'write'
  }

  async function editEntry(path: string): Promise<void> {
    if (editor.entry?.path === path || (await editor.open(path))) {
      layout.mainView = 'write'
      layout.rightTab = 'properties'
    }
  }

  function consultEntry(path: string): void {
    if (codex.listing?.entries.some((entry) => entry.path === path)) reference.open(path)
    else void openEntry(path)
  }

  return { openEntry, editEntry, consultEntry, selectedCodexPath }
}
