import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempFolder, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import type { ProjectRoot } from '../domain/project-root'
import type { RecentProject } from '../domain/recent-projects'
import { createJsonRecentProjectsStore } from './json-recent-projects-store'

let settings: SampleNovelCopy

beforeEach(async () => {
  settings = await makeTempFolder()
})

afterEach(async () => {
  await settings.remove()
})

const entry: RecentProject = {
  root: resolve('/novels/preservers') as ProjectRoot,
  title: 'The Preservers',
  lastOpenedAt: '2026-10-19T12:00:00.000Z'
}

describe('createJsonRecentProjectsStore', () => {
  it('starts empty', async () => {
    expect(await createJsonRecentProjectsStore(settings.root).load()).toEqual([])
  })

  it('saves and loads the list', async () => {
    const store = createJsonRecentProjectsStore(settings.root)
    await store.save([entry])
    expect(await store.load()).toEqual([entry])
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
    expect(await store.load()).toEqual([entry])
  })

  it.each([
    ['broken JSON', '{ not json'],
    ['the wrong shape', JSON.stringify({ version: 1, projects: [{ root: 42 }] })],
    ['a relative root', JSON.stringify({ version: 1, projects: [{ ...entry, root: 'novels/x' }] })],
    ['an unknown version', JSON.stringify({ version: 2, projects: [] })]
  ])('starts empty after %s, keeping the bad file aside', async (_, contents) => {
    await writeFile(join(settings.root, 'recent-projects.json'), contents)

    expect(await createJsonRecentProjectsStore(settings.root).load()).toEqual([])
    expect(await readFile(join(settings.root, 'recent-projects.corrupt.json'), 'utf8')).toBe(
      contents
    )
  })
})
