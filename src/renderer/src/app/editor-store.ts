import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import type { ProjectChangeDto, RenamePlanDto } from '../../../contract/dtos'
import { createAutosaver } from './autosaver'
import { entryOwner, placeOf } from './entry-owners'
import type { EntryKind, EntryPlace } from './entry-place'
import { plotDeviceApi } from './plot-device-api'
import { useEntryRecovery } from './entry-recovery'
import { useReferenceStore } from './reference-store'
import { useDocumentTabsStore } from './document-tabs-store'
import { useLayoutStore } from './layout-store'
import { useUiLanguageStore } from './ui-language-store'
import { useErrorNotice } from '../shared/use-error-notice'

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
  const { message: saveError, source: saveErrorSource } = useErrorNotice()
  /** A short note after the open text was replaced by a newer version from disk. */
  const { message: diskNotice, source: diskNoticeSource } = useErrorNotice()
  const pendingRename = shallowRef<PendingRename | null>(null)
  const { message: actionError, source: actionErrorSource } = useErrorNotice()
  const language = useUiLanguageStore()
  const recovery = useEntryRecovery()
  const recoveryBusy = recovery.busy
  const recoveryError = recovery.error
  const recoveryErrorSource = recovery.errorSource
  const recoveredPath = recovery.recoveredPath
  const missingReappeared = ref(false)
  const tabs = useDocumentTabsStore()
  const pendingNavigation = ref(0)
  const navigationBusy = computed(() => pendingNavigation.value > 0)
  let navigation: Promise<boolean> = Promise.resolve(true)
  // The open file's version, shared by the editor and the inspector: both write the same file.
  let version = ''
  let savedText = ''
  let revision = 0
  let recoveryToken: string | undefined
  let recoveredText: string | undefined
  let syncAfterRecovery: string | undefined

  watch(
    recoveryBusy,
    (busy) => {
      if (busy || syncAfterRecovery === undefined) return
      const path = syncAfterRecovery
      syncAfterRecovery = undefined
      void syncFromDisk([{ path, kind: 'changed' }])
    },
    { flush: 'sync' }
  )

  async function captureRecovery(): Promise<void> {
    const current = entry.value
    if (current === null) return
    const capturingVersion = version
    const captured = await plotDeviceApi.current().recovery.capture(current.path, capturingVersion)
    if (entry.value?.path !== current.path || version !== capturingVersion) return
    if (captured.ok) recoveryToken = captured.value
    else {
      recoveryToken = undefined
      recoveryErrorSource.value = captured.error
    }
  }

  /** The API for the open entry's kind: manuscript entries and codex entries have their own. */
  const apiFor = (
    kind: EntryKind
  ):
    | ReturnType<typeof plotDeviceApi.current>['codex']
    | ReturnType<typeof plotDeviceApi.current>['manuscript'] =>
    isManuscriptKind(kind) ? plotDeviceApi.current().manuscript : plotDeviceApi.current().codex

  async function save(replacementVersion?: string): Promise<void> {
    const current = entry.value
    if (
      current === null ||
      saveState.value === 'missing' ||
      (recoveryBusy.value && replacementVersion === undefined)
    )
      return
    if (saveState.value === 'conflict' && replacementVersion === undefined) return
    const sending = text.value
    if (sending === savedText && replacementVersion === undefined) {
      saveState.value = 'saved'
      return
    }
    saveState.value = 'saving'
    saveError.value = null
    const result = await apiFor(current.kind).saveEntryText(
      current.path,
      sending,
      replacementVersion ?? version,
      false
    )
    if (entry.value?.path !== current.path) return
    // A watcher may have detected a deletion or conflict while this save was in flight.
    if (['missing', 'conflict'].includes(saveState.value)) return

    if (result.ok) {
      version = result.value.version
      savedText = sending
      const delta = result.value.wordCount - wordCount.value
      wordCount.value = result.value.wordCount
      entryOwner(current.kind)?.addWords(current.path, delta)
      saveState.value = text.value === sending ? 'saved' : 'unsaved'
      saveError.value = null
      await captureRecovery()
      if (saveState.value === 'unsaved') autosaver.schedule()
    } else if (result.error.code === 'changed-on-disk') {
      saveState.value = 'conflict'
      saveError.value = null
    } else if (result.error.code === 'not-found' || result.error.code === 'entry-not-allowed') {
      autosaver.cancel()
      saveState.value = 'missing'
      missingReappeared.value = false
    } else {
      saveState.value = 'error'
      saveErrorSource.value =
        result.error.code === 'read-only'
          ? { notice: 'editor-save-read-only' }
          : result.error.code === 'not-found'
            ? { notice: 'editor-save-missing' }
            : result.error
    }
  }

  const autosaver = createAutosaver({ delayMs: AUTOSAVE_DELAY_MS, save: () => save() })

  /** Unsaved text that saving can't fix by itself (a conflict, a failed save, or a missing file). */
  function needsRecovery(): boolean {
    return (
      saveState.value === 'missing' ||
      saveState.value === 'conflict' ||
      (saveState.value === 'error' && text.value !== savedText)
    )
  }
  const hasStuckChanges = computed(() => recoveryBusy.value || needsRecovery())

  function blocked(): boolean {
    if (!hasStuckChanges.value) return false
    actionErrorSource.value = { notice: 'editor-resolve-before-leaving' }
    return true
  }

  function enqueue(run: () => Promise<boolean>): Promise<boolean> {
    pendingNavigation.value += 1
    navigation = navigation.then(run, run).finally(() => {
      pendingNavigation.value -= 1
    })
    return navigation
  }

  function open(path: string, options: { readonly keep?: boolean } = {}): Promise<boolean> {
    return enqueue(() => navigate(path, options.keep ?? false))
  }

  async function navigate(path: string, keep: boolean): Promise<boolean> {
    if (entry.value?.path === path) {
      tabs.opened(path, keep)
      useLayoutStore().mainView = 'write'
      return true
    }
    if (recoveryBusy.value) {
      blocked()
      return false
    }
    await flush()
    // Switching now would silently drop the writer's unsaved text.
    if (blocked()) return false
    const place = placeOf(path)
    if (place === undefined) {
      actionErrorSource.value = { notice: 'editor-not-listed' }
      return false
    }
    const result = await apiFor(place.kind).openEntry(path)
    if (!result.ok) {
      actionErrorSource.value = result.error
      return false
    }
    // The previous editor can receive a final input before its read-only view update.
    await flush()
    if (blocked()) return false
    revision += 1
    tabs.opened(path, keep)
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
    recovery.clear()
    recoveryToken = undefined
    missingReappeared.value = false
    await captureRecovery()
    await readProperties()
    useLayoutStore().mainView = 'write'
    return true
  }

  function returnToWriting(): Promise<boolean> {
    const path = tabs.writingPath
    return path === null ? Promise.resolve(false) : open(path)
  }

  function cycleDocument(direction: 1 | -1): Promise<boolean> {
    return enqueue(async () => {
      const documents = tabs.ordered
      if (documents.length === 0) return false
      const index = documents.findIndex((tab) => tab.path === entry.value?.path)
      const next = documents[(index + direction + documents.length) % documents.length]
      return next === undefined ? false : navigate(next.path, false)
    })
  }

  function closeDocument(path: string): Promise<boolean> {
    return enqueue(async () => {
      if (!tabs.canClose(path)) {
        actionErrorSource.value =
          path === tabs.writingPath
            ? { notice: 'editor-writing-close-blocked' }
            : { notice: 'editor-unpin-before-closing' }
        return false
      }
      await flush()
      if (blocked()) return false
      if (entry.value?.path === path) {
        const index = tabs.ordered.findIndex((tab) => tab.path === path)
        const others = tabs.ordered.filter((tab) => tab.path !== path)
        const next = others[Math.max(0, index - 1)] ?? others[0]
        if (next !== undefined) {
          if (!(await navigate(next.path, false))) return false
        } else {
          entry.value = null
          text.value = ''
          savedText = ''
        }
      }
      tabs.remove(path)
      actionError.value = null
      return true
    })
  }

  function closeOtherDocuments(): Promise<boolean> {
    return enqueue(async () => {
      await flush()
      if (blocked()) return false
      for (const tab of [...tabs.documents]) {
        if (tab.path !== entry.value?.path && tabs.canClose(tab.path)) tabs.remove(tab.path)
      }
      actionError.value = null
      return true
    })
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
      if (read !== version) {
        await syncFromDisk([{ path: current.path, kind: 'changed' }])
      } else {
        await captureRecovery()
      }
    }
  }

  /** Keeps the open entry's label and title in step with its store after the listings reload. */
  function refreshPlace(): void {
    const current = entry.value
    const place = current === null ? undefined : placeOf(current.path)
    if (current !== null && place !== undefined) entry.value = { ...current, ...place }
  }

  function propertyNavigationBlocked(): boolean {
    if (!navigationBusy.value) return false
    actionErrorSource.value = { notice: 'editor-wait-navigation' }
    return true
  }

  /** The version to send with a properties change, after saving the text first. */
  async function versionForPropertyChange(): Promise<string | undefined> {
    if (propertyNavigationBlocked()) return undefined
    await flush()
    if (propertyNavigationBlocked()) return undefined
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
      void captureRecovery()
    } else if (result.conflict) {
      saveState.value = 'conflict'
    } else {
      actionError.value = result.message
    }
  }

  function deferSyncWhileRecovering(path: string): boolean {
    if (!recoveryBusy.value) return false
    syncAfterRecovery = path
    return true
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
    if (deferSyncWhileRecovering(current.path)) return

    const result = await apiFor(current.kind).openEntry(current.path)
    if (entry.value?.path !== current.path) return
    if (deferSyncWhileRecovering(current.path)) return
    if (!result.ok) {
      if (result.error.code === 'not-found' || result.error.code === 'entry-not-allowed') {
        autosaver.cancel()
        saveState.value = 'missing'
        diskNotice.value = null
        missingReappeared.value = false
      } else {
        autosaver.cancel()
        saveState.value = 'conflict'
        recoveryErrorSource.value = result.error
      }
      return
    }

    const disk = result.value
    const wasMissing = saveState.value === 'missing'
    if (wasMissing) {
      missingReappeared.value = true
      return
    }
    if (saveState.value === 'conflict') return
    if (disk.text === savedText || disk.text === text.value) {
      version = disk.version
      savedText = disk.text
      await captureRecovery()
    } else if (text.value === savedText) {
      autosaver.cancel()
      revision += 1
      entry.value = { ...current, revision }
      text.value = disk.text
      savedText = disk.text
      version = disk.version
      wordCount.value = disk.wordCount
      saveState.value = 'saved'
      diskNoticeSource.value = { notice: 'editor-updated-from-disk' }
      await captureRecovery()
    } else {
      autosaver.cancel()
      saveState.value = 'conflict'
    }
    await readProperties()
  }

  /**
   * Saves an explicitly chosen recovered copy, never recreating or replacing the source file.
   * Failed writes or reloads leave the original draft and its decision state intact.
   */
  async function saveMissingAsNew(): Promise<boolean> {
    return recovery.run(async () => {
      const current = entry.value
      if (current === null || !['missing', 'conflict'].includes(saveState.value)) return false
      if (recoveryToken === undefined) {
        recoveryErrorSource.value = { notice: 'editor-snapshot-unavailable' }
        return false
      }
      autosaver.cancel()
      if (recoveredText !== text.value) recoveredPath.value = null
      if (recoveredPath.value === null) {
        const result = await plotDeviceApi.current().recovery.saveCopy(recoveryToken, text.value)
        if (!result.ok) {
          recoveryErrorSource.value = result.error
          return false
        }
        recoveredPath.value = result.value.path
        recoveredText = text.value
      }
      // Templates are recovered as notes outside the template folder.
      await entryOwner(current.kind)?.reload()
      const path = recoveredPath.value
      const place = placeOf(path)
      if (place === undefined) {
        recoveryErrorSource.value = { notice: 'editor-recovered-not-listed' }
        return false
      }
      const read = await apiFor(place.kind).openEntry(path)
      if (!read.ok) {
        recoveryErrorSource.value = read.error
        return false
      }
      if (read.value.text !== text.value) {
        recoveryErrorSource.value = { notice: 'editor-recovered-changed' }
        return false
      }
      const wasWriting = tabs.writingPath === current.path
      const pinned = tabs.writing?.pinned ?? false
      await adoptEntry(path, place, read.value)
      if (wasWriting) tabs.writeHere(path, pinned)
      diskNoticeSource.value = { notice: 'editor-recovered-saved' }
      return true
    })
  }

  /** The open file vanished and the writer doesn't want its text: closes it. */
  function discardMissing(): void {
    if (saveState.value !== 'missing' || recoveryBusy.value) return
    autosaver.cancel()
    saveState.value = 'saved'
    const path = entry.value?.path
    entry.value = null
    if (path !== undefined) tabs.remove(path)
    text.value = ''
    savedText = ''
    recoveryToken = undefined
    recovery.clear()
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
      actionErrorSource.value = result.error
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
    useReferenceStore().followMove(from, to)
    tabs.followMove(from, to)
    const current = entry.value
    if (current !== null && current.path === from && to !== from)
      entry.value = { ...current, path: to }
  }

  function edit(newText: string): void {
    if (newText === text.value) return
    text.value = newText
    if (entry.value !== null) tabs.edited(entry.value.path)
    diskNotice.value = null
    if (saveState.value === 'conflict' || saveState.value === 'missing') return
    saveState.value = newText === savedText ? 'saved' : 'unsaved'
    if (saveState.value === 'unsaved') autosaver.schedule()
  }

  async function flush(): Promise<void> {
    await autosaver.flush()
  }

  /** In a conflict: drop the writer's unsaved text and load the file as it is on disk now. */
  async function loadVersionOnDisk(): Promise<boolean> {
    return recovery.run(async () => {
      const current = entry.value
      if (current === null) return false
      autosaver.cancel()
      const read = await apiFor(current.kind).openEntry(current.path)
      if (!read.ok) {
        recoveryErrorSource.value = read.error
        if (read.error.code === 'not-found' || read.error.code === 'entry-not-allowed')
          saveState.value = 'missing'
        return false
      }
      await adoptEntry(current.path, current, read.value)
      diskNoticeSource.value = { notice: 'editor-disk-loaded' }
      return true
    })
  }

  /** Replaces only the disk body after explicit confirmation, using the version shown then. */
  async function keepMine(): Promise<void> {
    await recovery.run(async () => {
      const current = entry.value
      if (current === null || saveState.value !== 'conflict') return false
      const read = await apiFor(current.kind).openEntry(current.path)
      if (!read.ok) {
        recoveryErrorSource.value = read.error
        if (read.error.code === 'not-found' || read.error.code === 'entry-not-allowed')
          saveState.value = 'missing'
        return false
      }
      if (!window.confirm(language.t('editor-confirm-replace'))) return false
      autosaver.cancel()
      await save(read.value.version)
      if (needsRecovery()) {
        recoveryErrorSource.value = saveErrorSource.value ?? { notice: 'editor-changed-again' }
        if (saveError.value !== null) saveState.value = 'conflict'
      }
      return !needsRecovery()
    })
  }

  async function adoptEntry(
    path: string,
    place: EntryPlace,
    opened: { text: string; version: string; wordCount: number }
  ): Promise<void> {
    revision += 1
    tabs.opened(path, true)
    entry.value = { ...place, path, revision }
    text.value = opened.text
    savedText = opened.text
    version = opened.version
    wordCount.value = opened.wordCount
    saveState.value = 'saved'
    saveError.value = null
    recovery.clear()
    recoveryToken = undefined
    missingReappeared.value = false
    await captureRecovery()
    await readProperties()
  }

  /** Saves and closes the entry, back to the project overview. */
  function closeEntry(): void {
    void enqueue(async () => {
      await flush()
      if (blocked()) return false
      entry.value = null
      return true
    })
  }

  /** Saves and forgets everything, when the project closes. */
  async function close(): Promise<void> {
    await navigation
    await flush()
    if (hasStuckChanges.value) return
    pendingRename.value = null
    entry.value = null
    text.value = ''
    savedText = ''
    tabs.clear()
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
    recoveryBusy,
    recoveryError,
    recoveredPath,
    missingReappeared,
    hasStuckChanges,
    navigationBusy,
    open,
    returnToWriting,
    cycleDocument,
    closeDocument,
    closeOtherDocuments,
    waitForNavigation: async (): Promise<void> => {
      await navigation
    },
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
