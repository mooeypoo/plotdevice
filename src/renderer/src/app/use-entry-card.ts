import { computed, shallowRef, watch, type Ref } from 'vue'
import type { ApiError, CodexPropertiesDto, EntryPropertiesDto } from '../../../contract/dtos'
import { useCodexStore } from './codex-store'
import { createDocumentReader } from './document-reader'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useLiveDraft } from './use-live-draft'

/** An entry's properties as the inspectors read them, for showing on a card. */
export type EntryCardProperties =
  | { readonly kind: 'manuscript'; readonly value: EntryPropertiesDto }
  | { readonly kind: 'codex'; readonly value: CodexPropertiesDto }

/**
 * One card's data: a read-only reader of the entry's text, showing the editor's live draft when
 * the file is open there, and its properties. A card never saves or flushes (ADR 0014/0018); it
 * reads again when the project's listings reload after outside changes.
 */
export function useEntryCard(path: Readonly<Ref<string | null>>) {
  const reader = createDocumentReader()
  const codex = useCodexStore()
  const manuscript = useManuscriptStore()
  const { text, openInEditor } = useLiveDraft(reader.path, reader.text)
  const properties = shallowRef<EntryCardProperties | null>(null)
  const propertiesError = shallowRef<ApiError | null>(null)
  let request = 0

  async function readProperties(): Promise<void> {
    const identity = ++request
    const place = reader.entry.value
    properties.value = null
    propertiesError.value = null
    if (place === null) return
    const api = plotDeviceApi.current()
    if (place.kind === 'chapter' || place.kind === 'part') {
      const result = await api.manuscript.getEntryProperties(place.path)
      if (identity !== request) return
      if (result.ok) properties.value = { kind: 'manuscript', value: result.value.properties }
      else propertiesError.value = result.error
    } else if (place.kind === 'character' || place.kind === 'location' || place.kind === 'note') {
      const result = await api.codex.getProperties(place.path)
      if (identity !== request) return
      if (result.ok) properties.value = { kind: 'codex', value: result.value.properties }
      else propertiesError.value = result.error
    }
  }

  watch(
    path,
    (next) => {
      if (next === null) reader.clear()
      else reader.open(next)
    },
    { immediate: true }
  )
  // The reader knows the entry's kind once the listings place it.
  watch(reader.entry, () => void readProperties(), { immediate: true })
  // Outside edits reload the listings; read the text and properties again, as Reference does.
  watch([() => codex.revision, () => manuscript.manuscript], () => {
    void reader.reload()
    void readProperties()
  })

  return {
    entry: reader.entry,
    text,
    openInEditor,
    loading: reader.loading,
    error: reader.error,
    properties,
    title: computed(() => reader.entry.value?.title ?? null)
  }
}
