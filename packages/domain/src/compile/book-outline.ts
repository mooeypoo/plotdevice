import type { ProjectPath } from '@plotdevice/shared'
import { chapterNumbers, type ChapterNumbering, type Contents } from '../manuscript/index'

export type BookEntry =
  | { kind: 'part'; name: string }
  /** `number` is the chapter's number in the whole book, or `null` when the book doesn't number it. */
  | { kind: 'chapter'; file: ProjectPath; number: number | null; name: string }

/**
 * The book's parts and chapters in reading order, as every export lays them out (Milestone 22). A
 * chapter is named by its title, or its contents link text when it has none. With `chosen`, only
 * those chapters are kept, still numbered as in the whole book (chapter 7 sent alone is still
 * chapter 7), and a part is kept only when one of its chapters is. Empty parts stay in a whole book.
 */
export function bookOutline(
  contents: Contents,
  numbering: ChapterNumbering,
  titles: ReadonlyMap<ProjectPath, string>,
  chosen?: ReadonlySet<ProjectPath>,
): BookEntry[] {
  const numbers = chapterNumbers(contents, numbering)
  const keep = (file: ProjectPath) => chosen === undefined || chosen.has(file)
  const chapter = (file: ProjectPath, linkText: string): BookEntry => ({
    kind: 'chapter',
    file,
    number: numbers.get(file) ?? null,
    name: (titles.get(file) ?? linkText).trim(),
  })
  return contents.entries.flatMap((entry): BookEntry[] => {
    if (entry.kind === 'chapter') return keep(entry.file) ? [chapter(entry.file, entry.linkText)] : []
    const kept = entry.chapters.filter((c) => keep(c.file)).map((c) => chapter(c.file, c.linkText))
    return chosen !== undefined && kept.length === 0 ? [] : [{ kind: 'part', name: entry.name.trim() }, ...kept]
  })
}
