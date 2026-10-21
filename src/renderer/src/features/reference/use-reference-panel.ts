import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useLayoutStore } from '../../app/layout-store'
import { useReferenceStore } from '../../app/reference-store'
import { useEditorLinks } from '../editor/use-editor-links'

/** Presents an independent reference, using live draft text when the same file is being edited. */
export function useReferencePanel() {
  const reference = useReferenceStore()
  const editor = useEditorStore()
  const codex = useCodexStore()
  const layout = useLayoutStore()
  const links = useEditorLinks((path) => {
    reference.open(path)
  })
  const actionError = ref<string | null>(null)
  const scroller = useTemplateRef<HTMLElement>('referenceScroller')
  let displayedPath: string | null = null
  let restoring = true
  let restoration = 0
  const openInEditor = computed(
    () => reference.path !== null && editor.entry?.path === reference.path
  )
  const text = computed(() => (openInEditor.value ? editor.text : reference.text))
  const profile = computed(() =>
    codex.listing?.entries.find((entry) => entry.path === reference.path)
  )
  onMounted(() => void reference.reload())

  watch(
    () => reference.path,
    () => {
      actionError.value = null
      links.linkNotice.value = null
    }
  )
  watch(
    [() => reference.path, text, () => reference.loading],
    async () => {
      const identity = ++restoration
      restoring = true
      await nextTick()
      if (identity !== restoration || scroller.value === null || text.value === null) return
      scroller.value.scrollTop = reference.scrollTop()
      displayedPath = reference.path
      restoring = false
    },
    { immediate: true }
  )
  function rememberScroll(): void {
    if (!restoring && scroller.value !== null)
      reference.rememberScroll(scroller.value.scrollTop, displayedPath)
  }
  onBeforeUnmount(rememberScroll)
  watch(
    () => editor.entry?.path,
    (_next, previous) => {
      if (previous === reference.path) void reference.reload()
    }
  )

  async function edit(): Promise<void> {
    actionError.value = null
    const path = reference.path
    if (path === null) return
    if (!openInEditor.value && !(await editor.open(path))) {
      actionError.value = editor.hasStuckChanges
        ? 'Resolve the unsaved changes in the current editor before opening another document.'
        : (editor.actionError ?? 'This document could not be opened in the editor.')
      return
    }
    layout.mainView = 'write'
    layout.rightTab = 'properties'
  }

  return {
    text,
    profile,
    openInEditor,
    actionError,
    rememberScroll,
    linkNotice: links.linkNotice,
    openLink: (link: Parameters<typeof links.openLink>[0]) =>
      links.openLink(link, reference.path ?? undefined),
    edit
  }
}
