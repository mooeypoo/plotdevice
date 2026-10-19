import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type {
  ApiError,
  ChapterDestinationDto,
  ChapterDto,
  EntryPropertiesDto,
  ManuscriptDto,
  PartDto,
  PropertyChangesDto,
  RenamePlanDto
} from '../../../contract/dtos'
import { createAutosaver } from './autosaver'
import { romanNumeral } from '../shared/roman-numeral'
import { plotDeviceApi } from './plot-device-api'

/** Where the open entry's text stands relative to the file on disk. */
export type SaveState = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'error'

/** The part or chapter open in the editor. */
export interface OpenEntry {
  readonly path: string
  readonly kind: 'part' | 'chapter'
  /** "Part One · Chapter 1", "Part One", "Not in sequence", "Unordered". */
  readonly label: string
  readonly title: string
  /** Increments when the text is replaced from disk, so the editor remounts with it. */
  readonly revision: number
}

/** Where an entry sits in the manuscript. */
interface EntryPlace {
  readonly kind: 'part' | 'chapter'
  readonly title: string
  readonly label: string
  readonly part?: PartDto
}

/** A rename waiting for the writer's answer (`settings.file_names: ask`). */
export interface PendingRename {
  readonly path: string
  readonly plan: RenamePlanDto
}

/** Autosave this long after the writer stops typing. */
export const AUTOSAVE_DELAY_MS = 800

/** The binder's data, the entry in the editor, and saving it. */
export const useManuscriptStore = defineStore('manuscript', () => {
  const manuscript = shallowRef<ManuscriptDto | null>(null)
  const loadError = ref<string | null>(null)
  const entry = ref<OpenEntry | null>(null)
  const text = ref('')
  const wordCount = ref(0)
  const saveState = ref<SaveState>('saved')
  const saveError = ref<string | null>(null)
  /** The open entry's frontmatter, as the inspector shows it. */
  const properties = shallowRef<EntryPropertiesDto | null>(null)
  const actionError = ref<string | null>(null)
  const pendingRename = shallowRef<PendingRename | null>(null)
  // The open file's version, shared by the editor and the inspector: both write the same file.
  let version = ''
  let savedText = ''
  let revision = 0

  const api = (): ReturnType<typeof plotDeviceApi.current>['manuscript'] =>
    plotDeviceApi.current().manuscript

  const places = computed(() => indexPlaces(manuscript.value))

  const currentPart = computed<PartDto | undefined>(() =>
    entry.value === null ? undefined : places.value.get(entry.value.path)?.part
  )

  async function save(overwrite = false): Promise<void> {
    const current = entry.value
    if (current === null || (saveState.value === 'conflict' && !overwrite)) return
    const sending = text.value
    if (sending === savedText && !overwrite) {
      saveState.value = 'saved'
      return
    }
    saveState.value = 'saving'
    const result = await api().saveEntryText(current.path, sending, version, overwrite)
    if (entry.value?.path !== current.path) return

    if (result.ok) {
      version = result.value.version
      savedText = sending
      updateWordCount(current.path, result.value.wordCount)
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

  async function load(): Promise<void> {
    const result = await api().getManuscript()
    if (result.ok) {
      manuscript.value = result.value
      loadError.value = null
    } else {
      loadError.value = result.error.message
    }
  }

  /** Unsaved text that saving can't fix by itself (a conflict or a failed save). */
  const hasStuckChanges = computed(
    () =>
      (saveState.value === 'conflict' || saveState.value === 'error') && text.value !== savedText
  )

  async function open(path: string): Promise<boolean> {
    await flush()
    // Switching now would silently drop the writer's unsaved text.
    if (hasStuckChanges.value) return false
    const place = places.value.get(path)
    if (place === undefined) return false
    const result = await api().openEntry(path)
    if (!result.ok) {
      loadError.value = result.error.message
      return false
    }
    revision += 1
    entry.value = { path, kind: place.kind, label: place.label, title: place.title, revision }
    text.value = result.value.text
    savedText = result.value.text
    version = result.value.version
    wordCount.value = result.value.wordCount
    saveState.value = 'saved'
    saveError.value = null
    actionError.value = null
    await readProperties(path)
    return true
  }

  async function readProperties(path: string): Promise<void> {
    const result = await api().getEntryProperties(path)
    if (entry.value?.path !== path) return
    properties.value = result.ok ? result.value.properties : null
    // Only adopt the version if the body on disk is still what the editor has.
    if (result.ok && saveState.value === 'saved') version = result.value.version
  }

  /** Re-reads the binder and keeps the open entry's label and title in step with it. */
  async function reload(): Promise<void> {
    await load()
    const current = entry.value
    const place = current === null ? undefined : places.value.get(current.path)
    if (current !== null && place !== undefined) {
      entry.value = { ...current, label: place.label, title: place.title }
    }
  }

  /**
   * Saves inspector changes. The body is saved first, so the two writes to the same file never
   * look like a conflict to each other.
   */
  async function updateProperties(changes: PropertyChangesDto): Promise<boolean> {
    const current = entry.value
    if (current === null) return false
    await flush()
    if (hasStuckChanges.value || saveState.value === 'conflict') return false
    const result = await api().updateEntryProperties(current.path, version, changes)
    if (entry.value?.path !== current.path) return false
    if (!result.ok) {
      if (result.error.code === 'changed-on-disk') saveState.value = 'conflict'
      else actionError.value = result.error.message
      return false
    }
    version = result.value.version
    properties.value = result.value.properties
    actionError.value = null
    await reload()
    if (changes.title !== undefined) await offerRename(current.path)
    return true
  }

  /** After a title change: rename the file now (`always`), or ask first (`ask`). */
  async function offerRename(path: string): Promise<void> {
    pendingRename.value = null
    const result = await api().planRename(path)
    if (!result.ok || result.value === null || entry.value?.path !== path) return
    if (result.value.policy === 'always') await renameEntry(path)
    else pendingRename.value = { path, plan: result.value }
  }

  /** Renames the file to match its title, updating links; the open entry follows it. */
  async function renameEntry(path: string): Promise<boolean> {
    pendingRename.value = null
    await flush()
    if (hasStuckChanges.value) return false
    const result = await api().renameEntry(path)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    const { skipped } = result.value
    actionError.value =
      skipped.length > 0
        ? `Renamed, but links in ${String(skipped.length)} ${skipped.length === 1 ? 'file' : 'files'} couldn’t be updated safely: ${skipped.join(', ')}.`
        : null
    await afterStructureChange(path, result.value.path)
    return true
  }

  function dismissRename(): void {
    pendingRename.value = null
  }

  /**
   * Moves a chapter to a position in a part (`part: null`: a book without parts), or out of the
   * book's order (`null`).
   */
  async function moveChapter(
    path: string,
    destination: ChapterDestinationDto | null
  ): Promise<boolean> {
    await flush()
    if (hasStuckChanges.value) return false
    const result = await api().moveChapter(path, destination)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    reportFailed(result.value.failed)
    await afterStructureChange(path, result.value.path)
    return true
  }

  /** Moves a part to a position among the numbered parts. */
  async function movePart(path: string, index: number): Promise<boolean> {
    await flush()
    if (hasStuckChanges.value) return false
    const result = await api().movePart(path, index)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    reportFailed(result.value.failed)
    await afterStructureChange(path, path)
    return true
  }

  function reportFailed(failed: readonly string[]): void {
    actionError.value =
      failed.length > 0
        ? `${String(failed.length)} ${failed.length === 1 ? 'file' : 'files'} couldn’t be renumbered and were left as they were.`
        : null
  }

  /**
   * Re-reads the binder after files were rewritten or moved. The open entry follows its file to a
   * new path, keeps its text, and picks up the file's new version.
   */
  async function afterStructureChange(from: string, to: string): Promise<void> {
    const current = entry.value
    if (current !== null && current.path === from && to !== from) {
      entry.value = { ...current, path: to }
    }
    await reload()
    if (entry.value !== null) await readProperties(entry.value.path)
  }

  /** Creates a chapter at the end of a part (`null`: a book without parts) and opens it. */
  async function createChapter(partPath: string | null, title: string): Promise<boolean> {
    await flush()
    if (hasStuckChanges.value) return false
    const result = await api().createChapter(partPath, title)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    await reload()
    return open(result.value.path)
  }

  /** Creates a part after the others. */
  async function createPart(title: string): Promise<boolean> {
    const result = await api().createPart(title)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    await reload()
    return true
  }

  /** Renumbers a part's chapters 1, 2, 3… (`null`: a book without parts). */
  async function renumberPart(partPath: string | null): Promise<boolean> {
    await flush()
    if (hasStuckChanges.value) return false
    const result = await api().renumberPart(partPath)
    if (!result.ok) {
      actionError.value = result.error.message
      return false
    }
    reportFailed(result.value.failed)
    const path = entry.value?.path
    if (path !== undefined) await afterStructureChange(path, path)
    else await reload()
    return true
  }

  function edit(newText: string): void {
    text.value = newText
    if (saveState.value === 'conflict') return
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

  async function close(): Promise<void> {
    await flush()
    pendingRename.value = null
    entry.value = null
    properties.value = null
    manuscript.value = null
    text.value = ''
  }

  function closeEntry(): void {
    void flush().then(() => {
      entry.value = null
    })
  }

  function updateWordCount(path: string, count: number): void {
    const previous = wordCount.value
    wordCount.value = count
    const current = manuscript.value
    if (current === null || previous === count) return
    manuscript.value = withWordCount(current, path, count - previous)
  }

  return {
    manuscript,
    loadError,
    entry,
    text,
    wordCount,
    saveState,
    saveError,
    properties,
    actionError,
    currentPart,
    hasStuckChanges,
    load,
    open,
    edit,
    flush,
    loadVersionOnDisk,
    keepMine,
    close,
    closeEntry,
    updateProperties,
    createChapter,
    createPart,
    renumberPart,
    moveChapter,
    movePart,
    pendingRename,
    renameEntry,
    dismissRename,
    hasEntry: (path: string) => places.value.has(path)
  }
})

function indexPlaces(manuscript: ManuscriptDto | null): Map<string, EntryPlace> {
  const places = new Map<string, EntryPlace>()
  if (manuscript === null) return places
  const chapterLabel = (prefix: string, chapter: ChapterDto): string =>
    chapter.number === undefined ? prefix : `${prefix} · Chapter ${String(chapter.number)}`

  for (const part of manuscript.parts) {
    const partLabel = `Part ${romanNumeral(part.number ?? 0)}`
    places.set(part.path, { kind: 'part', title: part.title, label: partLabel, part })
    for (const chapter of part.chapters) {
      places.set(chapter.path, {
        kind: 'chapter',
        title: chapter.title,
        label: chapterLabel(partLabel, chapter),
        part
      })
    }
  }
  for (const part of manuscript.unnumberedParts) {
    places.set(part.path, { kind: 'part', title: part.title, label: 'Not in sequence', part })
    for (const chapter of part.chapters) {
      places.set(chapter.path, {
        kind: 'chapter',
        title: chapter.title,
        label: `${part.title} · not in sequence`,
        part
      })
    }
  }
  for (const chapter of manuscript.chapters) {
    places.set(chapter.path, {
      kind: 'chapter',
      title: chapter.title,
      label: `Chapter ${String(chapter.number)}`
    })
  }
  for (const { chapter } of manuscript.unordered) {
    places.set(chapter.path, { kind: 'chapter', title: chapter.title, label: 'Unordered' })
  }
  return places
}

/** The manuscript with one entry's word count changed by `delta`, totals included. */
function withWordCount(manuscript: ManuscriptDto, path: string, delta: number): ManuscriptDto {
  const bumpChapter = (chapter: ChapterDto): ChapterDto =>
    chapter.path === path ? { ...chapter, wordCount: chapter.wordCount + delta } : chapter
  const bumpPart = (part: PartDto): PartDto => {
    const touched = part.path === path || part.chapters.some((chapter) => chapter.path === path)
    return touched
      ? { ...part, wordCount: part.wordCount + delta, chapters: part.chapters.map(bumpChapter) }
      : part
  }
  return {
    ...manuscript,
    parts: manuscript.parts.map(bumpPart),
    unnumberedParts: manuscript.unnumberedParts.map(bumpPart),
    chapters: manuscript.chapters.map(bumpChapter),
    unordered: manuscript.unordered.map((entry) => ({
      ...entry,
      chapter: bumpChapter(entry.chapter)
    })),
    wordCount: manuscript.wordCount + delta
  }
}

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
