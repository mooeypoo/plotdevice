import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { createJsonUiLanguageStore, createJsonUiPreferences } from './json-ui-language-store'

let fixture: SampleNovelCopy
let folder: string
beforeEach(async () => {
  fixture = await copySampleNovel()
  folder = join(fixture.root, '..', 'settings')
})
afterEach(async () => fixture.remove())

async function projectBytes(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) Object.assign(result, await projectBytes(path))
    else result[path] = (await readFile(path)).toString('base64')
  }
  return result
}

describe('interface preference persistence', () => {
  it('keeps the theme beside the language: saving one never loses the other', async () => {
    const stores = createJsonUiPreferences(folder)
    expect(await stores.theme.load()).toEqual({ ok: true, value: undefined })
    await Promise.all([stores.language.save('he'), stores.theme.save('light')])
    expect(JSON.parse(await readFile(join(folder, 'ui-preferences.json'), 'utf8'))).toEqual({
      version: 1,
      locale: 'he',
      theme: 'light'
    })
    await stores.language.save('en')
    const reopened = createJsonUiPreferences(folder)
    expect(await reopened.theme.load()).toEqual({ ok: true, value: 'light' })
    expect(await reopened.language.load()).toEqual({ ok: true, value: 'en' })
  })

  it('handles first launch, saves atomically and restores without touching any project bytes', async () => {
    const before = await projectBytes(fixture.root)
    const store = createJsonUiLanguageStore(folder)
    expect(await store.load()).toEqual({ ok: true, value: undefined })
    expect(await store.save('he')).toEqual({ ok: true, value: undefined })
    expect(await createJsonUiLanguageStore(folder).load()).toEqual({ ok: true, value: 'he' })
    expect(await readdir(folder)).toEqual(['ui-preferences.json'])
    expect(JSON.parse(await readFile(join(folder, 'ui-preferences.json'), 'utf8'))).toEqual({
      version: 1,
      locale: 'he'
    })
    await store.save('en')
    expect(await store.load()).toEqual({ ok: true, value: 'en' })
    expect(await projectBytes(fixture.root)).toEqual(before)
  })

  it.each(['{bad', 'null', '{"version":2,"locale":"he"}', '{"version":1,"locale":"ar"}'])(
    'reports invalid preferences without rewriting them: %s',
    async (text) => {
      await mkdir(folder)
      const file = join(folder, 'ui-preferences.json')
      await writeFile(file, text)
      expect(await createJsonUiLanguageStore(folder).load()).toMatchObject({
        ok: false,
        error: { code: 'ui-language-invalid' }
      })
      expect(await readFile(file, 'utf8')).toBe(text)
    }
  )

  it('distinguishes unreadable preferences from a missing preference', async () => {
    await mkdir(join(folder, 'ui-preferences.json'), { recursive: true })
    expect(await createJsonUiLanguageStore(folder).load()).toMatchObject({
      ok: false,
      error: { code: 'ui-language-read' }
    })
  })

  it('reports a write failure instead of claiming persistence', async () => {
    await writeFile(folder, 'not a directory')
    expect(await createJsonUiLanguageStore(folder).save('he')).toMatchObject({
      ok: false,
      error: { code: 'ui-language-write' }
    })
  })
})
