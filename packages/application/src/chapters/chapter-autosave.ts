import type { Result } from '@plotdevice/shared'
import type { Revision } from '../ports/file-store'

/** Writes a chapter's text if the file is still at `expected`, returning the new revision. */
export type WriteChapter = (text: string, expected: Revision) => Promise<Result<Revision, 'stale' | 'write-failed'>>

/**
 * What the author is told about a chapter's text. "saved" only ever follows a confirmed write;
 * "conflict" and "failed" carry the newest text so nothing typed is lost.
 */
export type SaveStatus =
  | { kind: 'saved'; revision: Revision }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'conflict'; unsaved: string }
  | { kind: 'failed'; unsaved: string }

/** Saves one open chapter: one write at a time, newest text only, stopping on a conflict (ADR 0005). */
export interface ChapterAutosave {
  /** Queues the chapter's full text. Text still waiting is replaced, never written after newer text. */
  save(text: string): void
  status(): SaveStatus
  onStatus(listener: (status: SaveStatus) => void): () => void
  /** Text not yet confirmed on disk, or `null` when everything is saved. */
  unsavedText(): string | null
  /** Resolves once nothing is being written or waiting to be. */
  idle(): Promise<void>
  /** After a conflict is resolved: the file is now at `revision` and saving resumes from there. */
  reset(revision: Revision): void
  /** Stops saving and keeps `unsaved` until the author resolves the conflict. */
  conflict(unsaved: string): void
  /**
   * Runs `task` between writes, for other changes to the same file (a new title in the frontmatter).
   * Saving continues from the revision the task returns, or the current one if it returns `null`.
   */
  exclusive<T>(task: (revision: Revision) => Promise<{ revision: Revision | null; value: T }>): Promise<T>
}

export function createChapterAutosave(write: WriteChapter, loaded: Revision): ChapterAutosave {
  let revision = loaded
  let current: SaveStatus = { kind: 'saved', revision }
  let waiting: string | null = null
  let writing: string | null = null
  let running: Promise<void> | null = null
  // Writes and exclusive tasks take turns, so a task never runs while a write is in progress.
  let turns: Promise<unknown> = Promise.resolve()
  const listeners = new Set<(status: SaveStatus) => void>()

  const setStatus = (next: SaveStatus): void => {
    current = next
    for (const listener of listeners) listener(next)
  }

  const takeTurn = <T>(work: () => Promise<T>): Promise<T> => {
    const result = turns.then(work)
    turns = result.catch(() => undefined)
    return result
  }

  const run = async (): Promise<void> => {
    while (waiting !== null) {
      const text = waiting
      waiting = null
      writing = text
      if (current.kind !== 'saving') setStatus({ kind: 'saving' })
      // The revision moves on within the turn, so a task in the next turn always sees it.
      const result = await takeTurn(async () => {
        const written = await write(text, revision)
        if (written.ok) revision = written.value
        return written
      })
      writing = null
      if (result.ok) {
        if (waiting === null) setStatus({ kind: 'saved', revision })
      } else if (result.error === 'stale') {
        setStatus({ kind: 'conflict', unsaved: waiting ?? text })
        waiting = null
      } else if (waiting === null) {
        setStatus({ kind: 'failed', unsaved: text })
      }
    }
    running = null
  }

  return {
    save(text) {
      if (current.kind === 'conflict') {
        setStatus({ kind: 'conflict', unsaved: text })
        return
      }
      waiting = text
      if (running === null) {
        setStatus({ kind: 'unsaved' })
        running = run()
      }
    },
    status: () => current,
    onStatus(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    unsavedText() {
      if (current.kind === 'conflict' || current.kind === 'failed') return current.unsaved
      return waiting ?? writing
    },
    idle: async () => {
      while (running !== null) await running
      await turns
    },
    reset(next) {
      revision = next
      waiting = null
      setStatus({ kind: 'saved', revision })
    },
    conflict(unsaved) {
      waiting = null
      setStatus({ kind: 'conflict', unsaved })
    },
    exclusive(task) {
      return takeTurn(async () => {
        const outcome = await task(revision)
        if (outcome.revision !== null) {
          revision = outcome.revision
          if (current.kind === 'saved') setStatus({ kind: 'saved', revision })
        }
        return outcome.value
      })
    },
  }
}
