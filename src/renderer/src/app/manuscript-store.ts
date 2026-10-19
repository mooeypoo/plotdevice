import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { ApiError, ChapterDto, ManuscriptDto, PartDto } from '../../../contract/dtos'
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
    entry.value = null
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
