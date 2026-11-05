import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findSyncFolders } from './sync-folders'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('finding sync folders', () => {
  it('offers only the ones that exist, by name', async () => {
    const home = await mkdtemp(join(tmpdir(), 'plotdevice-home-'))
    dirs.push(home)
    expect(await findSyncFolders(home, 'linux')).toEqual([])
    await mkdir(join(home, 'Dropbox'))
    await mkdir(join(home, 'Google Drive'))
    expect(await findSyncFolders(home, 'linux')).toEqual([
      { name: 'Google Drive', path: join(home, 'Google Drive') },
      { name: 'Dropbox', path: join(home, 'Dropbox') },
    ])
  })

  it('on a Mac, finds each account’s folder under CloudStorage, and iCloud Drive', async () => {
    const home = await mkdtemp(join(tmpdir(), 'plotdevice-home-'))
    dirs.push(home)
    await mkdir(join(home, 'Library', 'CloudStorage', 'GoogleDrive-ines@example.com', 'My Drive'), { recursive: true })
    await mkdir(join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs'), { recursive: true })
    expect((await findSyncFolders(home, 'darwin')).map((folder) => folder.name)).toEqual(['Google Drive', 'iCloud Drive'])
  })
})
