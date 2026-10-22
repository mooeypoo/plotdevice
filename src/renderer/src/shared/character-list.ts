import type { CodexEntryDto } from '../../../contract/dtos'
import { nameKey } from './link-choices'
import type { TextComparator } from './use-chrome-presentation'

/** Unique group names, retaining the first spelling and sorting for display. */
export function characterGroupNames(
  names: readonly string[],
  compareText: TextComparator = (left, right) => left.localeCompare(right)
): string[] {
  const unique = new Map<string, string>()
  for (const name of names) {
    const trimmed = name.trim().normalize('NFC')
    const key = nameKey(trimmed)
    if (trimmed !== '' && !unique.has(key)) unique.set(key, trimmed)
  }
  return [...unique.values()].sort(compareText)
}

/** A collapsible character section; `null` identifies Ungrouped, not a reserved group name. */
export interface CharacterSection {
  readonly name: string | null
  readonly entries: readonly CodexEntryDto[]
}

/** Searches names/aliases and unions selected memberships without duplicating character files. */
export function visibleCharacters(
  entries: readonly CodexEntryDto[],
  search: string,
  filters: readonly string[]
): CodexEntryDto[] {
  const query = nameKey(search.trim())
  const selected = new Set(filters.map(nameKey))
  return entries.filter(
    (entry) =>
      entry.kind === 'character' &&
      [entry.title, ...entry.aliases].some((name) => nameKey(name).includes(query)) &&
      (selected.size === 0 || (entry.groups ?? []).some((group) => selected.has(nameKey(group))))
  )
}

/** Groups the same character references under each membership, with a separate Ungrouped section. */
export function characterSections(
  entries: readonly CodexEntryDto[],
  names: readonly string[]
): CharacterSection[] {
  const groups = names
    .map((name) => ({
      name,
      entries: entries.filter((entry) =>
        (entry.groups ?? []).some((group) => nameKey(group) === nameKey(name))
      )
    }))
    .filter((group) => group.entries.length > 0)
  const ungrouped = entries.filter((entry) => (entry.groups ?? []).length === 0)
  return [...groups, ...(ungrouped.length > 0 ? [{ name: null, entries: ungrouped }] : [])]
}
