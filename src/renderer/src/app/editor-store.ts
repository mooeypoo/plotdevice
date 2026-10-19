import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { ApiError, ProjectChangeDto, RenamePlanDto } from '../../../contract/dtos'
import { createAutosaver } from './autosaver'
import { entryOwner, placeOf } from './entry-owners'
import type { EntryKind, EntryPlace } from './entry-place'
import { plotDeviceApi } from './plot-device-api'

export type { EntryKind, EntryPlace } from './entry-place'

/** Where the open entry's text stands relative to the file on disk. */
export type SaveState = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'error' | 'missing'

/** The entry open in the editor. */
export interface OpenEntry extends EntryPlace {
  readonly path: string
  /** Increments when the text is replaced from disk, so the editor remounts with it. */
  readonly revision: number
}

/** A rename waiting for the writer's answer (`settings.file_names: ask`). */
export interface PendingRename {
  readonly path: string
  readonly plan: RenamePlanDto
}

/** Autosave this long after the writer stops typing. */
export const AUTOSAVE_DELAY_MS = 800

const isManuscriptKind = (kind: EntryKind): kind is 'part' | 'chapter' =>
  kind === 'part' || kind === 'chapter'

/**
 * The entry open in the editor, whatever its kind: its text, saving it, conflicts with outside
 * edits, a vanished file, and renaming it to match its title. The manuscript and codex stores own
 * the listings and the properties.
 */
export const useEditorStore = defineStore('editor', () => {
  const entry = ref<OpenEntry | null>(null)
  const text = ref('')
  const wordCount = ref(0)
  const saveState = ref<SaveState>('saved')
  const saveError = ref<string | null>(null)
  /** A short note after the open text was replaced by a newer version from disk. */
  const diskNotice = ref<string | null>(null)
  const pendingRename = shallowRef<PendingRename | null>(null)
  const actionError = ref<string | null>(null)
  // The open file's version, shared by the editor and the inspector: both write the same file.
  let version = ''
  let savedText = ''
  let revision = 0

  /** The API for the open entry's kind: manuscript entries and codex entries have their own. */
  const apiFor = (
    kind: EntryKind
  ):
    | ReturnType<typeof plotDeviceApi.current>['codex']
    | ReturnType<typeof plotDeviceApi.current>['manuscript'] =>
    isManuscriptKind(kind) ? plotDeviceApi.current().manuscript : plotDeviceApi.current().codex

  async function save(overwrite = false): Promise<void> {
    const current = entry.value
    if (current === null || saveState.value === 'missing') return
    if (saveState.value === 'conflict' && !overwrite) return
    const sending = text.value
    if (sending === savedText && !overwrite) {
      saveState.value = 'saved'
      return
    }
    saveState.value = 'saving'
    const result = await apiFor(current.kind).saveEntryText(
      current.path,
      sending,
      version,
      overwrite
    )
    if (entry.value?.path !== current.path) return

    if (result.ok) {
      version = result.value.version
      savedText = sending
      const delta = result.value.wordCount - wordCount.value
      wordCount.value = result.value.wordCount
      entryOwner(current.kind)?.addWords(current.path, delta)
      saveState.value = text.value === sending ? 'saved' : 'unsaved'
      saveError.value = null
      if (saveState.value === 'unsaved') autosaver.schedule()
    } else if (result.error.code === 'changed-on-disk') {
      saveState.value = 'conflict'
      saveError.value = null
    } else {
      saveState.value = 'error'
      saveError.value = describeSaveError(result.error)
    }
  }

  const autosaver = createAutosaver({ delayMs: AUTOSAVE_DELAY_MS, save: () => save() })

  /** Unsaved text that saving can't fix by itself (a conflict, a failed save, or a missing file). */
  const hasStuckChanges = computed(
    () =>
      saveState.value === 'missing' ||
      ((saveState.value === 'conflict' || saveState.value === 'error') && text.value !== savedText)
  )

  async function open(path: string): Promise<boolean> {
    await flush()
    // Switching now would silently drop the writer's unsaved text.
    if (hasStuckChanges.value) return false
    const place = placeOf(path)
    if (place === undefined) return false
    const result = await apiFor(place.kind).openEntry(path)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    revision += 1
    entry.value = { ...place, path, revision }
    text.value = result.value.text
    savedText = result.value.text
    version = result.value.version
    wordCount.value = result.value.wordCount
    saveState.value = 'saved'
    saveError.value = null
    actionError.value = null
    diskNotice.value = null
    pendingRename.value = null
    await readProperties()
    return true
  }

  /**
   * Reads the open entry's properties into its store, and adopts the file's version if the editor
   * has nothing unsaved (the properties were read from the same file).
   */
  async function readProperties(): Promise<void> {
    const current = entry.value
    if (current === null) return
    const read = await entryOwner(current.kind)?.readProperties(current.path)
    if (read !== undefined && entry.value?.path === current.path && saveState.value === 'saved') {
      version = read
    }
  }

  /** Keeps the open entry's label and title in step with its store after the listings reload. */
  function refreshPlace(): void {
    const current = entry.value
    const place = current === null ? undefined : placeOf(current.path)
    if (current !== null && place !== undefined) entry.value = { ...current, ...place }
  }

  /** The version to send with a properties change, after saving the text first. */
  async function versionForPropertyChange(): Promise<string | undefined> {
    await flush()
    if (hasStuckChanges.value || saveState.value === 'conflict') return undefined
    return version
  }

  /** After a properties change: the file's new version, and a conflict if the change was refused. */
  function propertiesWritten(
    result: { ok: true; version: string } | { ok: false; conflict: boolean; message: string }
  ): void {
    if (result.ok) {
      version = result.version
      actionError.value = null
    } else if (result.conflict) {
      saveState.value = 'conflict'
    } else {
      actionError.value = result.message
    }
  }

  /**
   * Catches up with files other programs changed. If the open entry's file changed: a change that
   * leaves its text as last saved (only line endings or frontmatter) just updates the version; new
   * text loads quietly unless the writer has unsaved typing, which becomes a conflict; a vanished
   * file keeps the writer's text and stops saving.
   */
  async function syncFromDisk(changes: readonly ProjectChangeDto[]): Promise<void> {
    refreshPlace()
    const current = entry.value
    if (current === null || !changes.some((change) => change.path === current.path)) return

    const result = await apiFor(current.kind).openEntry(current.path)
    if (entry.value?.path !== current.path) return
    if (!result.ok) {
      if (result.error.code === 'not-found' || result.error.code === 'entry-not-allowed') {
        autosaver.cancel()
        saveState.value = 'missing'
        diskNotice.value = null
      }
      return
    }

    const disk = result.value
    const wasMissing = saveState.value === 'missing'
    if (disk.text === savedText || disk.text === text.value) {
      version = disk.version
      savedText = disk.text
      if (wasMissing || saveState.value === 'conflict') {
        saveState.value = text.value === savedText ? 'saved' : 'unsaved'
        if (saveState.value === 'unsaved') autosaver.schedule()
      }
    } else if (text.value === savedText && saveState.value !== 'conflict' && !wasMissing) {
      autosaver.cancel()
      revision += 1
      entry.value = { ...current, revision }
      text.value = disk.text
      savedText = disk.text
      version = disk.version
      wordCount.value = disk.wordCount
      saveState.value = 'saved'
      diskNotice.value = 'Updated from disk: this file changed in another program.'
    } else {
      autosaver.cancel()
      saveState.value = 'conflict'
    }
    await readProperties()
  }

  /**
   * The open file vanished: saves the writer's text as a new entry of the same kind and title (a
   * chapter goes back into its part when that still exists), and opens it.
   */
  async function saveMissingAsNew(): Promise<boolean> {
    const current = entry.value
    if (current === null || saveState.value !== 'missing') return false
    const keep = text.value
    const partPath =
      current.partPath !== undefined && placeOf(current.partPath) !== undefined
        ? current.partPath
        : null
    const api = plotDeviceApi.current()
    const result =
      current.kind === 'part'
        ? await api.manuscript.createPart(current.title)
        : current.kind === 'chapter'
          ? await api.manuscript.createChapter(partPath, current.title)
          : await api.codex.createEntry(current.kind, current.title)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    await entryOwner(current.kind)?.reload()
    // The text is about to be saved into the new file; nothing is left behind.
    saveState.value = 'saved'
    savedText = text.value
    if (!(await open(result.value.path))) return false
    edit(keep)
    await flush()
    return true
  }

  /** The open file vanished and the writer doesn't want its text: closes it. */
  function discardMissing(): void {
    if (saveState.value !== 'missing') return
    autosaver.cancel()
    saveState.value = 'saved'
    entry.value = null
    text.value = ''
    savedText = ''
  }

  /** After a title change: rename the file now (`always`), or ask first (`ask`). */
  async function offerRename(path: string): Promise<void> {
    pendingRename.value = null
    const current = entry.value
    if (current?.path !== path) return
    const result = await apiFor(current.kind).planRename(path)
    if (!result.ok || result.value === null || entry.value?.path !== path) return
    if (result.value.policy === 'always') await renameEntry(path)
    else pendingRename.value = { path, plan: result.value }
  }

  /** Renames the file to match its title, updating links; the open entry follows it. */
  async function renameEntry(path: string): Promise<boolean> {
    pendingRename.value = null
    const current = entry.value
    if (current?.path !== path) return false
    await flush()
    if (hasStuckChanges.value) return false
    const result = await apiFor(current.kind).renameEntry(path)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    const { skipped } = result.value
    actionError.value =
      skipped.length > 0
        ? `Renamed, but links in ${String(skipped.length)} ${skipped.length === 1 ? 'file' : 'files'} couldn’t be updated safely: ${skipped.join(', ')}.`
        : null
    followMove(path, result.value.path)
    await entryOwner(current.kind)?.reload()
    refreshPlace()
    await readProperties()
    return true
  }

  function dismissRename(): void {
    pendingRename.value = null
  }

  /** The open entry's file moved (a rename or a move between parts): follow it, keeping the text. */
  function followMove(from: string, to: string): void {
    const current = entry.value
    if (current !== null && current.path === from && to !== from)
      entry.value = { ...current, path: to }
  }

  function edit(newText: string): void {
    text.value = newText
    diskNotice.value = null
    if (saveState.value === 'conflict' || saveState.value === 'missing') return
    saveState.value = newText === savedText ? 'saved' : 'unsaved'
    if (saveState.value === 'unsaved') autosaver.schedule()
  }

  async function flush(): Promise<void> {
    await autosaver.flush()
  }

  /** In a conflict: drop the writer's unsaved text and load the file as it is on disk now. */
  async function loadVersionOnDisk(): Promise<void> {
    const current = entry.value
    if (current === null) return
    autosaver.cancel()
    saveState.value = 'saved'
    savedText = text.value
    await open(current.path)
  }

  /** In a conflict: write the writer's text over the outside change. */
  async function keepMine(): Promise<void> {
    autosaver.cancel()
    await save(true)
  }

  /** Saves and closes the entry, back to the project overview. */
  function closeEntry(): void {
    void flush().then(() => {
      entry.value = null
    })
  }

  /** Saves and forgets everything, when the project closes. */
  async function close(): Promise<void> {
    await flush()
    pendingRename.value = null
    entry.value = null
    text.value = ''
    savedText = ''
  }

  return {
    entry,
    text,
    wordCount,
    saveState,
    saveError,
    diskNotice,
    pendingRename,
    actionError,
    hasStuckChanges,
    open,
    edit,
    flush,
    loadVersionOnDisk,
    keepMine,
    closeEntry,
    close,
    readProperties,
    refreshPlace,
    versionForPropertyChange,
    propertiesWritten,
    syncFromDisk,
    saveMissingAsNew,
    discardMissing,
    offerRename,
    renameEntry,
    dismissRename,
    followMove,
    canOpen: (path: string) => placeOf(path) !== undefined
  }
})

function describeSaveError(error: ApiError): string {
  switch (error.code) {
    case 'read-only':
      return 'This project is open read-only, so changes aren’t saved.'
    case 'not-found':
      return 'This file was moved or deleted outside Plot Device.'
    default:
      return error.message
  }
}
