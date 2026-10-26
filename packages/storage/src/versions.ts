import type { BackupStore, ProjectFolders, VersionRepository } from '@plotdevice/application'
import { err, ok } from '@plotdevice/shared'
import { backupKeyOf } from './backing-up'

/**
 * Earlier versions from the backups. `folders` must be the plain folders, not `withBackups`: a restore
 * keeps what it replaces explicitly, every time, rather than when a backup happens to be due.
 */
export function createVersionRepository({
  folders,
  backups,
  now,
}: {
  folders: ProjectFolders
  backups: BackupStore
  now: () => number
}): VersionRepository {
  return {
    async list(root, file) {
      const store = folders.open(root)
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      const entries = await backups.list(await backupKeyOf(root, store), file)
      return ok({ revision: current.value.revision, versions: entries.map((entry) => entry.at) })
    },

    async read(root, file, at) {
      const store = folders.open(root)
      const version = await backups.read(await backupKeyOf(root, store), file, at)
      return version.ok ? ok(version.value.text) : version
    },

    async restore(root, file, at, expected) {
      const store = folders.open(root)
      const project = await backupKeyOf(root, store)
      const version = await backups.read(project, file, at)
      if (!version.ok) return version
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      if (current.value.revision !== expected) return err('stale')
      const kept = await backups.save(project, file, { text: current.value.text, hasBom: current.value.hasBom }, now())
      if (!kept.ok) return err('write-failed') // never replace a file whose current text couldn't be kept
      const written = await store.write(file, version.value, expected)
      if (!written.ok) return err(written.error.code === 'stale' ? 'stale' : 'write-failed')
      return ok(undefined)
    },
  }
}
