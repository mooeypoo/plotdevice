import { onBeforeUnmount } from 'vue'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import type { ProseEditor } from './prose-editor'

/** Retains history and reading position for a kept document while its editor is unmounted. */
export function useDocumentView(
  id: string | undefined,
  host: () => HTMLElement | null,
  editor: () => ProseEditor | undefined
) {
  const tabs = useDocumentTabsStore()
  const saved = id === undefined ? undefined : tabs.viewOf(id)

  function restoreScroll(text: string): void {
    const pane = host()?.closest('.pane')
    if (!(pane instanceof HTMLElement)) return
    const matches = saved?.state.doc.toString() === text
    pane.scrollTop = matches ? saved.scrollTop : 0
    pane.scrollLeft = matches ? saved.scrollLeft : 0
  }

  onBeforeUnmount(() => {
    const view = editor()
    const pane = host()?.closest('.pane')
    if (id === undefined || view === undefined) return
    tabs.rememberView(id, {
      state: view.snapshot(),
      scrollTop: pane instanceof HTMLElement ? pane.scrollTop : 0,
      scrollLeft: pane instanceof HTMLElement ? pane.scrollLeft : 0
    })
  })

  return { state: saved?.state, restoreScroll }
}
