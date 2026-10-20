import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FolderChoiceDto } from '../../contract/dtos'
import { createLaunchFolders } from './launch-folders'

let folder: string
const inspected: string[] = []
const inspect = (path: string): Promise<FolderChoiceDto> => {
  inspected.push(path)
  return Promise.resolve({ root: path, name: 'book', isProject: true })
}

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'plotdevice-launch-'))
  inspected.length = 0
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

describe('createLaunchFolders', () => {
  it('hands the startup folder to the window once, inspected like a chosen folder', async () => {
    const launch = createLaunchFolders(inspect)
    launch.remember(folder)
    expect(await launch.take()).toEqual({ root: folder, name: 'book', isProject: true })
    expect(await launch.take()).toBeNull()
  })

  it('ignores paths that aren’t folders', async () => {
    const launch = createLaunchFolders(inspect)
    const file = join(folder, 'novel.md')
    await writeFile(file, '')
    launch.remember(file)
    expect(await launch.take()).toBeNull()
    launch.remember(join(folder, 'missing'))
    expect(await launch.take()).toBeNull()
    expect(inspected).toEqual([])
  })

  it('sends a later launch’s folder to the running window', async () => {
    const sent: unknown[] = []
    const window = {
      isDestroyed: () => false,
      webContents: { send: (...args: unknown[]) => sent.push(args) }
    } as unknown as BrowserWindow
    await createLaunchFolders(inspect).send(window, folder)
    expect(sent).toEqual([
      ['workspace:open-folder', { root: folder, name: 'book', isProject: true }]
    ])
  })
})
