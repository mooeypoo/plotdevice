import writeFileAtomic from 'write-file-atomic'
import { ownWrites } from '../watching/own-writes'

/**
 * Writes through a temp file and a rename, so a crash never leaves a half-written file
 * (AGENTS.md, "Never damage the user's files"). The existing file's permissions are kept, and the
 * file watcher is told this write is the app's own.
 */
export async function writeFileAtomically(
  osPath: string,
  data: string | Uint8Array
): Promise<void> {
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data)
  // Recorded first: the watcher may report the file before the write call returns.
  ownWrites.expectWrite(osPath, bytes)
  await writeFileAtomic(osPath, bytes)
}

/** Writes UTF-8 text atomically. */
export async function writeTextFileAtomically(osPath: string, text: string): Promise<void> {
  await writeFileAtomically(osPath, text)
}
