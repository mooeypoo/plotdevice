import type { ListCodex } from '../contexts/codex/application/queries/list-codex'
import type { GetChronologySettings } from '../contexts/chronology/application/queries/get-chronology-settings'
import type {
  DatedValue,
  ReadStoryDates
} from '../contexts/chronology/application/queries/read-story-dates'
import type { ListChapterReferences } from '../contexts/manuscript/application/queries/list-chapter-references'
import { nameComparisonKey } from '../shared-kernel/name-comparison-key'
import type { ProjectPath } from '../shared-kernel/project-path'

/** A chapter on the timeline, in reading order. */
export interface TimelineChapter {
  readonly path: ProjectPath
  readonly title: string
  readonly number?: number
  readonly partNumber?: number
  readonly partTitle?: string
  readonly status?: string
  readonly synopsis?: string
  readonly storyTime?: string
  readonly threads: readonly string[]
  /** Characters in its `pov` or `characters`; `pov` is true for point-of-view characters. */
  readonly characters: readonly { readonly path: ProjectPath; readonly pov: boolean }[]
  readonly date: DatedValue
}

/** A row the timeline can show: a thread, or a character. */
export interface TimelineRow {
  readonly key: string
  readonly name: string
  readonly color?: string
}

/** Everything the timeline view draws. Derived from the files; never stored. */
export interface Timeline {
  readonly calendar: 'gregorian' | 'day-count'
  /** The project's threads, then any key chapters use that novel.md doesn't define. */
  readonly threads: readonly TimelineRow[]
  /** Characters that appear in the book, by name; `key` is the file's path. */
  readonly characters: readonly TimelineRow[]
  /** The chapters in the book's reading order. */
  readonly chapters: readonly TimelineChapter[]
  /** Chapters outside the reading order (parts out of the sequence, the unordered tray). */
  readonly outside: number
}

/** Builds the timeline: chapters in reading order, with dates, threads, and characters. */
export type GetTimeline = () => Promise<Timeline>

/** Builds the `GetTimeline` query from the manuscript, chronology, and codex queries. */
export function createGetTimeline(ports: {
  readonly listChapterReferences: ListChapterReferences
  readonly readStoryDates: ReadStoryDates
  readonly getChronologySettings: GetChronologySettings
  readonly listCodex: ListCodex
}): GetTimeline {
  return async () => {
    const [all, settings, codex] = await Promise.all([
      ports.listChapterReferences(),
      ports.getChronologySettings(),
      ports.listCodex()
    ])
    const inBook = all.filter((chapter) => chapter.inBook)
    const { calendar, dates } = await ports.readStoryDates(
      inBook.map((chapter) => chapter.storyDate)
    )
    const characterTitles = new Map(
      codex.entries
        .filter((entry) => entry.kind === 'character')
        .map((entry) => [entry.path, entry.title])
    )

    const chapters = inBook.map((chapter, index): TimelineChapter => {
      const characters = new Map<ProjectPath, boolean>()
      for (const reference of chapter.references) {
        if (reference.key === 'location' || !characterTitles.has(reference.path)) continue
        characters.set(
          reference.path,
          (characters.get(reference.path) ?? false) || reference.key === 'pov'
        )
      }
      return {
        path: chapter.path,
        title: chapter.title,
        ...(chapter.number !== undefined ? { number: chapter.number } : {}),
        ...(chapter.partNumber !== undefined ? { partNumber: chapter.partNumber } : {}),
        ...(chapter.partTitle !== undefined ? { partTitle: chapter.partTitle } : {}),
        ...(chapter.status !== undefined ? { status: chapter.status } : {}),
        ...(chapter.synopsis !== undefined ? { synopsis: chapter.synopsis } : {}),
        ...(chapter.storyTime !== undefined ? { storyTime: chapter.storyTime } : {}),
        threads: chapter.threads,
        characters: [...characters].map(([path, pov]) => ({ path, pov })),
        date: dates[index] ?? { kind: 'undated' }
      }
    })

    const defined = settings.threads.map((thread) => ({
      key: thread.key,
      name: thread.name,
      ...(thread.color !== undefined ? { color: thread.color } : {})
    }))
    const known = new Set(defined.map((thread) => thread.key))
    const undefinedKeys = [...new Set(chapters.flatMap((chapter) => chapter.threads))]
      .filter((key) => !known.has(key))
      .sort()
      .map((key) => ({ key, name: key }))
    const appearing = new Set(chapters.flatMap((chapter) => chapter.characters.map((c) => c.path)))

    return {
      calendar,
      threads: [...defined, ...undefinedKeys],
      characters: [...appearing]
        .map((path) => ({ key: path, name: characterTitles.get(path) ?? path }))
        .sort((a, b) => nameComparisonKey(a.name).localeCompare(nameComparisonKey(b.name))),
      chapters,
      outside: all.length - inBook.length
    }
  }
}
