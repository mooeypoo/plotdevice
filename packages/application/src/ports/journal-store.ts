import type { ProjectPath } from '@plotdevice/shared'
import type { Revision } from './file-store'

/** One step of a multi-file operation; each can tell from revisions alone whether it is done (ADR 0005). */
export type JournalStep =
  | { kind: 'rename'; from: ProjectPath; to: ProjectPath; revision: Revision }
  /** `before: null`: a file that doesn't exist yet, such as one a restored backup brings back. */
  | { kind: 'write'; path: ProjectPath; before: Revision | null; after: Revision; text: string; hasBom: boolean }

export interface JournalEntry {
  id: string
  operation: 'rename-chapter-file' | 'rename-folder' | 'undo-rename-folder' | 'restore-backup'
  steps: JournalStep[]
}

/**
 * Recovery journals for multi-file operations, kept outside the project in app data (ADR 0005).
 * Saving an entry is the commit point: from then on, recovery finishes the operation.
 */
export interface JournalStore {
  save(projectId: string, entry: JournalEntry): Promise<void>
  list(projectId: string): Promise<JournalEntry[]>
  remove(projectId: string, entryId: string): Promise<void>
}
