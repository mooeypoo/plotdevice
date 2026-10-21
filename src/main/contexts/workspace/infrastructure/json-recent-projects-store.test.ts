import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTempFolder, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import type { ProjectRoot } from '../domain/project-root'
import type { RecentProject } from '../domain/recent-projects'
import { createJsonRecentProjectsStore } from './json-recent-projects-store'

let settings: SampleNovelCopy

beforeEach(async () => {
  settings = await makeTempFolder()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await settings.remove()
})

const entry: RecentProject = {
  root: resolve('/novels/salt-orchard') as ProjectRoot,
  title: 'The Salt Orchard',
  lastOpenedAt: '2026-10-19T12:00:00.000Z'
}

describe('createJsonRecentProjectsStore', () => {
  it('starts empty', async () => {
    expect(await createJsonRecentProjectsStore(settings.root).load()).toEqual({
      ok: true,
      value: []
    })
  })

  it('saves and loads the list', async () => {
    const store = createJsonRecentProjectsStore(settings.root)
    await store.save([entry])
    expect(await store.load()).toEqual({ ok: true, value: [entry] })
    expect(JSON.parse(await readFile(join(settings.root, 'recent-projects.json'), 'utf8'))).toEqual(
      {
        version: 1,
        projects: [entry]
      }
    )
  })

  it('creates the settings folder if needed', async () => {
    const store = createJsonRecentProjectsStore(join(settings.root, 'not', 'yet'))
    await store.save([entry])
    expect(await store.load()).toEqual({ ok: true, value: [entry] })
  })

  it.each([
    ['broken JSON', '{ not json'],
    ['the wrong shape', JSON.stringify({ version: 1, projects: [{ root: 42 }] })],
    ['a relative root', JSON.stringify({ version: 1, projects: [{ ...entry, root: 'novels/x' }] })],
    ['an unknown version', JSON.stringify({ version: 2, projects: [] })]
  ])('reports %s and keeps the original settings untouched', async (_, contents) => {
    await writeFile(join(settings.root, 'recent-projects.json'), contents)
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await createJsonRecentProjectsStore(settings.root).load()).toMatchObject({
      ok: false,
      error: {
        code: 'recents-invalid',
        diagnostic: {
          reason: 'recents-invalid',
          path: join(settings.root, 'recent-projects.json')
        }
      }
    })
    expect(await readFile(join(settings.root, 'recent-projects.json'), 'utf8')).toBe(contents)
    expect(log).toHaveBeenCalledOnce()
  })

  it('reports read and write failures rather than presenting an empty list or success', async () => {
    await mkdir(join(settings.root, 'recent-projects.json'))
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const store = createJsonRecentProjectsStore(settings.root)
    expect(await store.load()).toMatchObject({
      ok: false,
      error: { code: 'recents-read-failed', diagnostic: { reason: 'recents-read-failed' } }
    })
    expect(await store.save([entry])).toMatchObject({
      ok: false,
      error: { code: 'recents-save-failed', diagnostic: { reason: 'recents-save-failed' } }
    })
    expect(log).toHaveBeenCalledTimes(2)
  })
})
