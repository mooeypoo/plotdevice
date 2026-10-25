import type { BackupStore, FileStore, ProjectFolders } from '@plotdevice/application'
import { backupsToKeep, isBackupDue } from '@plotdevice/domain'
import { readFrontmatter } from '@plotdevice/markdown'
import type { ProjectPath } from '@plotdevice/shared'
import { PROJECT_FILE } from './read-project'

export interface BackupOptions {
  backups: BackupStore
  now: () => number
}

/**
 * Project folders whose files are backed up just before the app overwrites them (Milestone 6): before
 * the first change in a session, then at most every ten minutes per file. Every write in the app goes
 * through a file store, so nothing can skip this. A failed backup never blocks the author's save.
 */
export function withBackups(folders: ProjectFolders, { backups, now }: BackupOptions): ProjectFolders {
  const lastBackup = new Map<string, number>()
  const projectKeys = new Map<string, Promise<string>>()

  const projectKey = (root: string, store: FileStore): Promise<string> => {
    let key = projectKeys.get(root)
    if (!key) {
      key = backupKeyOf(root, store)
      projectKeys.set(root, key)
    }
    return key
  }

  async function backUp(root: string, store: FileStore, path: ProjectPath, expected: string): Promise<void> {
    const at = now()
    const remembered = `${root}\u0000${path}`
    if (!isBackupDue(lastBackup.get(remembered) ?? null, at)) return
    const current = await store.read(path)
    // Only the version the write is about to replace; if it differs, the write is refused anyway.
    if (!current.ok || current.value.revision !== expected) return
    const project = await projectKey(root, store)
    const saved = await backups.save(project, path, { text: current.value.text, hasBom: current.value.hasBom }, at)
    if (!saved.ok) return
    lastBackup.set(remembered, at)
    const entries = await backups.list(project, path)
    const keep = backupsToKeep(
      entries.map((entry) => entry.at),
      at,
    )
    const old = entries.filter((entry) => !keep.has(entry.at)).map((entry) => entry.at)
    if (old.length > 0) await backups.remove(project, path, old)
  }

  return {
    create: (location, name, subfolders) => folders.create(location, name, subfolders),
    open(root) {
      const store = folders.open(root)
      return {
        ...store,
        async write(path, content, expected) {
          if (expected !== null) await backUp(root, store, path, expected)
          return store.write(path, content, expected)
        },
      }
    },
  }
}

/** Backups are kept per project id, so they follow a project folder that moves. */
export async function backupKeyOf(root: string, store: FileStore): Promise<string> {
  const read = await store.read(PROJECT_FILE as ProjectPath)
  const details = read.ok ? readFrontmatter(read.value.text) : null
  return details?.ok && typeof details.value.id === 'string' ? details.value.id : `folder-${root.replace(/[^\p{L}\p{N}]+/gu, '-')}`
}
