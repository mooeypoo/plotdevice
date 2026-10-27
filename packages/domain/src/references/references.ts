import { collisionKey, RELATIONSHIP_HEADINGS, stemOf, type ProjectPath } from '@plotdevice/shared'
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
  /** The author's tags, each once (Milestone 12). */
  tags: string[]
  description: string | null
  /** The frontmatter couldn't be read: the page is shown, its tags are unknown, and it is never rewritten to fix it. */
  invalidDetails: boolean
  /** Its relationships section, in order (ADR 0009). */
  relationships: Relationship[]
  /** Every file the page links to, relationships included, for "Linked from" on those files. */
  links: ProjectPath[]
}

/** "Sister of [Bea](bea.md)": the bullet's words as written, and the files its links point at. */
export interface Relationship {
  text: string
  links: ProjectPath[]
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

/** A new relationships section is named in the project's language, or in English when the app has no name in it. */
export function relationshipHeadingFor(language: string): string {
  const base = language.toLowerCase().split('-')[0] ?? ''
  return RELATIONSHIP_HEADINGS[base] ?? RELATIONSHIP_HEADINGS.en ?? 'Relationships'
}
