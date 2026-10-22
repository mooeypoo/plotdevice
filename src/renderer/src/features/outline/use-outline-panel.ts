import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useOutlineStore } from '../../app/outline-store'
import { useEditorStore } from '../../app/editor-store'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import { useLiveDraft } from '../../app/use-live-draft'
import { plotDeviceApi } from '../../app/plot-device-api'
import type { LinkAt } from '../../shared/link-at'
import { useEditorLinks } from '../../app/use-editor-links'
import { useErrorNotice } from '../../shared/use-error-notice'

/** The outline shown beside the draft: which one, its text, and what links to the open entry. */
export function useOutlinePanel(): {
  readonly outlines: ComputedRef<readonly { readonly path: string; readonly title: string }[]>
  readonly path: ComputedRef<string | null>
  /** The outline's text: the editor's live draft while it is open there (ADR 0018). */
  readonly text: ComputedRef<string | null>
  readonly loading: Ref<boolean>
  readonly error: Ref<string | null>
  readonly linkNotice: Ref<string | null>
  /** The outline is open in the main editor, so the panel defers to it. */
  readonly openInEditor: ComputedRef<boolean>
  readonly choose: (path: string) => void
  readonly edit: () => Promise<void>
  readonly create: () => Promise<void>
  readonly openLink: (link: LinkAt) => Promise<void>
  readonly pointsHere: ComputedRef<(link: LinkAt) => boolean>
} {
  const outlineStore = useOutlineStore()
  const editor = useEditorStore()
  const links = useEditorLinks()
  const readText = ref<string | null>(null)
  const loading = ref(false)
  const { message: error, source: errorSource } = useErrorNotice()
  let request = 0

  const outlines = computed(() => outlineStore.outlines)
  const path = computed(() => outlineStore.currentPath)
  const { openInEditor, text } = useLiveDraft(path, readText)
  const tabs = useDocumentTabsStore()

  async function load(): Promise<void> {
    const identity = ++request
    const current = path.value
    readText.value = null
    error.value = null
    loading.value = current !== null
    if (current === null) return
    const result = await plotDeviceApi.current().outline.openEntry(current)
    if (identity !== request || path.value !== current) return
    loading.value = false
    if (result.ok) readText.value = result.value.text
    else errorSource.value = result.error
  }

  // Re-read when the outline changes, the outlines reload (outside edits), or the main editor lets
  // go of it (its last saves are on disk).
  watch([path, () => outlineStore.revision, openInEditor], () => void load(), { immediate: true })

  /** The chapter the outline highlights: the open part or chapter, otherwise the Writing target. */
  const highlighted = computed(() => {
    const entry = editor.entry
    if (entry !== null && (entry.kind === 'chapter' || entry.kind === 'part')) return entry.path
    return tabs.writingPath ?? undefined
  })

  const pointsHere = computed(() => {
    const open = highlighted.value
    const from = path.value
    return (link: LinkAt): boolean =>
      open !== undefined && from !== null && links.linkMeans(link, open, from)
  })

  return {
    outlines,
    path,
    text,
    loading,
    error,
    linkNotice: links.linkNotice,
    openInEditor,
    choose: (chosen) => {
      outlineStore.choose(chosen)
    },
    edit: async () => {
      if (path.value !== null) await editor.open(path.value)
    },
    create: async () => {
      await outlineStore.create('')
    },
    openLink: (link) => links.openLink(link, path.value ?? undefined),
    pointsHere
  }
}
