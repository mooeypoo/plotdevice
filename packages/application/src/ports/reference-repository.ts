import type { ReferenceKind, ReferenceSummary } from '@plotdevice/domain'
import type { ProjectPath, Result } from '@plotdevice/shared'

/** A page with its details, for the shelf and the page view. */
export interface ReferencePage extends ReferenceSummary {
  details: string
}

/** An outline card and the files its text links to (its details included), resolved to project paths. */
export interface CardLinks {
  outline: ProjectPath
  outlineTitle: string | null
  section: string | null
  card: string
  links: ProjectPath[]
}

/** A file and the files it links to, resolved to project paths. */
export interface FileLinks {
  file: ProjectPath
  links: ProjectPath[]
}

/** Adds, changes or removes one relationship on a page (ADR 0009); `index` counts its relationships. */
export type RelationshipChange =
  { kind: 'add'; text: string } | { kind: 'change'; index: number; text: string } | { kind: 'remove'; index: number }

/**
 * Characters, places and notes as Markdown pages (Milestone 5), and the links outline cards make.
 * Implemented by `storage`; pages are read leniently and never rewritten to fit.
 */
export interface ReferenceRepository {
  listReferences(root: string): Promise<ReferenceSummary[]>
  readReference(root: string, file: ProjectPath): Promise<Result<ReferencePage, 'missing' | 'unreadable'>>
  createReference(
    root: string,
    kind: ReferenceKind,
    title: string,
  ): Promise<Result<ReferenceSummary, 'empty-text' | 'multiline-text' | 'write-failed'>>
  /** Sets the page's `title`, keeping everything else; refused if the file changed since it was read. */
  renameReference(
    root: string,
    file: ProjectPath,
    title: string,
  ): Promise<Result<void, 'empty-text' | 'multiline-text' | 'missing' | 'unreadable' | 'stale' | 'write-failed'>>
  /**
   * Sets the page's tags (Milestone 12), rewriting only its `tags:` line; refused if the file changed
   * since it was read, or if its frontmatter can't be read (`unreadable`), which is never repaired.
   */
  setTags(
    root: string,
    file: ProjectPath,
    tags: readonly string[],
  ): Promise<Result<void, 'missing' | 'unreadable' | 'stale' | 'write-failed'>>
  /**
   * Changes the page's relationships section, touching only that bullet; refused if the file changed
   * since it was read. A new section is named in `language`, the project's.
   */
  editRelationship(
    root: string,
    file: ProjectPath,
    change: RelationshipChange,
    language: string,
  ): Promise<Result<void, 'empty-text' | 'multiline-text' | 'missing' | 'unreadable' | 'stale' | 'write-failed'>>
  cardLinks(root: string): Promise<CardLinks[]>
  /** The links in each of `files` (chapters, say); files without links are left out. */
  fileLinks(root: string, files: readonly ProjectPath[]): Promise<FileLinks[]>
}
