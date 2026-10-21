import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useLayoutStore } from '../../app/layout-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import type { LinkAt } from '../editor/link-at'
import { useEditorLinks } from '../editor/use-editor-links'
import { useErrorNotice } from '../../shared/use-error-notice'

/** The outline shown beside the draft: which one, its text, and what links to the open entry. */
export function useOutlinePanel(): {
  readonly outlines: ComputedRef<readonly { readonly path: string; readonly title: string }[]>
  readonly path: ComputedRef<string | null>
  readonly text: Ref<string | null>
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
  const codex = useCodexStore()
  const editor = useEditorStore()
  const layout = useLayoutStore()
  const links = useEditorLinks()
  const text = ref<string | null>(null)
  const loading = ref(false)
  const { message: error, source: errorSource } = useErrorNotice()
  let request = 0

  const outlines = computed(() => codex.listing?.outlines ?? [])
  const path = computed(() => {
    const remembered = layout.outlinePath
    return outlines.value.some((outline) => outline.path === remembered)
      ? remembered
      : (outlines.value[0]?.path ?? null)
  })
  const openInEditor = computed(() => path.value !== null && editor.entry?.path === path.value)

  async function load(): Promise<void> {
    const identity = ++request
    const current = path.value
    text.value = null
    error.value = null
    loading.value = current !== null
    if (current === null) return
    const result = await plotDeviceApi.current().codex.openEntry(current)
    if (identity !== request || path.value !== current) return
    loading.value = false
    if (result.ok) text.value = result.value.text
    else errorSource.value = result.error
  }

  // Re-read when the outline changes, the codex reloads (outside edits), or the main editor lets
  // go of it (its last saves are on disk).
  watch([path, () => codex.revision, openInEditor], () => void load(), { immediate: true })

  const pointsHere = computed(() => {
    const open = editor.entry?.path
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
      layout.outlinePath = chosen
    },
    edit: async () => {
      if (path.value !== null) await editor.open(path.value)
    },
    create: async () => {
      await codex.createOutline('')
    },
    openLink: (link) => links.openLink(link, path.value ?? undefined),
    pointsHere
  }
}
