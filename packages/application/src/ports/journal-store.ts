import type { ProjectPath } from '@plotdevice/shared'
import type { Revision } from './file-store'

/** One step of a multi-file operation; each can tell from revisions alone whether it is done (ADR 0005). */
export type JournalStep =
  | { kind: 'rename'; from: ProjectPath; to: ProjectPath; revision: Revision }
  | { kind: 'write'; path: ProjectPath; before: Revision; after: Revision; text: string; hasBom: boolean }

export interface JournalEntry {
  id: string
  operation: 'rename-chapter-file'
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
