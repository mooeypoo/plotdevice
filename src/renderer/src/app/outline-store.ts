import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { OutlineDto } from '../../../contract/dtos'
import { useEditorStore } from './editor-store'
import { registerEntryOwner } from './entry-owners'
import type { EntryPlace } from './entry-place'
import { plotDeviceApi } from './plot-device-api'
import { useWorkbenchStore } from './workbench-store'
import { useErrorNotice } from '../shared/use-error-notice'

/**
 * The project's outlines and the current one, which the board and the outline view share (Q9).
 * Outlines have no properties; only their text is edited.
 */
export const useOutlineStore = defineStore('outline', () => {
  const outlines = shallowRef<readonly OutlineDto[]>([])
  /** Increments whenever outlines may have changed on disk, so views re-read them. */
  const revision = ref(0)
  const { message: loadError, source: loadErrorSource } = useErrorNotice()
  let loadRequest = 0

  const api = (): ReturnType<typeof plotDeviceApi.current>['outline'] =>
    plotDeviceApi.current().outline

  /** The outline the writer chose, or the first by title. */
  const currentPath = computed<string | null>(() => {
    const chosen = useWorkbenchStore().outlinePath
    return outlines.value.some((outline) => outline.path === chosen)
      ? chosen
      : (outlines.value[0]?.path ?? null)
  })

  const places = computed(
    () =>
      new Map(
        outlines.value.map((outline): [string, EntryPlace] => [
          outline.path,
          { kind: 'outline', title: outline.title, label: { type: 'outline' } }
        ])
      )
  )

  async function load(): Promise<void> {
    const request = ++loadRequest
    const result = await api().list()
    if (request !== loadRequest) return
    if (result.ok) {
      outlines.value = result.value
      revision.value += 1
      loadError.value = null
    } else {
      loadErrorSource.value = result.error
    }
  }

  /** Re-reads the list and keeps the open outline's title in step with it. */
  async function reload(): Promise<void> {
    await load()
    useEditorStore().refreshPlace()
  }

  /** Tells views that an outline's text changed without a reload, such as after a capture. */
  function touched(): void {
    revision.value += 1
  }

  function choose(path: string): void {
    useWorkbenchStore().outlinePath = path
  }

  /** Creates an outline at the project root and opens it in the editor. */
  async function create(title: string): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await api().create(title)
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    await reload()
    return editor.open(result.value.path, { keep: true })
  }

  function close(): void {
    loadRequest += 1
    loadError.value = null
    outlines.value = []
  }

  return {
    outlines,
    revision,
    loadError,
    currentPath,
    load,
    reload,
    touched,
    choose,
    create,
    close,
    readProperties: (): Promise<string | undefined> => Promise.resolve(undefined),
    addWords: (): void => undefined,
    placeOf: (path: string): EntryPlace | undefined => places.value.get(path)
  }
})

registerEntryOwner(['outline'], () => useOutlineStore())

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useOutlineStore, import.meta.hot))
