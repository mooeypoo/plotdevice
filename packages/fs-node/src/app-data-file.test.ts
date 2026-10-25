import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createPreferencesFileStore } from './app-data-file'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'plotdevice-prefs-'))
  dirs.push(dir)
  return dir
}

describe('preferences file store', () => {
  it('reads nothing on first run', async () => {
    expect(await createPreferencesFileStore(await tempDir()).read()).toBeNull()
  })

  it('writes and reads back, creating the folder if needed', async () => {
    const dir = join(await tempDir(), 'not-yet-created')
    const store = createPreferencesFileStore(dir)
    expect(await store.write('{"theme":"dark","locale":"he"}\n')).toEqual({ ok: true, value: undefined })
    expect(await store.read()).toBe('{"theme":"dark","locale":"he"}\n')
    expect(await readdir(dir)).toEqual(['preferences.json'])
  })

  it('sets an unreadable file aside under a dated name instead of deleting it', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'preferences.json'), '{{ broken')
    const store = createPreferencesFileStore(dir)
    await store.setAside()
    expect(await store.read()).toBeNull()
    const kept = (await readdir(dir)).filter((name) => name.startsWith('preferences.unreadable-'))
    expect(kept).toHaveLength(1)
    expect(await readFile(join(dir, kept[0] ?? ''), 'utf8')).toBe('{{ broken')
  })

  it.runIf(process.platform !== 'win32' && process.getuid?.() !== 0)('reports a read-only settings file as a failure, not a crash', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'preferences.json'), '{}')
    await chmod(join(dir, 'preferences.json'), 0o444)
    expect(await createPreferencesFileStore(dir).write('{"theme":"dark"}')).toEqual({ ok: false, error: 'read-only' })
  })
})
