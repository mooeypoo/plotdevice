import type { ProjectPath } from '@plotdevice/shared'
import { createBackupStore, createProjectFolders } from '@plotdevice/fs-node'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { withBackups } from '../src/index'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const FROST = 'manuscript/frost.md' as ProjectPath
const MINUTE = 60_000
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function setup() {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-backups-'))
  dirs.push(base)
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  const appData = join(base, 'app-data')
  let clock = Date.UTC(2026, 9, 25, 18, 0, 0)
  const backups = createBackupStore(appData)
  const folders = withBackups(createProjectFolders(), { backups, now: () => clock })
  const store = folders.open(root)
  /** Writes `text` over the file, the way the app saves. */
  const save = async (path: ProjectPath, text: string, hasBom = false) => {
    const current = await store.read(path)
    if (!current.ok) throw new Error(current.error)
    const written = await store.write(path, { text, hasBom }, current.value.revision)
    if (!written.ok) throw new Error(written.error.code)
  }
  const advance = (ms: number) => (clock += ms)
  // The fixture's project id: backups are kept under it, not under the folder's name.
  const folder = join(appData, 'backups', 'prj-7d2k9q', 'manuscript', 'frost.md')
  return { root, store, save, advance, backups, folder }
}

describe('backups before the app changes a file', () => {
  it('keeps the file exactly as it was, before the first change', async () => {
    const { root, save, backups, folder } = await setup()
    const original = await readFile(join(root, FROST))
    await save(FROST, 'A new first line.\n')
    const [backup] = await backups.list('prj-7d2k9q', FROST)
    expect(backup).toBeDefined()
    expect(await readFile(join(folder, (await readdir(folder))[0] ?? ''))).toEqual(original)
  })

  it('backs up at most every ten minutes while the author keeps editing', async () => {
    const { save, advance, backups } = await setup()
    await save(FROST, 'one\n')
    advance(3 * MINUTE)
    await save(FROST, 'two\n')
    advance(6 * MINUTE)
    await save(FROST, 'three\n')
    expect(await backups.list('prj-7d2k9q', FROST)).toHaveLength(1)
    advance(2 * MINUTE)
    await save(FROST, 'four\n')
    const entries = await backups.list('prj-7d2k9q', FROST)
    expect(entries).toHaveLength(2)
    const newest = await backups.read('prj-7d2k9q', FROST, entries[0]?.at ?? 0)
    expect(newest.ok && newest.value.text).toBe('three\n')
  })

  it('keeps a byte-order mark and Windows line endings byte for byte', async () => {
    const { root, save, folder } = await setup()
    const original = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('---\r\ntitle: Frost\r\n---\r\nיעל.\r\n')])
    await writeFile(join(root, FROST), original)
    await save(FROST, 'changed\n', true)
    expect(new Uint8Array(await readFile(join(folder, (await readdir(folder))[0] ?? '')))).toEqual(original)
  })

  it('backs up nothing for a new file, or for a write that is refused', async () => {
    const { root, store, backups } = await setup()
    await store.write('manuscript/new.md' as ProjectPath, { text: 'new\n', hasBom: false }, null)
    expect(await backups.list('prj-7d2k9q', 'manuscript/new.md' as ProjectPath)).toEqual([])
    await writeFile(join(root, FROST), 'changed elsewhere\n')
    const refused = await store.write(FROST, { text: 'stale\n', hasBom: false }, 'not-the-revision' as never)
    expect(refused.ok).toBe(false)
    expect(await backups.list('prj-7d2k9q', FROST)).toEqual([])
  })

  it('prunes old backups by the retention rules as new ones are taken', async () => {
    const { save, advance, backups } = await setup()
    const day = 24 * 60 * MINUTE
    for (let i = 0; i < 5; i++) {
      await save(FROST, `day ${i}, morning\n`)
      advance(12 * 60 * MINUTE)
      await save(FROST, `day ${i}, evening\n`)
      advance(day - 12 * 60 * MINUTE)
    }
    // Ten backups over five days: older days keep only their newest; the last 24 hours keep all.
    const entries = await backups.list('prj-7d2k9q', FROST)
    expect(entries.length).toBeLessThan(10)
    expect(entries.length).toBeGreaterThanOrEqual(5)
  })
})
