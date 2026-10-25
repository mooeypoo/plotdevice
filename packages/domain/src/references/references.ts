import { collisionKey, stemOf, type ProjectPath } from '@plotdevice/shared'
import { markdownFileFor } from '../manuscript/index'

/** What a reference page is about. The folder decides it (DOMAIN_AND_FILE_FORMAT.md). */
export type ReferenceKind = 'character' | 'place' | 'note'

export const REFERENCE_FOLDERS: Readonly<Record<ReferenceKind, string>> = { character: 'characters', place: 'places', note: 'notes' }

/** A page as lists, search and the shelf show it. */
export interface ReferenceSummary {
  file: ProjectPath
  kind: ReferenceKind
  title: string
  /** Other names, for search. */
  aka: string[]
  description: string | null
}

export function kindOfFile(file: ProjectPath): ReferenceKind | null {
  const folder = file.split('/')[0]
  const entry = Object.entries(REFERENCE_FOLDERS).find(([, name]) => name === folder)
  return entry ? (entry[0] as ReferenceKind) : null
}

/** The file for a new page, from its title: a character "Ilka Varga" → `characters/ilka-varga.md`. */
export function referenceFileFor(kind: ReferenceKind, title: string, existing: readonly ProjectPath[]): ProjectPath {
  return markdownFileFor(REFERENCE_FOLDERS[kind], title, existing, kind)
}

/** Lowercase, without accents or niqqud: "Noël" and "noel", "יַעֵל" and "יעל" match. */
const searchable = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * The references matching `query`, best first: an exact name, a name that starts with it, a word in a
 * name that starts with it, a name containing it, then a description containing it. Names include the
 * other names. Ties keep alphabetical order.
 */
export function searchReferences(references: readonly ReferenceSummary[], query: string): ReferenceSummary[] {
  const wanted = searchable(query.trim())
  if (wanted === '') return []
  const rank = (reference: ReferenceSummary): number => {
    const names = [reference.title, ...reference.aka].map(searchable)
    if (names.some((name) => name === wanted)) return 0
    if (names.some((name) => name.startsWith(wanted))) return 1
    if (names.some((name) => name.split(/[\s\-–—'’]+/).some((word) => word.startsWith(wanted)))) return 2
    if (names.some((name) => name.includes(wanted))) return 3
    return reference.description && searchable(reference.description).includes(wanted) ? 4 : Number.POSITIVE_INFINITY
  }
  return references
    .map((reference) => ({ reference, rank: rank(reference) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank || a.reference.title.localeCompare(b.reference.title))
    .map(({ reference }) => reference)
}

/**
 * The file an Obsidian `[[name]]` link means: by path when it has one, otherwise the only file with
 * that name. Two files sharing the name make it ambiguous, and it resolves to nothing (no guessing).
 */
export function resolveWikiLink(name: string, files: readonly ProjectPath[]): ProjectPath | null {
  const key = collisionKey(name.replace(/\.md$/i, ''))
  if (name.includes('/')) return files.find((file) => collisionKey(file.replace(/\.md$/i, '')) === key) ?? null
  const matches = files.filter((file) => collisionKey(stemOf(file)) === key)
  return matches.length === 1 ? (matches[0] ?? null) : null
}
