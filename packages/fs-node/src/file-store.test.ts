import type { Revision } from '@plotdevice/application'
import type { ProjectPath } from '@plotdevice/shared'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createFileStore } from './file-store'
import { createJournalStore } from './journal-store'
import { createProjectFolders } from './project-folders'
import { randomIdGenerator } from './random-id'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'plotdevice-store-'))
  dirs.push(dir)
  return dir
}
const p = (path: string) => path as ProjectPath
const text = (value: string) => ({ text: value, hasBom: false })
const isPosix = process.platform !== 'win32'

describe('FileStore: reading', () => {
  it('reads text, its revision, and whether it had a byte-order mark', async () => {
    const root = await tempDir()
    await mkdir(join(root, 'manuscript'))
    await writeFile(join(root, 'manuscript/frost.md'), '﻿Frost\n')
    const store = createFileStore(root)
    const read = await store.read(p('manuscript/frost.md'))
    expect(read).toMatchObject({ ok: true, value: { text: 'Frost\n', hasBom: true } })
    if (read.ok) expect(read.value.revision).toBe(store.revisionOf({ text: 'Frost\n', hasBom: true }))
  })

  it('reports a missing file and refuses text that is not UTF-8', async () => {
    const root = await tempDir()
    await writeFile(join(root, 'bad.md'), Buffer.from([0x2d, 0x20, 0xff, 0xfe, 0x0a]))
    const store = createFileStore(root)
    expect(await store.read(p('nope.md'))).toEqual({ ok: false, error: 'missing' })
    expect(await store.read(p('bad.md'))).toEqual({ ok: false, error: 'not-utf8' })
  })
})

describe('FileStore: writing', () => {
  it('creates a file only when it does not exist yet, making folders as needed', async () => {
    const root = await tempDir()
    const store = createFileStore(root)
    const first = await store.write(p('manuscript/new.md'), text('A'), null)
    expect(first).toEqual({ ok: true, value: store.revisionOf(text('A')) })
    expect(await store.write(p('manuscript/new.md'), text('B'), null)).toMatchObject({ ok: false, error: { code: 'stale' } })
    expect(await readFile(join(root, 'manuscript/new.md'), 'utf8')).toBe('A')
  })

  it('refuses a stale write and leaves the newer file alone', async () => {
    const root = await tempDir()
    const store = createFileStore(root)
    const created = await store.write(p('a.md'), text('mine'), null)
    if (!created.ok) throw new Error('setup')
    await writeFile(join(root, 'a.md'), 'edited in Obsidian')
    expect(await store.write(p('a.md'), text('stale'), created.value)).toMatchObject({ ok: false, error: { code: 'stale' } })
    expect(await readFile(join(root, 'a.md'), 'utf8')).toBe('edited in Obsidian')
  })

  it('catches an external edit that lands while the new bytes are being written', async () => {
    const root = await tempDir()
    const store = createFileStore(root, { beforeRename: () => writeFile(join(root, 'a.md'), 'saved elsewhere a moment ago') })
    const created = await createFileStore(root).write(p('a.md'), text('v1'), null)
    if (!created.ok) throw new Error('setup')
    expect(await store.write(p('a.md'), text('v2'), created.value)).toMatchObject({ ok: false, error: { code: 'stale' } })
    expect(await readFile(join(root, 'a.md'), 'utf8')).toBe('saved elsewhere a moment ago')
  })

  it('lets only one of two racing writes with the same expected revision win', async () => {
    const root = await tempDir()
    const store = createFileStore(root)
    const created = await store.write(p('a.md'), text('v1'), null)
    if (!created.ok) throw new Error('setup')
    const results = await Promise.all([
      store.write(p('a.md'), text('first'), created.value),
      store.write(p('a.md'), text('second'), created.value),
    ])
    expect(results.map((r) => r.ok)).toEqual([true, false])
  })

  it('writes the byte-order mark back when the file had one', async () => {
    const root = await tempDir()
    const store = createFileStore(root)
    await store.write(p('bom.md'), { text: 'x', hasBom: true }, null)
    expect([...(await readFile(join(root, 'bom.md'))).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })

  it.runIf(isPosix)('refuses to read or write through a symlink that leaves the project', async () => {
    const root = await tempDir()
    const outside = await tempDir()
    await writeFile(join(outside, 'secret.md'), 'not yours')
    await symlink(join(outside, 'secret.md'), join(root, 'innocent.md'))
    const store = createFileStore(root)
    expect(await store.read(p('innocent.md'))).toEqual({ ok: false, error: 'outside-project' })
    expect(await store.write(p('innocent.md'), text('x'), 'anything' as Revision)).toMatchObject({
      ok: false,
      error: { code: 'outside-project' },
    })
    expect(await readFile(join(outside, 'secret.md'), 'utf8')).toBe('not yours')
  })
})

describe('FileStore: renaming', () => {
  it('renames a file when its revision matches', async () => {
    const root = await tempDir()
    const store = createFileStore(root)
    const created = await store.write(p('manuscript/the-crossing.md'), text('x'), null)
    if (!created.ok) throw new Error('setup')
    expect(await store.rename(p('manuscript/the-crossing.md'), p('manuscript/crossing.md'), created.value)).toEqual({
      ok: true,
      value: undefined,
    })
    expect(await readdir(join(root, 'manuscript'))).toEqual(['crossing.md'])
  })

  it('refuses to overwrite another file, a stale source, or a missing one', async () => {
    const root = await tempDir()
    const store = createFileStore(root)
    const a = await store.write(p('a.md'), text('a'), null)
    await store.write(p('b.md'), text('b'), null)
    if (!a.ok) throw new Error('setup')
    expect(await store.rename(p('a.md'), p('b.md'), a.value)).toEqual({ ok: false, error: 'exists' })
    expect(await store.rename(p('a.md'), p('c.md'), store.revisionOf(text('other')))).toEqual({ ok: false, error: 'stale' })
    expect(await store.rename(p('z.md'), p('c.md'), a.value)).toEqual({ ok: false, error: 'missing' })
  })

  it('renames when only the case changes (one file on case-insensitive disks)', async () => {
    const root = await tempDir()
    const store = createFileStore(root)
    const created = await store.write(p('frost.md'), text('x'), null)
    if (!created.ok) throw new Error('setup')
    expect(await store.rename(p('frost.md'), p('Frost.md'), created.value)).toEqual({ ok: true, value: undefined })
    expect(await readdir(root)).toEqual(['Frost.md'])
  })
})

describe('FileStore: listing and tidying', () => {
  it('lists Markdown files in reading-friendly order, skipping hidden folders and other files', async () => {
    const root = await tempDir()
    for (const path of [
      'project.md',
      'CONTENTS.md',
      'manuscript/b.md',
      'manuscript/a.md',
      'notes/deep/x.md',
      '.obsidian/workspace.md',
      'assets/photo.jpg',
    ]) {
      await mkdir(join(root, path, '..'), { recursive: true })
      await writeFile(join(root, path), '')
    }
    expect(await createFileStore(root).listMarkdownFiles()).toEqual([
      'CONTENTS.md',
      'manuscript/a.md',
      'manuscript/b.md',
      'notes/deep/x.md',
      'project.md',
    ])
  })

  it('removes old temp files left by an interrupted write', async () => {
    const root = await tempDir()
    await mkdir(join(root, 'manuscript'))
    const leftover = join(root, 'manuscript/.frost.md.a1b2c3d4.plotdevice-tmp')
    await writeFile(leftover, 'half')
    const old = new Date(Date.now() - 5 * 60_000)
    await utimes(leftover, old, old)
    await createFileStore(root).tidy()
    expect(await readdir(join(root, 'manuscript'))).toEqual([])
  })
})

describe('ProjectFolders', () => {
  it('creates a project folder, refusing an existing one or one inside another project', async () => {
    const location = await tempDir()
    const folders = createProjectFolders()
    const created = await folders.create(location, 'The Salt Orchard', ['manuscript'])
    expect(created).toEqual({ ok: true, value: join(location, 'The Salt Orchard') })
    expect(await readdir(join(location, 'The Salt Orchard'))).toEqual(['manuscript'])
    expect(await folders.create(location, 'The Salt Orchard', [])).toEqual({ ok: false, error: 'exists' })
    await writeFile(join(location, 'The Salt Orchard', 'project.md'), '')
    await writeFile(join(location, 'The Salt Orchard', 'CONTENTS.md'), '')
    await mkdir(join(location, 'The Salt Orchard', 'notes'))
    expect(await folders.create(join(location, 'The Salt Orchard', 'notes'), 'Nested', [])).toEqual({ ok: false, error: 'inside-project' })
  })
})

describe('JournalStore', () => {
  it('saves, lists and removes entries per project', async () => {
    const appData = await tempDir()
    const journals = createJournalStore(appData)
    const entry = {
      id: 'j1',
      operation: 'rename-chapter-file' as const,
      steps: [{ kind: 'rename' as const, from: p('a.md'), to: p('b.md'), revision: 'r' as Revision }],
    }
    await journals.save('prj-1', entry)
    expect(await journals.list('prj-1')).toEqual([entry])
    expect(await journals.list('prj-2')).toEqual([])
    await journals.remove('prj-1', 'j1')
    expect(await journals.list('prj-1')).toEqual([])
  })
})

describe('randomIdGenerator', () => {
  it('makes prefixed six-character ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomIdGenerator.next('ch')))
    expect(ids.size).toBe(500)
    for (const id of ids) expect(id).toMatch(/^ch-[0-9a-z]{6}$/)
  })
})
