import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { createJsonWindowStateStore } from './json-window-state-store'

let fixture: SampleNovelCopy
let settingsFolder: string

const state = {
  version: 1 as const,
  bounds: { x: -1200, y: 25, width: 1200, height: 800 },
  maximized: true
}

beforeEach(async () => {
  fixture = await copySampleNovel()
  settingsFolder = join(fixture.root, '..', 'settings')
  await mkdir(settingsFolder)
})

afterEach(async () => {
  await fixture.remove()
})

describe('createJsonWindowStateStore', () => {
  it('treats missing settings as the first launch', async () => {
    expect(await createJsonWindowStateStore(settingsFolder).load()).toEqual({
      ok: true,
      value: undefined
    })
  })

  it('round trips settings outside the novel, leaving no atomic-write temporary files', async () => {
    const novelBefore = await readdir(fixture.root)
    const store = createJsonWindowStateStore(settingsFolder)
    expect(await store.save(state)).toEqual({ ok: true, value: undefined })
    expect(await store.load()).toEqual({ ok: true, value: state })
    expect(await readFile(join(settingsFolder, 'window-state.json'), 'utf8')).toBe(
      `${JSON.stringify(state, null, 2)}\n`
    )
    expect(await readdir(settingsFolder)).toEqual(['window-state.json'])
    expect(await readdir(fixture.root)).toEqual(novelBefore)
  })

  it('creates a missing settings directory and replaces earlier state', async () => {
    const store = createJsonWindowStateStore(join(settingsFolder, 'not', 'yet'))
    await store.save(state)
    const next = { ...state, maximized: false }
    expect(await store.save(next)).toEqual({ ok: true, value: undefined })
    expect(await store.load()).toEqual({ ok: true, value: next })
  })

  it.each(['{ bad json', 'null', JSON.stringify({ ...state, version: 2 })])(
    'reports invalid settings without altering them: %s',
    async (contents) => {
      const path = join(settingsFolder, 'window-state.json')
      await writeFile(path, contents)
      expect(await createJsonWindowStateStore(settingsFolder).load()).toMatchObject({
        ok: false,
        error: { code: 'invalid-window-state' }
      })
      expect(await readFile(path, 'utf8')).toBe(contents)
    }
  )

  it('reports read errors other than a missing file', async () => {
    await mkdir(join(settingsFolder, 'window-state.json'))
    expect(await createJsonWindowStateStore(settingsFolder).load()).toMatchObject({
      ok: false,
      error: { code: 'read-window-state' }
    })
  })

  it('reports failed writes instead of pretending settings were saved', async () => {
    const path = join(settingsFolder, 'not-a-folder')
    await writeFile(path, 'occupied')
    expect(await createJsonWindowStateStore(path).save(state)).toMatchObject({
      ok: false,
      error: { code: 'write-window-state' }
    })
  })
})
