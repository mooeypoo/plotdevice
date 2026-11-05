import { collisionKey, RELATIONSHIP_HEADINGS, stemOf, type ProjectPath } from '@plotdevice/shared'
import { markdownFileFor } from '../manuscript/index'
import { DEFAULT_KINDS, type PageKind } from '../project/kinds'

/**
 * What a page is about: its kind, which is its folder (ADR 0011). `characters`, `places` and `notes`
 * by default; a book can list its own kinds in `project.md`.
 */
export type ReferenceKind = string

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
  /** The frontmatter can't be read and has a `tags:` line: tags the app can't see, for tidying (Milestone 12). */
  unreadableTags: boolean
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

/** The kind a file belongs to: its first folder, when that folder is one of the book's kinds. */
export function kindOfFile(file: ProjectPath, kinds: readonly PageKind[] = DEFAULT_KINDS): ReferenceKind | null {
  const folder = file.split('/')[0]
  return file.includes('/') && kinds.some((kind) => kind.folder === folder) ? (folder ?? null) : null
}

/** Folders that hold the book itself, never pages. */
const BOOK_FOLDERS = new Set(['manuscript', 'outlines'])

/**
 * The folder of a page: any file in a top-level folder other than the book's own (`manuscript`,
 * `outlines`). Whether that folder is one of the book's kinds, or "Not sorted yet", the book's kinds
 * decide (ADR 0011, decision 5).
 */
export function pageFolderOf(file: ProjectPath): string | null {
  const slash = file.indexOf('/')
  if (slash <= 0) return null
  const folder = file.slice(0, slash)
  return folder.startsWith('.') || BOOK_FOLDERS.has(folder.toLowerCase()) ? null : folder
}

/** The file for a new page, from its title: a character "Ilka Varga" → `characters/ilka-varga.md`. */
export function referenceFileFor(kind: ReferenceKind, title: string, existing: readonly ProjectPath[]): ProjectPath {
  return markdownFileFor(kind, title, existing, 'page')
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

/** A link as written: a path resolved from its file, or an Obsidian `[[name]]`. */
export type LinkTarget = { kind: 'path'; target: string } | { kind: 'wiki'; name: string }

/**
 * Why a link leads nowhere in the app, or `null` when it leads to a file (or isn't to a Markdown
 * file, which the app doesn't know about). A path must match exactly, as the app follows it; a
 * `[[name]]` must match exactly one file.
 */
export function unresolvedLink(link: LinkTarget, files: readonly ProjectPath[]): 'missing' | 'ambiguous' | null {
  if (link.kind === 'path') return !/\.md$/i.test(link.target) || files.some((file) => file === link.target) ? null : 'missing'
  if (resolveWikiLink(link.name, files) !== null) return null
  const key = collisionKey(link.name.replace(/\.md$/i, ''))
  const named = link.name.includes('/') ? [] : files.filter((file) => collisionKey(stemOf(file)) === key)
  return named.length > 1 ? 'ambiguous' : 'missing'
}

/** A new relationships section is named in the project's language, or in English when the app has no name in it. */
export function relationshipHeadingFor(language: string): string {
  const base = language.toLowerCase().split('-')[0] ?? ''
  return RELATIONSHIP_HEADINGS[base] ?? RELATIONSHIP_HEADINGS.en ?? 'Relationships'
}
