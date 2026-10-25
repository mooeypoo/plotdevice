import { randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { access, chmod, mkdir, open, readdir, realpath, rename, stat, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

export type AtomicWriteErrorCode = 'read-only' | 'locked' | 'io'

export class AtomicWriteError extends Error {
  readonly code: AtomicWriteErrorCode

  constructor(code: AtomicWriteErrorCode, cause: unknown) {
    super(`${code}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
    this.code = code
  }
}

export interface WriteHooks {
  /** Runs once the new bytes are durable in the temp file, just before it replaces the target. */
  beforeRename?: () => Promise<void> | void
  /** Replaceable so tests can simulate a Windows sharing violation. */
  rename?: (from: string, to: string) => Promise<void>
}

const TEMP_SUFFIX = '.plotdevice-tmp'
const RENAME_RETRY_DELAYS_MS = [10, 20, 40, 80, 160, 320]

/**
 * Writes `bytes` so the file is always either the old or the new content, never partial (ADR 0005):
 * a hidden temp file next to the real target (symlinks followed), fsync, rename, fsync the directory.
 * Keeps the file's mode, and refuses read-only files instead of replacing them.
 */
export async function writeAtomically(target: string, bytes: Uint8Array, hooks: WriteHooks = {}): Promise<void> {
  const realTarget = await realpath(target).catch(() => target)
  const existing = await stat(realTarget).catch(() => null)
  if (existing) {
    try {
      await access(realTarget, constants.W_OK)
    } catch (cause) {
      throw new AtomicWriteError('read-only', cause)
    }
  } else {
    await mkdir(dirname(realTarget), { recursive: true })
  }

  // A hidden name, so a leftover from a crash stays out of the author's way until it is cleaned up.
  const temp = join(dirname(realTarget), `.${basename(realTarget)}.${randomBytes(4).toString('hex')}${TEMP_SUFFIX}`)
  try {
    const mode = existing ? existing.mode & 0o7777 : 0o666
    const handle = await open(temp, 'wx', mode)
    try {
      await handle.writeFile(bytes)
      await handle.sync()
    } finally {
      await handle.close()
    }
    if (existing) await chmod(temp, mode) // `open` applies the umask; restore the original mode exactly
    await hooks.beforeRename?.()
    await renameWithRetry(temp, realTarget, hooks.rename ?? rename)
    await syncDirectory(dirname(realTarget))
  } catch (cause) {
    await unlink(temp).catch(() => undefined)
    throw cause instanceof AtomicWriteError ? cause : new AtomicWriteError('io', cause)
  }
}

/** Windows refuses to replace a file another program holds open (antivirus, sync clients, Obsidian). */
async function renameWithRetry(from: string, to: string, doRename: (from: string, to: string) => Promise<void>): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await doRename(from, to)
      return
    } catch (cause) {
      const code = (cause as NodeJS.ErrnoException).code
      const delay = RENAME_RETRY_DELAYS_MS[attempt]
      if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw cause
      if (delay === undefined) throw new AtomicWriteError('locked', cause)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

/** Makes the rename itself durable. Windows cannot open directories, and NTFS journals renames itself. */
async function syncDirectory(directory: string): Promise<void> {
  if (process.platform === 'win32') return
  const handle = await open(directory, 'r')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

/** Removes temp files left by a crash; only old ones, because another window may be writing right now. */
export async function removeStaleTempFiles(directory: string, minAgeMs = 60_000): Promise<string[]> {
  const removed: string[] = []
  for (const name of await readdir(directory)) {
    if (!name.startsWith('.') || !name.endsWith(TEMP_SUFFIX)) continue
    const path = join(directory, name)
    const info = await stat(path).catch(() => null)
    if (info && Date.now() - info.mtimeMs >= minAgeMs) {
      await unlink(path)
      removed.push(name)
    }
  }
  return removed
}
