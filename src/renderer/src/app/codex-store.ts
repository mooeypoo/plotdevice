import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type {
  AppearanceDto,
  CodexChangesDto,
  CodexKindDto,
  CodexListingDto,
  CodexPropertiesDto,
  ListedByDto,
  RelationshipEditDto,
  SettableTypeDto
} from '../../../contract/dtos'
import { useEditorStore } from './editor-store'
import { registerEntryOwner } from './entry-owners'
import type { EntryPlace } from './entry-place'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'
import { useErrorNotice } from '../shared/use-error-notice'

const KIND_LABELS = {
  character: 'Character',
  location: 'Location',
  note: 'Note'
} as const

/**
 * The codex tab's data: characters, locations, notes, and untyped files, plus the open codex
 * entry's properties and the chapters it appears in.
 */
export const useCodexStore = defineStore('codex', () => {
  const listing = shallowRef<CodexListingDto | null>(null)
  /** Increments on every reload, so views of a file (the outline panel) know to re-read it. */
  const revision = ref(0)
  const { message: loadError, source: loadErrorSource } = useErrorNotice()
  let loadRequest = 0
  const properties = shallowRef<CodexPropertiesDto | null>(null)
  const appearsIn = shallowRef<readonly AppearanceDto[]>([])
  const { message: appearanceError, source: appearanceErrorSource } = useErrorNotice()
  const appearancePath = ref<string | null>(null)
  const appearsInError = computed(() =>
    useEditorStore().entry?.path === appearancePath.value ? appearanceError.value : null
  )
  let propertiesRequest = 0
  const listedBy = shallowRef<readonly ListedByDto[]>([])
  /** Why the last relationships change was refused, shown with the relationships. */
  const { message: relationshipsError, source: relationshipsErrorSource } = useErrorNotice()

  const api = (): ReturnType<typeof plotDeviceApi.current>['codex'] => plotDeviceApi.current().codex

  const places = computed(
    () =>
      new Map<string, EntryPlace>([
        ...(listing.value?.entries ?? []).map((entry): [string, EntryPlace] => [
          entry.path,
          {
            kind: entry.kind,
            title: entry.title,
            label: { type: 'codex-kind', kind: entry.kind }
          }
        ]),
        ...(listing.value?.outlines ?? []).map((outline): [string, EntryPlace] => [
          outline.path,
          { kind: 'outline', title: outline.title, label: { type: 'outline' } }
        ]),
        ...(listing.value?.templates ?? []).map((template): [string, EntryPlace] => [
          template.path,
          {
            kind: 'template',
            title: `${KIND_LABELS[template.kind]} template`,
            label: { type: 'template' },
            templateOf: template.kind
          }
        ])
      ])
  )

  async function load(): Promise<void> {
    const request = ++loadRequest
    const result = await api().listCodex()
    if (request !== loadRequest) return
    if (result.ok) {
      listing.value = result.value
      revision.value += 1
      loadError.value = null
      void useReferenceStore().reload()
    } else {
      loadErrorSource.value = result.error
    }
  }

  /** Re-reads the codex and keeps the open entry's label and title in step with it. */
  async function reload(): Promise<void> {
    await load()
    useEditorStore().refreshPlace()
  }

  /** Reads a codex entry's properties and appearances; returns the file version they came from. */
  async function readProperties(path: string): Promise<string | undefined> {
    const request = ++propertiesRequest
    appearanceErrorSource.value = null
    appearancePath.value = path
    const kind = places.value.get(path)?.kind
    if (kind === 'template' || kind === 'outline') {
      // Templates and outlines have no properties to edit; only their text.
      properties.value = null
      appearsIn.value = []
      listedBy.value = []
      return undefined
    }
    const [read, appearances] = await Promise.all([
      api().getProperties(path),
      api().getAppearsIn(path)
    ])
    if (request !== propertiesRequest || useEditorStore().entry?.path !== path) return undefined
    properties.value = read.ok ? read.value.properties : null
    if (!read.ok) useEditorStore().reportActionError(read.error)
    listedBy.value = read.ok ? read.value.listedBy : []
    appearsIn.value = appearances.ok ? appearances.value : []
    if (!appearances.ok) appearanceErrorSource.value = appearances.error
    relationshipsError.value = null
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
        error: result.error
      })
      return false
    }
    editor.propertiesWritten({ ok: true, version: result.value.version })
    properties.value = result.value.properties
    await reload()
    if (changes.title !== undefined) await editor.offerRename(current.path)
    return true
  }

  /**
   * Saves a character's relationships, after the text. A file whose relationships can't be edited
   * safely is left alone, and the reason is shown with them.
   */
  async function updateRelationships(
    relationships: readonly RelationshipEditDto[]
  ): Promise<boolean> {
    const editor = useEditorStore()
    const current = editor.entry
    if (current === null) return false
    const version = await editor.versionForPropertyChange()
    if (version === undefined) return false
    const result = await api().updateRelationships(current.path, version, relationships)
    if (editor.entry?.path !== current.path) return false
    if (!result.ok) {
      if (result.error.code === 'cannot-edit') {
        relationshipsErrorSource.value = {
          notice: 'relationships-cannot-edit',
          error: result.error
        }
        return false
      }
      editor.propertiesWritten({
        ok: false,
        conflict: result.error.code === 'changed-on-disk',
        error: result.error
      })
      return false
    }
    editor.propertiesWritten({ ok: true, version: result.value.version })
    properties.value = result.value.properties
    listedBy.value = result.value.listedBy
    relationshipsError.value = null
    return true
  }

  /** Creates an entry from its template and opens it. */
  async function createEntry(kind: CodexKindDto, title: string): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await api().createEntry(kind, title)
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    await reload()
    return editor.open(result.value.path, { keep: true })
  }

  /** Creates an outline at the project root and opens it in the editor. */
  async function createOutline(title: string): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await api().createOutline(title)
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    await reload()
    return editor.open(result.value.path, { keep: true })
  }

  /** Opens the template new entries of `kind` start from, creating it from the default if needed. */
  async function editTemplate(kind: CodexKindDto): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await api().editTemplate(kind)
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    await reload()
    return editor.open(result.value.path, { keep: true })
  }

  /** Gives an untyped file a type; it moves to the codex list or the binder. */
  async function setEntryType(path: string, type: SettableTypeDto): Promise<boolean> {
    const result = await api().setEntryType(path, type)
    if (!result.ok) {
      useEditorStore().reportActionError(result.error)
      return false
    }
    await Promise.all([reload(), useManuscriptStore().reload()])
    return true
  }

  function close(): void {
    propertiesRequest += 1
    appearancePath.value = null
    appearanceErrorSource.value = null
    loadRequest += 1
    loadError.value = null
    listing.value = null
    properties.value = null
    appearsIn.value = []
  }

  return {
    listing,
    revision,
    loadError,
    properties,
    appearsIn,
    appearsInError,
    listedBy,
    relationshipsError,
    load,
    reload,
    readProperties,
    updateProperties,
    updateRelationships,
    createEntry,
    createOutline,
    editTemplate,
    setEntryType,
    close,
    // Codex entries have no word counts in a listing.
    addWords: (): void => undefined,
    placeOf: (path: string): EntryPlace | undefined => places.value.get(path)
  }
})

registerEntryOwner(['character', 'location', 'note', 'template', 'outline'], () => useCodexStore())

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useCodexStore, import.meta.hot))
