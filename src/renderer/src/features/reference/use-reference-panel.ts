import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useWorkbenchNavigation } from '../../app/use-workbench-navigation'
import { storeToRefs } from 'pinia'
import { useLiveDraft } from '../../app/use-live-draft'
import { useReferenceStore } from '../../app/reference-store'
import { useEditorLinks } from '../../app/use-editor-links'
import { useErrorNotice } from '../../shared/use-error-notice'

/** Presents an independent reference, using live draft text when the same file is being edited. */
export function useReferencePanel() {
  const reference = useReferenceStore()
  const editor = useEditorStore()
  const codex = useCodexStore()
  const navigation = useWorkbenchNavigation()
  const links = useEditorLinks((path) => {
    reference.open(path)
  })
  const { message: actionError, source: actionErrorSource } = useErrorNotice()
  let actionRequest = 0
  const scroller = useTemplateRef<HTMLElement>('referenceScroller')
  let displayedPath: string | null = null
  let restoring = true
  let restoration = 0
  const { path, text: readText } = storeToRefs(reference)
  const { openInEditor, text } = useLiveDraft(path, readText)
  const profile = computed(() =>
    codex.listing?.entries.find((entry) => entry.path === reference.path)
  )
  onMounted(() => void reference.reload())

  watch(
    () => reference.path,
    () => {
      actionRequest += 1
      actionError.value = null
      links.linkNotice.value = null
    },
    { flush: 'sync' }
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
  onBeforeUnmount(() => {
    actionRequest += 1
    rememberScroll()
  })
  watch(
    () => editor.entry?.path,
    (_next, previous) => {
      if (previous === reference.path) void reference.reload()
    }
  )

  async function edit(): Promise<void> {
    const request = ++actionRequest
    actionError.value = null
    const path = reference.path
    if (path === null) return
    if (openInEditor.value) {
      // Already open: the document may be behind another main view.
      if (!(await navigation.showCenterView('write'))) return
    } else {
      const opened = await editor.open(path)
      if (request !== actionRequest) return
      if (!opened) {
        actionErrorSource.value = editor.getActionError() ?? { notice: 'reference-open-failed' }
        return
      }
    }
    navigation.choosePanel('properties')
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
