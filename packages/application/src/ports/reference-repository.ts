import type { ReferenceKind, ReferenceSummary } from '@plotdevice/domain'
import type { ProjectPath, Result } from '@plotdevice/shared'

/** A page with its details, for the shelf and the page view. */
export interface ReferencePage extends ReferenceSummary {
  details: string
  invalidDetails: boolean
}

/** An outline card and the files its text links to (its details included), resolved to project paths. */
export interface CardLinks {
  outline: ProjectPath
  outlineTitle: string | null
  section: string | null
  card: string
  links: ProjectPath[]
}

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
  cardLinks(root: string): Promise<CardLinks[]>
}
