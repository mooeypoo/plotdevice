import type { DomainError } from '../../../../shared-kernel/domain-error'
import type { Result } from '../../../../shared-kernel/result'
import type { NovelFileProblem } from '../project'
import type { ProjectRoot } from '../project-root'

/** What reading a folder's novel.md found. */
export type NovelFileReading =
  | { readonly kind: 'missing' }
  | { readonly kind: 'read'; readonly frontmatter: unknown }
  | { readonly kind: 'unreadable'; readonly problem: NovelFileProblem }

/** Why novel.md could not be created. */
export type CreateNovelFileError = DomainError<'already-exists' | 'write-failed'>

/** Reads and creates the novel.md that marks a project folder. */
export interface NovelFileStore {
  read(root: ProjectRoot): Promise<NovelFileReading>
  /** Writes a new novel.md atomically. Never replaces an existing one. */
  create(root: ProjectRoot, text: string): Promise<Result<void, CreateNovelFileError>>
  /**
   * Sets one top-level text key of an existing novel.md, changing only that key's characters
   * (ADR 0004) and writing atomically; never writes a file it can't edit safely.
   */
  setKey(root: ProjectRoot, key: string, value: string): Promise<Result<void, DomainError>>
}
