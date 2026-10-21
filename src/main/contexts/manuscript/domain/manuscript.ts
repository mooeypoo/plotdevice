import type { LinkIndex } from '../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import type { Chapter } from './chapter'
import type { Part } from './part'

/** Why a chapter isn't placed in the book (see "Order" in docs/file-format.md). */
export type UnorderedReason =
  'missing-order' | 'no-part' | 'part-not-a-link' | 'part-not-found' | 'part-ambiguous'

/** A chapter in its place. `number` is its position in a numbered part, or in a book without parts. */
export interface PlacedChapter {
  readonly chapter: Chapter
  readonly number?: number
  /** Another chapter in the same part has the same `order`. */
  readonly duplicateOrder: boolean
}

/** A part with its chapters in order. `number` is absent for parts outside the sequence. */
export interface PartSection {
  readonly part: Part
  readonly number?: number
  readonly chapters: readonly PlacedChapter[]
  readonly wordCount: number
}

/** A chapter the book can't place, and why. */
export interface UnorderedChapter {
  readonly chapter: Chapter
  readonly reason: UnorderedReason
}

/** Something about the structure the writer should know. Files are never changed because of it. */
export type ManuscriptWarning = (
  | {
      readonly code: 'duplicate-chapter-order' | 'duplicate-part-order'
      readonly order: number
      readonly titles: readonly string[]
    }
  | { readonly code: 'part-without-order'; readonly titles: readonly string[] }
  | {
      readonly code: 'ambiguous-link'
      readonly title: string
      readonly link: string
      readonly location: { readonly kind: 'body' } | { readonly kind: 'key'; readonly key: string }
      readonly choices: readonly ProjectPath[]
    }
  | {
      readonly code: 'unusable-value'
      readonly title: string
      readonly reason: 'unquoted-link' | 'not-link' | 'not-integer'
      readonly key: string
      readonly value: string
    }
) & {
  readonly paths: readonly ProjectPath[]
  /** A change the writer can ask for in one click; the file is never changed without asking. */
  readonly fix?: WarningFix
}

/** What a warning's one-click fix does. */
export type WarningFix =
  /** Write each link with this ambiguous name with the chosen file's folder. */
  | { readonly kind: 'path-form'; readonly name: string; readonly choices: readonly ProjectPath[] }
  /** Put the unquoted links of this key in quotes. */
  | { readonly kind: 'quote'; readonly key: string }

/** The book's structure, derived from frontmatter alone (ADR 0002). */
export interface Manuscript {
  /** Numbered parts, in order. */
  readonly parts: readonly PartSection[]
  /** Parts without an `order`: outside the sequence, unnumbered, sorted by title. */
  readonly unnumberedParts: readonly PartSection[]
  /** In a project without part files: the chapters, in order. */
  readonly chapters: readonly PlacedChapter[]
  readonly unordered: readonly UnorderedChapter[]
  readonly warnings: readonly ManuscriptWarning[]
  readonly wordCount: number
}

/** Arranges parts and chapters by their `part` and `order` keys. Folders and file names play no part. */
export function arrangeManuscript(
  parts: readonly Part[],
  chapters: readonly Chapter[],
  links: LinkIndex
): Manuscript {
  const warnings: ManuscriptWarning[] = []
  const unordered: UnorderedChapter[] = []
  const partPaths = new Set<string>(parts.map((part) => part.path))
  const chaptersByPart = new Map<string, Chapter[]>()
  const looseChapters: Chapter[] = []

  for (const chapter of chapters) {
    const placement = placeChapter(chapter, parts.length > 0, partPaths, links)
    if (placement.kind === 'unordered') {
      unordered.push({ chapter, reason: placement.reason })
    } else if (placement.kind === 'loose') {
      looseChapters.push(chapter)
    } else {
      chaptersByPart.set(placement.partPath, [
        ...(chaptersByPart.get(placement.partPath) ?? []),
        chapter
      ])
    }
  }

  const numbered = parts.filter((part) => part.order !== undefined).sort(byOrderThenTitle)
  const unnumbered = parts.filter((part) => part.order === undefined).sort(byTitleThenPath)

  for (const group of duplicateOrderGroups(numbered)) {
    warnings.push({
      code: 'duplicate-part-order',
      order: duplicateOrder(group),
      titles: group.map((part) => part.title),
      paths: group.map((part) => part.path)
    })
  }
  if (unnumbered.length > 0) {
    warnings.push({
      code: 'part-without-order',
      titles: unnumbered.map((part) => part.title),
      paths: unnumbered.map((part) => part.path)
    })
  }

  const section = (part: Part, number: number | undefined): PartSection => {
    const placed = placeInOrder(chaptersByPart.get(part.path) ?? [], number !== undefined, warnings)
    return {
      part,
      ...(number !== undefined ? { number } : {}),
      chapters: placed,
      wordCount: part.wordCount + sumWords(placed.map((entry) => entry.chapter))
    }
  }

  const partSections = numbered.map((part, index) => section(part, index + 1))
  const unnumberedSections = unnumbered.map((part) => section(part, undefined))
  const placedLoose = placeInOrder(looseChapters, true, warnings)
  unordered.sort((a, b) => byTitleThenPath(a.chapter, b.chapter))

  return {
    parts: partSections,
    unnumberedParts: unnumberedSections,
    chapters: placedLoose,
    unordered,
    warnings,
    wordCount: sumWords(parts) + sumWords(chapters)
  }
}

type Placement =
  | { readonly kind: 'in-part'; readonly partPath: string }
  | { readonly kind: 'loose' }
  | { readonly kind: 'unordered'; readonly reason: UnorderedReason }

function placeChapter(
  chapter: Chapter,
  projectHasParts: boolean,
  partPaths: ReadonlySet<string>,
  links: LinkIndex
): Placement {
  const { part } = chapter
  if (part.kind === 'missing') {
    if (projectHasParts) return { kind: 'unordered', reason: 'no-part' }
    return chapter.order === undefined
      ? { kind: 'unordered', reason: 'missing-order' }
      : { kind: 'loose' }
  }
  if (part.kind === 'invalid') return { kind: 'unordered', reason: 'part-not-a-link' }

  const resolution = links.resolve(part.link, 'part')
  if (resolution.kind === 'ambiguous') return { kind: 'unordered', reason: 'part-ambiguous' }
  if (resolution.kind === 'unresolved' || !partPaths.has(resolution.path)) {
    return { kind: 'unordered', reason: 'part-not-found' }
  }
  if (chapter.order === undefined) return { kind: 'unordered', reason: 'missing-order' }
  return { kind: 'in-part', partPath: resolution.path }
}

function placeInOrder(
  chapters: readonly Chapter[],
  numbered: boolean,
  warnings: ManuscriptWarning[]
): PlacedChapter[] {
  const sorted = [...chapters].sort(byOrderThenTitle)
  const duplicates = new Set<string>()
  for (const group of duplicateOrderGroups(sorted)) {
    for (const chapter of group) duplicates.add(chapter.path)
    warnings.push({
      code: 'duplicate-chapter-order',
      order: duplicateOrder(group),
      titles: group.map((chapter) => chapter.title),
      paths: group.map((chapter) => chapter.path)
    })
  }
  return sorted.map((chapter, index) => ({
    chapter,
    ...(numbered ? { number: index + 1 } : {}),
    duplicateOrder: duplicates.has(chapter.path)
  }))
}

interface Ordered {
  readonly path: ProjectPath
  readonly title: string
  readonly order?: number
}

function duplicateOrderGroups<T extends Ordered>(sorted: readonly T[]): T[][] {
  const groups = new Map<number, T[]>()
  for (const entry of sorted) {
    if (entry.order === undefined) continue
    groups.set(entry.order, [...(groups.get(entry.order) ?? []), entry])
  }
  return [...groups.values()].filter((group) => group.length > 1)
}

function byOrderThenTitle(a: Ordered, b: Ordered): number {
  return (a.order ?? 0) - (b.order ?? 0) || byTitleThenPath(a, b)
}

function byTitleThenPath(a: Ordered, b: Ordered): number {
  return compare(a.title, b.title) || compare(a.path, b.path)
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function duplicateOrder(entries: readonly Ordered[]): number {
  const order = entries[0]?.order
  if (order === undefined) throw new Error('Duplicate order group must have an order')
  return order
}

function sumWords(entries: readonly { readonly wordCount: number }[]): number {
  return entries.reduce((total, entry) => total + entry.wordCount, 0)
}
