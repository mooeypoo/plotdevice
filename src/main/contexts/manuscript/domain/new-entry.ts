import { fileNameFromTitle, type FileName } from '../../../shared-kernel/file-name'
import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'

/** The title a new chapter gets when the writer leaves the name empty. */
export const UNTITLED_CHAPTER = 'Untitled chapter'
/** The title a new part gets when the writer leaves the name empty. */
export const UNTITLED_PART = 'Untitled part'

/**
 * A file name for a new entry that no other project file shares, so links to it are never
 * ambiguous (see "Titles and file names" in docs/file-format.md): the title, then the title with
 * its type, then a number.
 */
export function uniqueFileName(
  title: string,
  typeLabel: string,
  takenStems: ReadonlySet<string>
): FileName {
  const base = fileNameFromTitle(title, '').replace(/\.$/u, '')
  const taken = (stem: string): boolean => takenStems.has(nameComparisonKey(stem))
  if (!taken(base)) return fileNameFromTitle(base)
  const typed = `${base} (${typeLabel})`
  if (!taken(typed)) return fileNameFromTitle(typed)
  for (let number = 2; ; number += 1) {
    const numbered = `${base} (${String(number)})`
    if (!taken(numbered)) return fileNameFromTitle(numbered)
  }
}

/** The text of a new chapter file: only the keys it needs, and an empty body. */
export function newChapterText(title: string, partLink: string | undefined, order: number): string {
  return [
    '---',
    'type: chapter',
    `title: ${JSON.stringify(title)}`,
    ...(partLink === undefined ? [] : [`part: ${JSON.stringify(partLink)}`]),
    `order: ${String(order)}`,
    '---',
    ''
  ].join('\n')
}

/** The text of a new part file. */
export function newPartText(title: string, order: number): string {
  return [
    '---',
    'type: part',
    `title: ${JSON.stringify(title)}`,
    `order: ${String(order)}`,
    '---',
    ''
  ].join('\n')
}
