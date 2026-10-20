import type { ChapterDto, ManuscriptDto, PartDto } from '../../../../contract/dtos'
import { romanNumeral } from '../../shared/roman-numeral'

/** What the Overview shows: `null` means any. `''` as status means "no status". */
export interface OverviewFilters {
  readonly status: string | null
  readonly pov: string | null
  readonly thread: string | null
}

export const NO_FILTERS: OverviewFilters = { status: null, pov: null, thread: null }

/** A group of chapters under a heading: a part, a book without parts, or the unordered tray. */
export interface OverviewSection {
  readonly key: string
  /** "Part I", "Not in sequence", "Unordered"… */
  readonly label: string
  readonly part?: PartDto
  readonly chapters: readonly ChapterDto[]
  /** How many chapters the section has before filtering. */
  readonly total: number
  /** The part's words (its own text and chapters), or the section's chapters' words. */
  readonly wordCount: number
}

const nameKey = (name: string): string => name.normalize('NFC').toLowerCase()

function matches(chapter: ChapterDto, filters: OverviewFilters): boolean {
  if (filters.status !== null && (chapter.status ?? '') !== filters.status) return false
  if (
    filters.pov !== null &&
    !chapter.pov.some((pov) => nameKey(pov) === nameKey(filters.pov ?? ''))
  ) {
    return false
  }
  return filters.thread === null || chapter.threads.includes(filters.thread)
}

/** The book in reading order, grouped by part, with each group's chapters filtered. */
export function overviewSections(
  manuscript: ManuscriptDto,
  filters: OverviewFilters
): OverviewSection[] {
  const section = (
    key: string,
    label: string,
    chapters: readonly ChapterDto[],
    part?: PartDto
  ): OverviewSection => ({
    key,
    label,
    ...(part !== undefined ? { part } : {}),
    chapters: chapters.filter((chapter) => matches(chapter, filters)),
    total: chapters.length,
    wordCount: part?.wordCount ?? chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
  })
  return [
    ...manuscript.parts.map((part) =>
      section(part.path, `Part ${romanNumeral(part.number ?? 0)}`, part.chapters, part)
    ),
    ...manuscript.unnumberedParts.map((part) =>
      section(part.path, 'Not in sequence', part.chapters, part)
    ),
    ...(manuscript.chapters.length > 0 ? [section('book', 'Chapters', manuscript.chapters)] : []),
    ...(manuscript.unordered.length > 0
      ? [
          section(
            'unordered',
            'Unordered',
            manuscript.unordered.map((item) => item.chapter)
          )
        ]
      : [])
  ]
}

/** The values the filters can choose from, as they appear in the book. */
export function filterChoices(manuscript: ManuscriptDto): {
  readonly statuses: readonly string[]
  readonly povs: readonly string[]
  readonly threads: readonly string[]
} {
  const chapters = [
    ...[...manuscript.parts, ...manuscript.unnumberedParts].flatMap((part) => part.chapters),
    ...manuscript.chapters,
    ...manuscript.unordered.map((item) => item.chapter)
  ]
  const unique = (values: readonly string[]): string[] => {
    const seen = new Map<string, string>()
    for (const value of values) if (!seen.has(nameKey(value))) seen.set(nameKey(value), value)
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }
  return {
    statuses: unique(
      chapters.flatMap((chapter) => (chapter.status === undefined ? [] : [chapter.status]))
    ),
    povs: unique(chapters.flatMap((chapter) => chapter.pov)),
    threads: unique(chapters.flatMap((chapter) => chapter.threads))
  }
}
