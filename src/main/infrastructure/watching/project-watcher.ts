import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { watch, type FSWatcher } from 'chokidar'
import type { ProjectPath } from '../../shared-kernel/project-path'
import { toProjectPath } from '../fs/to-project-path'
import { ownWrites as defaultOwnWrites, type OwnWrites } from './own-writes'

/** A markdown file another program added, changed, or removed. */
export interface ProjectChange {
  readonly path: ProjectPath
  readonly kind: 'changed' | 'removed'
}

/** A running watch on one project folder. */
export interface ProjectWatcher {
  /** Resolves once the initial scan is done and changes are being reported. */
  readonly ready: Promise<void>
  close(): Promise<void>
}

interface WatchOptions {
  /** Changes arriving within this many milliseconds are reported together. */
  readonly batchMs?: number
  readonly ownWrites?: OwnWrites
}

/**
 * Watches a project's markdown files and reports changes made by other programs, in batches.
 * The app's own writes are left out. Dot-folders (`.git`, `.obsidian`) and other files are ignored.
 */
export function watchProject(
  rootOsPath: string,
  onChanges: (changes: readonly ProjectChange[]) => void,
  options: WatchOptions = {}
): ProjectWatcher {
  const batchMs = options.batchMs ?? 150
  const own = options.ownWrites ?? defaultOwnWrites
  const pending = new Map<string, 'changed' | 'removed'>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let closed = false

  const watcher: FSWatcher = watch(rootOsPath, {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: (osPath, stats) =>
      (osPath !== rootOsPath && basename(osPath).startsWith('.')) ||
      (stats?.isFile() === true && !osPath.toLowerCase().endsWith('.md'))
  })

  const flush = async (): Promise<void> => {
    timer = undefined
    const batch = [...pending]
    pending.clear()
    const changes: ProjectChange[] = []
    for (const [osPath, kind] of batch) {
      const path = toProjectPath(rootOsPath, osPath)
      if (!path.ok || !osPath.toLowerCase().endsWith('.md')) continue
      if (kind === 'removed') {
        if (!own.isOwnRemoval(osPath)) changes.push({ path: path.value, kind })
        continue
      }
      const bytes = await readFile(osPath).catch(() => undefined)
      if (bytes === undefined) {
        // Gone again before it could be read: report the removal.
        if (!own.isOwnRemoval(osPath)) changes.push({ path: path.value, kind: 'removed' })
      } else if (!own.isOwnWrite(osPath, bytes)) {
        changes.push({ path: path.value, kind })
      }
    }
    if (changes.length > 0 && !closed) onChanges(changes)
  }

  const note = (kind: 'changed' | 'removed') => (osPath: string) => {
    pending.set(osPath, kind)
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => void flush(), batchMs)
  }
  watcher.on('add', note('changed'))
  watcher.on('change', note('changed'))
  watcher.on('unlink', note('removed'))

  const ready = new Promise<void>((resolve) => {
    watcher.once('ready', () => {
      resolve()
    })
  })

  return {
    ready,
    async close() {
      closed = true
      if (timer !== undefined) clearTimeout(timer)
      await watcher.close()
    }
  }
}
