import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type {
  AppearanceDto,
  CodexChangesDto,
  CodexKindDto,
  CodexListingDto,
  CodexPropertiesDto,
  SettableTypeDto
} from '../../../contract/dtos'
import { useEditorStore } from './editor-store'
import { registerEntryOwner } from './entry-owners'
import type { EntryPlace } from './entry-place'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'

const KIND_LABELS: Readonly<Record<CodexKindDto, string>> = {
  character: 'Character',
  location: 'Location',
  note: 'Note'
}

/**
 * The codex tab's data: characters, locations, notes, and untyped files, plus the open codex
 * entry's properties and the chapters it appears in.
 */
export const useCodexStore = defineStore('codex', () => {
  const listing = shallowRef<CodexListingDto | null>(null)
  const loadError = ref<string | null>(null)
  const properties = shallowRef<CodexPropertiesDto | null>(null)
  const appearsIn = shallowRef<readonly AppearanceDto[]>([])

  const api = (): ReturnType<typeof plotDeviceApi.current>['codex'] => plotDeviceApi.current().codex

  const places = computed(
    () =>
      new Map<string, EntryPlace>([
        ...(listing.value?.entries ?? []).map((entry): [string, EntryPlace] => [
          entry.path,
          { kind: entry.kind, title: entry.title, label: KIND_LABELS[entry.kind] }
        ]),
        ...(listing.value?.templates ?? []).map((template): [string, EntryPlace] => [
          template.path,
          {
            kind: 'template',
            title: `${KIND_LABELS[template.kind]} template`,
            label: 'Template',
            templateOf: template.kind
          }
        ])
      ])
  )

  async function load(): Promise<void> {
    const result = await api().listCodex()
    if (result.ok) {
      listing.value = result.value
      loadError.value = null
    } else {
      loadError.value = result.error.message
    }
  }

  /** Re-reads the codex and keeps the open entry's label and title in step with it. */
  async function reload(): Promise<void> {
    await load()
    useEditorStore().refreshPlace()
  }

  /** Reads a codex entry's properties and appearances; returns the file version they came from. */
  async function readProperties(path: string): Promise<string | undefined> {
    if (places.value.get(path)?.kind === 'template') {
      // A template has no properties; only its text is edited.
      properties.value = null
      appearsIn.value = []
      return undefined
    }
    const [read, appearances] = await Promise.all([
      api().getProperties(path),
      api().getAppearsIn(path)
    ])
    if (useEditorStore().entry?.path !== path) return undefined
    properties.value = read.ok ? read.value.properties : null
    appearsIn.value = appearances.ok ? appearances.value : []
    return read.ok ? read.value.version : undefined
  }

  /** Saves inspector changes, after the text, so the two writes never conflict with each other. */
  async function updateProperties(changes: CodexChangesDto): Promise<boolean> {
    const editor = useEditorStore()
    const current = editor.entry
    if (current === null) return false
    const version = await editor.versionForPropertyChange()
    if (version === undefined) return false
    const result = await api().updateProperties(current.path, version, changes)
    if (editor.entry?.path !== current.path) return false
    if (!result.ok) {
      editor.propertiesWritten({
        ok: false,
        conflict: result.error.code === 'changed-on-disk',
        message: result.error.message
      })
      return false
    }
    editor.propertiesWritten({ ok: true, version: result.value.version })
    properties.value = result.value.properties
    await reload()
    if (changes.title !== undefined) await editor.offerRename(current.path)
    return true
  }

  /** Creates an entry from its template and opens it. */
  async function createEntry(kind: CodexKindDto, title: string): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await api().createEntry(kind, title)
    if (!result.ok) {
      editor.actionError = result.error.message
      return false
    }
    await reload()
    return editor.open(result.value.path)
  }

  /** Opens the template new entries of `kind` start from, creating it from the default if needed. */
  async function editTemplate(kind: CodexKindDto): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await api().editTemplate(kind)
    if (!result.ok) {
      editor.actionError = result.error.message
      return false
    }
    await reload()
    return editor.open(result.value.path)
  }

  /** Gives an untyped file a type; it moves to the codex list or the binder. */
  async function setEntryType(path: string, type: SettableTypeDto): Promise<boolean> {
    const result = await api().setEntryType(path, type)
    if (!result.ok) {
      useEditorStore().actionError = result.error.message
      return false
    }
    await Promise.all([reload(), useManuscriptStore().reload()])
    return true
  }

  function close(): void {
    listing.value = null
    properties.value = null
    appearsIn.value = []
  }

  return {
    listing,
    loadError,
    properties,
    appearsIn,
    load,
    reload,
    readProperties,
    updateProperties,
    createEntry,
    editTemplate,
    setEntryType,
    close,
    // Codex entries have no word counts in a listing.
    addWords: (): void => undefined,
    placeOf: (path: string): EntryPlace | undefined => places.value.get(path)
  }
})

registerEntryOwner(['character', 'location', 'note', 'template'], () => useCodexStore())
