import type { Brand, ProjectPath, Result } from '@plotdevice/shared'

/** A file revision: a hash of its exact bytes (ADR 0005). Same bytes, same revision. */
export type Revision = Brand<string, 'Revision'>

/** A text file as stored: decoded text, whether it had a byte-order mark, and its revision. */
export interface StoredText {
  text: string
  hasBom: boolean
  revision: Revision
}

export interface TextToStore {
  text: string
  hasBom: boolean
}

export type ReadProblem = 'missing' | 'not-utf8' | 'outside-project' | 'io'
export type WriteProblem = { code: 'stale'; diskRevision: Revision | null } | { code: 'read-only' | 'locked' | 'outside-project' | 'io' }
export type RenameProblem = 'stale' | 'missing' | 'exists' | 'outside-project' | 'io'
/** `no-trash`: this computer has no Trash the app can use; nothing was removed. */
export type RemoveProblem = 'stale' | 'missing' | 'no-trash' | 'outside-project' | 'io'

/**
 * One project's files, addressed by project paths (ADR 0005, ADR 0006). Every write states the
 * revision it expects (`null`: "must not exist yet") and is refused if the file changed meanwhile.
 * Implemented by `fs-node` on disk; a web or mobile host would implement it differently.
 */
export interface FileStore {
  read(path: ProjectPath): Promise<Result<StoredText, ReadProblem>>
  write(path: ProjectPath, content: TextToStore, expected: Revision | null): Promise<Result<Revision, WriteProblem>>
  rename(from: ProjectPath, to: ProjectPath, expected: Revision): Promise<Result<void, RenameProblem>>
  /**
   * Removes a file the author chose to delete: to the computer's Trash, or for good once they agreed to
   * that. Refused if the file changed since `expected`.
   */
  remove(path: ProjectPath, expected: Revision, how: 'trash' | 'for-good'): Promise<Result<void, RemoveProblem>>
  /** Every Markdown file in the project, skipping hidden folders. */
  listMarkdownFiles(): Promise<ProjectPath[]>
  /** Every file in one folder and its subfolders, of any type (images too), skipping hidden ones; `[]` when it isn't there. */
  listFiles(folder: string): Promise<string[]>
  /** Removes a folder that holds no files, its empty subfolders with it; a folder with anything in it stays. */
  removeEmptyFolder(folder: string): Promise<void>
  /** The revision `content` would have once written, so a journal can record it beforehand. */
  revisionOf(content: TextToStore): Revision
  /** Removes leftovers of interrupted writes (hidden temp files). Called when a project opens. */
  tidy(): Promise<void>
}
