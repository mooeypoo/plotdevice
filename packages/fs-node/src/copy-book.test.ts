import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { copyBook } from './copy-book'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'plotdevice-copy-'))
  dirs.push(dir)
  return dir
}
const at = new Date('2026-11-04T12:00:00Z')

describe('copyBook', () => {
  it('copies every file, and a second copy the same day gets its own folder', async () => {
    const base = await tempDir()
    const root = join(base, 'הספר')
    await mkdir(join(root, 'npcs'), { recursive: true })
    await writeFile(join(root, 'project.md'), '---\ntitle: A\n---\n')
    await writeFile(join(root, 'npcs', 'bea.md'), '# Bea\n')
    const backups = join(base, 'backups')
    await mkdir(backups)
    const first = await copyBook(root, backups, at)
    expect(first).toBe(join(backups, 'הספר backup 2026-11-04'))
    expect(await readFile(join(backups, 'הספר backup 2026-11-04', 'npcs', 'bea.md'), 'utf8')).toBe('# Bea\n')
    expect(await copyBook(root, backups, at)).toBe(join(backups, 'הספר backup 2026-11-04 2'))
    expect((await readdir(backups)).sort()).toEqual(['הספר backup 2026-11-04', 'הספר backup 2026-11-04 2'])
  })

  it('never copies a book into itself', async () => {
    const root = await tempDir()
    await writeFile(join(root, 'project.md'), 'x')
    expect(await copyBook(root, root, at)).toBeNull()
    await mkdir(join(root, 'inside'))
    expect(await copyBook(root, join(root, 'inside'), at)).toBeNull()
    expect(await readdir(join(root, 'inside'))).toEqual([])
  })
})
