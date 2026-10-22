import { computed, type ComputedRef, type Ref } from 'vue'
import { useEditorStore } from './editor-store'

/**
 * What a reader should show: the editor's live draft while the same file is open for editing,
 * otherwise the text it read. The draft is shown, never saved or adopted (ADR 0014).
 */
export function useLiveDraft(
  path: Readonly<Ref<string | null>>,
  readText: Readonly<Ref<string | null>>
): { readonly openInEditor: ComputedRef<boolean>; readonly text: ComputedRef<string | null> } {
  const editor = useEditorStore()
  const openInEditor = computed(() => path.value !== null && editor.entry?.path === path.value)
  return {
    openInEditor,
    text: computed(() => (openInEditor.value ? editor.text : readText.value))
  }
}
