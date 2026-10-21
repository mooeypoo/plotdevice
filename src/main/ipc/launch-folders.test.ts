import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiResult, FolderChoiceDto } from '../../contract/dtos'
import { createLaunchFolders } from './launch-folders'

let folder: string
const inspected: string[] = []
const inspect = (path: string): Promise<ApiResult<FolderChoiceDto | null>> => {
  inspected.push(path)
  return Promise.resolve({ ok: true, value: { root: path, name: 'book', isProject: true } })
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
    expect(await launch.take()).toEqual({
      ok: true,
      value: { root: folder, name: 'book', isProject: true }
    })
    expect(await launch.take()).toEqual({ ok: true, value: null })
  })

  it('retains inspection failures for invalid or inaccessible startup paths, once', async () => {
    const failure = {
      ok: false,
      error: {
        code: 'folder-missing',
        message: 'Missing',
        diagnostic: { reason: 'workspace-folder-missing', path: '/gone' }
      }
    } as const
    const inspectFailed = vi.fn().mockResolvedValue(failure)
    const launch = createLaunchFolders(inspectFailed)
    launch.remember('/gone')
    expect(await launch.take()).toEqual(failure)
    expect(await launch.take()).toEqual({ ok: true, value: null })
    expect(inspectFailed).toHaveBeenCalledExactlyOnceWith('/gone')
  })

  it('sends a later launch’s folder to the running window', async () => {
    const sent: unknown[] = []
    const window = {
      isDestroyed: () => false,
      webContents: { send: (...args: unknown[]) => sent.push(args) }
    } as unknown as BrowserWindow
    await createLaunchFolders(inspect).send(window, folder)
    expect(sent).toEqual([
      [
        'workspace:open-folder',
        { ok: true, value: { root: folder, name: 'book', isProject: true } }
      ]
    ])
  })

  it('sends errors as well as successes, suppressing superseded inspections and destroyed windows', async () => {
    const sent: unknown[] = []
    let destroyed = false
    const window = {
      isDestroyed: () => destroyed,
      webContents: { send: (...args: unknown[]) => sent.push(args) }
    } as unknown as BrowserWindow
    let finish: ((result: ApiResult<FolderChoiceDto | null>) => void) | undefined
    const failure = {
      ok: false,
      error: { code: 'folder-inspection-failed', message: 'EACCES' }
    } as const
    const inspectNext = vi
      .fn<(path: string) => Promise<ApiResult<FolderChoiceDto | null>>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValue(failure)
    const launch = createLaunchFolders(inspectNext)
    const older = launch.send(window, '/older')
    await launch.send(window, '/newer')
    if (finish === undefined) throw new Error('Missing inspection')
    finish({ ok: true, value: { root: '/older', name: 'Older', isProject: true } })
    await older
    expect(sent).toEqual([['workspace:open-folder', failure]])
    destroyed = true
    await launch.send(window, '/gone')
    expect(sent).toHaveLength(1)
  })
})
