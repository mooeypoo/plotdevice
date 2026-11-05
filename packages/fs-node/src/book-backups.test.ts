import { zipSync } from 'fflate'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createBookBackups } from './book-backups'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'plotdevice-backups-'))
  dirs.push(dir)
  return dir
}

async function book(base: string): Promise<string> {
  const root = join(base, 'מטע המלח')
  await mkdir(join(root, 'manuscript'), { recursive: true })
  await mkdir(join(root, 'פלגים'), { recursive: true })
  await writeFile(join(root, 'project.md'), '---\ntitle: מטע המלח\nid: prj-1\n---\n')
  await writeFile(join(root, 'manuscript', 'frost.md'), '﻿The first frost.\r\n')
  await writeFile(join(root, 'פלגים', 'הסוחרים.md'), '# הסוחרים\n')
  await writeFile(join(root, 'cover.png'), new Uint8Array([137, 80, 78, 71]))
  return root
}

const backups = createBookBackups()

describe('backups as zip files', () => {
  it('saves the whole book, and reads its Markdown back exactly, BOM and line endings included', async () => {
    const base = await tempDir()
    const root = await book(base)
    const folder = join(base, 'Dropbox')
    await mkdir(folder)
    const saved = await backups.save(root, folder, 'מטע המלח backup 2026-11-05 14.30.zip')
    expect(saved).toEqual({ ok: true, value: join(folder, 'מטע המלח backup 2026-11-05 14.30.zip') })
    expect(await readdir(folder)).toEqual(['מטע המלח backup 2026-11-05 14.30.zip'])
    const read = await backups.read(join(folder, 'מטע המלח backup 2026-11-05 14.30.zip'))
    expect(read.ok && read.value.files.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { path: 'manuscript/frost.md', text: 'The first frost.\r\n', hasBom: true },
      { path: 'project.md', text: '---\ntitle: מטע המלח\nid: prj-1\n---\n', hasBom: false },
      { path: 'פלגים/הסוחרים.md', text: '# הסוחרים\n', hasBom: false },
    ])
  })

  it('unpacks a backup into a new folder, byte for byte, never over one', async () => {
    const base = await tempDir()
    const root = await book(base)
    const saved = await backups.save(root, base, 'b.zip')
    if (!saved.ok) throw new Error(saved.error)
    const copy = await backups.unpack(saved.value, base, 'מטע המלח (2026-11-05 14.30)')
    expect(copy).toEqual({ ok: true, value: join(base, 'מטע המלח (2026-11-05 14.30)') })
    for (const file of ['project.md', 'manuscript/frost.md', 'פלגים/הסוחרים.md', 'cover.png'])
      expect(await readFile(join(base, 'מטע המלח (2026-11-05 14.30)', file))).toEqual(await readFile(join(root, file)))
    expect(await backups.unpack(saved.value, base, 'מטע המלח (2026-11-05 14.30)')).toEqual({ ok: false, error: 'exists' })
  })

  it('never writes a zip’s entries outside the new folder', async () => {
    const base = await tempDir()
    const evil = join(base, 'evil.zip')
    await writeFile(
      evil,
      zipSync({ 'book/../../escaped.md': new TextEncoder().encode('no'), 'book/ok.md': new TextEncoder().encode('yes') }),
    )
    const copy = await backups.unpack(evil, join(base), 'unpacked')
    expect(copy.ok).toBe(true)
    expect(await readdir(join(base, 'unpacked'))).toEqual(['ok.md'])
    await expect(readFile(join(base, '..', 'escaped.md'))).rejects.toThrow()
  })

  it('refuses a folder inside the book, a missing folder, and a name that’s taken', async () => {
    const base = await tempDir()
    const root = await book(base)
    expect(await backups.save(root, join(root, 'manuscript'), 'b.zip')).toEqual({ ok: false, error: 'inside-book' })
    expect(await backups.save(root, join(base, 'nowhere'), 'b.zip')).toEqual({ ok: false, error: 'missing-folder' })
    await writeFile(join(base, 'b.zip'), 'mine')
    expect(await backups.save(root, base, 'b.zip')).toEqual({ ok: false, error: 'failed' })
    expect(await readFile(join(base, 'b.zip'), 'utf8')).toBe('mine')
    expect((await readdir(base)).filter((name) => name.includes('partial'))).toEqual([])
  })

  it('lists the zips in a folder, and says when the folder is gone', async () => {
    const base = await tempDir()
    const root = await book(base)
    const folder = join(base, 'backups')
    await mkdir(folder)
    await backups.save(root, folder, 'b 2.zip')
    await backups.save(root, folder, 'b 1.zip')
    await writeFile(join(folder, 'notes.txt'), 'not a backup')
    const list = await backups.list(folder)
    expect(list.ok && list.value.map((entry) => entry.name)).toEqual(['b 1.zip', 'b 2.zip'])
    expect(await backups.list(join(base, 'gone'))).toEqual({ ok: false, error: 'missing-folder' })
    expect(await backups.folderExists(folder)).toBe(true)
  })
})
