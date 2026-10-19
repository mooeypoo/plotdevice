import { fileNameFromTitle, type FileName } from './file-name'
import { nameComparisonKey } from './name-comparison-key'

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
