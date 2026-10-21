import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type {
  ApiError,
  ChapterDestinationDto,
  ChapterDto,
  ChosenFixDto,
  EntryPropertiesDto,
  ManuscriptDto,
  PartDto,
  PropertyChangesDto
} from '../../../contract/dtos'
import { romanNumeral } from '../shared/roman-numeral'
import { useEditorStore } from './editor-store'
import { registerEntryOwner } from './entry-owners'
import type { EntryPlace } from './entry-place'
import { plotDeviceApi } from './plot-device-api'
import { useReferenceStore } from './reference-store'

/** Where a part or chapter sits in the manuscript, with its part's listing. */
interface ManuscriptPlace {
  readonly place: EntryPlace
  readonly part?: PartDto
}

/**
 * The binder's data: parts and chapters in order, the open part's or chapter's properties, and
 * changes to the book's structure. The text in the editor belongs to the editor store.
 */
export const useManuscriptStore = defineStore('manuscript', () => {
  const manuscript = shallowRef<ManuscriptDto | null>(null)
  const loadError = ref<string | null>(null)
  /** The open part's or chapter's frontmatter, as the inspector shows it. */
  const properties = shallowRef<EntryPropertiesDto | null>(null)

  const api = (): ReturnType<typeof plotDeviceApi.current>['manuscript'] =>
    plotDeviceApi.current().manuscript

  const places = computed(() => indexPlaces(manuscript.value))

  const currentPart = computed<PartDto | undefined>(() => {
    const open = useEditorStore().entry
    return open === null ? undefined : places.value.get(open.path)?.part
  })

  async function load(): Promise<void> {
    const result = await api().getManuscript()
    if (result.ok) {
      manuscript.value = result.value
      loadError.value = null
      void useReferenceStore().reload()
    } else {
      loadError.value = result.error.message
    }
  }

  /** Re-reads the binder and keeps the open entry's label and title in step with it. */
  async function reload(): Promise<void> {
    await load()
    useEditorStore().refreshPlace()
  }

  /** Reads a part's or chapter's properties; returns the file version they came from. */
  async function readProperties(path: string): Promise<string | undefined> {
    const result = await api().getEntryProperties(path)
    if (useEditorStore().entry?.path !== path) return undefined
    properties.value = result.ok ? result.value.properties : null
    if (!result.ok) useEditorStore().reportActionError(result.error)
    return result.ok ? result.value.version : undefined
  }

  /**
   * Saves inspector changes. The body is saved first, so the two writes to the same file never
   * look like a conflict to each other.
   */
  async function updateProperties(changes: PropertyChangesDto): Promise<boolean> {
    const editor = useEditorStore()
    const current = editor.entry
    if (current === null) return false
    const version = await editor.versionForPropertyChange()
    if (version === undefined) return false
    const result = await api().updateEntryProperties(current.path, version, changes)
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
   * Saves a chapter's synopsis from the Overview. The chapter open in the editor goes through
   * its version as the inspector does; any other is read first, so an outside edit isn't lost.
   */
  async function updateSynopsis(path: string, synopsis: string): Promise<boolean> {
    const editor = useEditorStore()
    if (editor.entry?.path === path) return updateProperties({ synopsis })
    const read = await api().getEntryProperties(path)
    if (!read.ok) {
      editor.reportActionError(read.error)
      return false
    }
    if ((read.value.properties.synopsis ?? '').trim() === synopsis.trim()) return true
    const result = await api().updateEntryProperties(path, read.value.version, { synopsis })
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    await reload()
    return true
  }

  /** Runs a structural change after saving the open text; refuses if that text is stuck. */
  async function restructure(
    change: () => Promise<
      | { ok: true; path?: string; from?: string; failed: readonly string[] }
      | { ok: false; error: ApiError }
    >
  ): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await change()
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    const { failed } = result
    editor.reportStructureNotice(
      failed.length > 0 ? { notice: 'structure-renumber-failed', count: failed.length } : null
    )
    if (result.from !== undefined && result.path !== undefined) {
      editor.followMove(result.from, result.path)
    }
    await reload()
    // The open entry's file may have been rewritten; pick up its new version.
    await editor.readProperties()
    return true
  }

  /**
   * Moves a chapter to a position in a part (`part: null`: a book without parts), or out of the
   * book's order (`null`).
   */
  function moveChapter(path: string, destination: ChapterDestinationDto | null): Promise<boolean> {
    return restructure(async () => {
      const result = await api().moveChapter(path, destination)
      return result.ok
        ? { ok: true, from: path, path: result.value.path, failed: result.value.failed }
        : { ok: false, error: result.error }
    })
  }

  /** Moves a part to a position among the numbered parts. */
  function movePart(path: string, index: number): Promise<boolean> {
    return restructure(async () => {
      const result = await api().movePart(path, index)
      return result.ok
        ? { ok: true, failed: result.value.failed }
        : { ok: false, error: result.error }
    })
  }

  /** Renumbers a part's chapters 1, 2, 3… (`null`: a book without parts). */
  function renumberPart(partPath: string | null): Promise<boolean> {
    return restructure(async () => {
      const result = await api().renumberPart(partPath)
      return result.ok
        ? { ok: true, failed: result.value.failed }
        : { ok: false, error: result.error }
    })
  }

  /** Creates a chapter at the end of a part (`null`: a book without parts) and opens it. */
  async function createChapter(partPath: string | null, title: string): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.hasStuckChanges) return false
    const result = await api().createChapter(partPath, title)
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    await reload()
    return editor.open(result.value.path, { keep: true })
  }

  /** Creates a part after the others. */
  async function createPart(title: string): Promise<boolean> {
    const result = await api().createPart(title)
    if (!result.ok) {
      useEditorStore().reportActionError(result.error)
      return false
    }
    await reload()
    return true
  }

  /**
   * Applies a warning's fix to one file, after saving the open text. If that file is open, the
   * editor picks up its new text like any other change on disk.
   */
  async function fixWarning(path: string, fix: ChosenFixDto): Promise<boolean> {
    const editor = useEditorStore()
    await editor.flush()
    if (editor.entry?.path === path && editor.hasStuckChanges) return false
    const result = await api().fixWarning(path, fix)
    if (!result.ok) {
      editor.reportActionError(result.error)
      return false
    }
    await reload()
    if (editor.entry?.path === path) await editor.syncFromDisk([{ path, kind: 'changed' }])
    return true
  }

  /** Keeps the binder's word counts current as the open part or chapter is saved. */
  function addWords(path: string, delta: number): void {
    const current = manuscript.value
    if (current !== null && delta !== 0) manuscript.value = withWordCount(current, path, delta)
  }

  function close(): void {
    manuscript.value = null
    properties.value = null
  }

  return {
    manuscript,
    loadError,
    properties,
    currentPart,
    load,
    reload,
    readProperties,
    updateProperties,
    updateSynopsis,
    moveChapter,
    movePart,
    renumberPart,
    fixWarning,
    createChapter,
    createPart,
    addWords,
    close,
    placeOf: (path: string): EntryPlace | undefined => places.value.get(path)?.place,
    hasEntry: (path: string) => places.value.has(path)
  }
})

registerEntryOwner(['part', 'chapter'], () => useManuscriptStore())

function indexPlaces(manuscript: ManuscriptDto | null): Map<string, ManuscriptPlace> {
  const places = new Map<string, ManuscriptPlace>()
  if (manuscript === null) return places
  const chapterLabel = (prefix: string, chapter: ChapterDto): string =>
    chapter.number === undefined ? prefix : `${prefix} · Chapter ${String(chapter.number)}`
  const chapterPlace = (chapter: ChapterDto, label: string, part?: PartDto): ManuscriptPlace => ({
    place: {
      kind: 'chapter',
      title: chapter.title,
      label,
      ...(part !== undefined ? { partPath: part.path } : {})
    },
    ...(part !== undefined ? { part } : {})
  })

  for (const part of manuscript.parts) {
    const partLabel = `Part ${romanNumeral(part.number ?? 0)}`
    places.set(part.path, { place: { kind: 'part', title: part.title, label: partLabel }, part })
    for (const chapter of part.chapters) {
      places.set(chapter.path, chapterPlace(chapter, chapterLabel(partLabel, chapter), part))
    }
  }
  for (const part of manuscript.unnumberedParts) {
    places.set(part.path, {
      place: { kind: 'part', title: part.title, label: 'Not in sequence' },
      part
    })
    for (const chapter of part.chapters) {
      places.set(chapter.path, chapterPlace(chapter, `${part.title} · not in sequence`, part))
    }
  }
  for (const chapter of manuscript.chapters) {
    places.set(chapter.path, chapterPlace(chapter, `Chapter ${String(chapter.number)}`))
  }
  for (const { chapter } of manuscript.unordered) {
    places.set(chapter.path, chapterPlace(chapter, 'Unordered'))
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
