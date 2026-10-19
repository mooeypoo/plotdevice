import { createHash } from 'node:crypto'

/** How long the app's own write is remembered; the watcher reports it well within this. */
const REMEMBER_MS = 10_000

interface Expected {
  /** The SHA-256 of the bytes written, or `null` for a file the app removed (moved away). */
  readonly hash: string | null
  readonly at: number
}

/**
 * Remembers what the app itself just wrote, moved, or renamed, so the file watcher can tell its
 * own writes from edits made in other programs (Obsidian, git, a text editor).
 */
export class OwnWrites {
  private readonly expected = new Map<string, Expected[]>()

  constructor(private readonly now: () => number = Date.now) {}

  /** Call before writing `bytes` to `osPath`. */
  expectWrite(osPath: string, bytes: Uint8Array): void {
    this.add(osPath, { hash: hashOf(bytes), at: this.now() })
  }

  /** Call before moving a file away from `osPath`. */
  expectRemoval(osPath: string): void {
    this.add(osPath, { hash: null, at: this.now() })
  }

  /** Whether the file at `osPath` now holding `bytes` is the app's own write. */
  isOwnWrite(osPath: string, bytes: Uint8Array): boolean {
    const hash = hashOf(bytes)
    return this.recent(osPath).some((entry) => entry.hash === hash)
  }

  /** Whether `osPath` disappearing is the app's own move. */
  isOwnRemoval(osPath: string): boolean {
    return this.recent(osPath).some((entry) => entry.hash === null)
  }

  private add(osPath: string, entry: Expected): void {
    this.expected.set(osPath, [...this.recent(osPath), entry])
  }

  private recent(osPath: string): Expected[] {
    const cutoff = this.now() - REMEMBER_MS
    const entries = (this.expected.get(osPath) ?? []).filter((entry) => entry.at >= cutoff)
    if (entries.length === 0) this.expected.delete(osPath)
    else this.expected.set(osPath, entries)
    return entries
  }
}

function hashOf(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** The one log every writer in the main process records into. */
export const ownWrites = new OwnWrites()
