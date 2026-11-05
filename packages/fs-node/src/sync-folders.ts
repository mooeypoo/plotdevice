import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

/** A folder a sync app keeps online, offered by name when choosing where backups go (Milestone 20). */
export interface SyncFolder {
  name: string
  path: string
}

const isFolder = (path: string): Promise<boolean> =>
  stat(path).then(
    (found) => found.isDirectory(),
    () => false,
  )

/** On a Mac, sync apps keep their folders in ~/Library/CloudStorage, one per account ("GoogleDrive-ines@…"). */
async function cloudStorage(home: string, prefix: string): Promise<string[]> {
  const folder = join(home, 'Library', 'CloudStorage')
  const names = await readdir(folder).catch(() => [] as string[])
  return names.filter((name) => name === prefix || name.startsWith(`${prefix}-`)).map((name) => join(folder, name))
}

/**
 * The sync folders that exist on this computer, at the places their apps use by default. Only whether a
 * folder exists is checked: nothing is read from the sync apps or their settings.
 */
export async function findSyncFolders(home: string, platform: NodeJS.Platform, env: NodeJS.ProcessEnv = {}): Promise<SyncFolder[]> {
  const candidates: SyncFolder[] = [
    { name: 'Google Drive', path: join(home, 'Google Drive') },
    { name: 'Google Drive', path: join(home, 'My Drive') },
    { name: 'Dropbox', path: join(home, 'Dropbox') },
    { name: 'OneDrive', path: env.OneDrive ?? join(home, 'OneDrive') },
  ]
  if (platform === 'darwin') {
    for (const path of await cloudStorage(home, 'GoogleDrive')) candidates.push({ name: 'Google Drive', path: join(path, 'My Drive') })
    for (const path of await cloudStorage(home, 'Dropbox')) candidates.push({ name: 'Dropbox', path })
    for (const path of await cloudStorage(home, 'OneDrive')) candidates.push({ name: 'OneDrive', path })
    candidates.push({ name: 'iCloud Drive', path: join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs') })
  }
  const found: SyncFolder[] = []
  for (const candidate of candidates)
    if (!found.some((f) => f.path === candidate.path) && (await isFolder(candidate.path))) found.push(candidate)
  return found
}
