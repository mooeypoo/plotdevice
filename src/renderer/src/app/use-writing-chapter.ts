import { computed } from 'vue'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useEntryCard } from './use-entry-card'

/**
 * The chapter the page is about: the Writing target, or else the open part or chapter. Its text
 * (the editor's live draft when open there) and properties are read like a card's, read-only.
 */
export function useWritingChapter() {
  const tabs = useDocumentTabsStore()
  const editor = useEditorStore()
  const path = computed(() => {
    if (tabs.writingPath !== null) return tabs.writingPath
    const entry = editor.entry
    return entry !== null && (entry.kind === 'chapter' || entry.kind === 'part') ? entry.path : null
  })
  return { path, ...useEntryCard(path) }
}
