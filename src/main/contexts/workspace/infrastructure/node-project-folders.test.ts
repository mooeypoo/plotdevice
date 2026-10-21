import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import type { Dirent, PathLike } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import type { ProjectRoot } from '../domain/project-root'
import { createNodeProjectFolders } from './node-project-folders'

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return { ...original, stat: vi.fn(original.stat), readdir: vi.fn(original.readdir) }
})

const readDirectories =
  vi.mocked<(path: PathLike, options: { withFileTypes: true }) => Promise<Dirent[]>>(readdir)
let copy: SampleNovelCopy
const folders = createNodeProjectFolders()
const root = (path: string): ProjectRoot => path as ProjectRoot

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  await copy.remove()
})

describe('createNodeProjectFolders', () => {
  it('tells folders from files and missing paths', async () => {
    expect(await folders.exists(root(copy.root))).toEqual({ ok: true, value: true })
    expect(await folders.exists(root(join(copy.root, 'novel.md')))).toEqual({
      ok: true,
      value: false
    })
    expect(await folders.exists(root(join(copy.root, 'missing')))).toEqual({
      ok: true,
      value: false
    })
  })

  it('names a folder', () => {
    expect(folders.nameOf(root(copy.root))).toBe('sample-novel')
  })

  it('compares roots exactly on Linux and without case on Windows', () => {
    const linux = createNodeProjectFolders('linux')
    const windows = createNodeProjectFolders('win32')
    expect(linux.isSameRoot(root('/a/Book'), root('/a/book'))).toBe(false)
    expect(windows.isSameRoot(root('/a/Book'), root('/a/book'))).toBe(true)
    expect(linux.isSameRoot(root('/a/Book/'), root('/a/Book'))).toBe(true)
  })

  it('finds the project above a subfolder', async () => {
    expect(await folders.findProjectAbove(root(join(copy.root, 'manuscript', 'Part One')))).toEqual(
      { ok: true, value: copy.root }
    )
  })

  it('finds no project above the project itself', async () => {
    expect(await folders.findProjectAbove(root(copy.root))).toEqual({ ok: true, value: undefined })
  })

  it('finds a project below a parent folder', async () => {
    expect(await folders.findProjectBelow(root(dirname(copy.root)))).toEqual({
      ok: true,
      value: copy.root
    })
  })

  it('does not count the folder itself as below', async () => {
    expect(await folders.findProjectBelow(root(copy.root))).toEqual({ ok: true, value: undefined })
  })

  it('ignores projects inside dot-folders', async () => {
    const hidden = join(copy.root, 'notes', '.archive', 'old')
    await mkdir(hidden, { recursive: true })
    await writeFile(join(hidden, 'novel.md'), '---\nformat: 1\n---\n')
    expect(await folders.findProjectBelow(root(join(copy.root, 'notes')))).toEqual({
      ok: true,
      value: undefined
    })
  })

  it.each(['exists', 'findProjectAbove'] as const)(
    'reports %s access errors with the exact path and original detail',
    async (operation) => {
      const error = Object.assign(new Error('EACCES יעל <img>'), { code: 'EACCES' })
      vi.mocked(stat).mockRejectedValueOnce(error)
      const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const path = root(copy.root)
      expect(await folders[operation](path)).toMatchObject({
        ok: false,
        error: {
          code: 'folder-inspection-failed',
          diagnostic: {
            reason: 'workspace-folder-inspection-failed',
            path: operation === 'exists' ? path : join(dirname(path), 'novel.md'),
            detail: error.message
          }
        }
      })
      expect(log).toHaveBeenCalledOnce()
    }
  )

  it('does not treat an unreadable subtree as an empty safe folder', async () => {
    const original = await readFile(join(copy.root, 'novel.md'))
    const entries = await readdir(copy.root, { withFileTypes: true })
    const child = entries.find((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    if (child === undefined) throw new Error('Fixture has no visible child directory')
    const error = Object.assign(new Error('EIO'), { code: 'EIO' })
    readDirectories.mockResolvedValueOnce(entries).mockRejectedValueOnce(error)
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await folders.findProjectBelow(root(copy.root))).toMatchObject({
      ok: false,
      error: {
        code: 'folder-inspection-failed',
        diagnostic: {
          reason: 'workspace-folder-inspection-failed',
          path: join(copy.root, child.name),
          detail: 'EIO'
        }
      }
    })
    expect(log).toHaveBeenCalledOnce()
    expect(await readFile(join(copy.root, 'novel.md'))).toEqual(original)
  })

  it('reports a vanished search root but skips a descendant that disappeared during traversal', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    readDirectories.mockRejectedValueOnce(error)
    expect(await folders.findProjectBelow(root(copy.root))).toMatchObject({
      ok: false,
      error: { code: 'folder-inspection-failed' }
    })
    expect(log).toHaveBeenCalledOnce()
    const entries = await readdir(copy.root, { withFileTypes: true })
    const child = entries.find((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    if (child === undefined) throw new Error('Fixture has no visible child directory')
    readDirectories.mockResolvedValueOnce([child]).mockRejectedValueOnce(error)
    expect(await folders.findProjectBelow(root(copy.root))).toEqual({ ok: true, value: undefined })
    expect(log).toHaveBeenCalledOnce()
  })

  it('reports search exhaustion at exactly 10,000 visited folders, but permits a completed search', async () => {
    const entries = await readdir(copy.root, { withFileTypes: true })
    const child = entries.find((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    if (child === undefined) throw new Error('Fixture has no child directory')
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    readDirectories.mockClear()
    readDirectories
      .mockResolvedValueOnce(Array.from({ length: 10_000 }, () => child))
      .mockResolvedValue([])
    expect(await folders.findProjectBelow(root(copy.root))).toMatchObject({
      ok: false,
      error: {
        code: 'folder-search-limit',
        diagnostic: { reason: 'workspace-folder-search-limit', path: copy.root, limit: 10_000 }
      }
    })
    expect(readDirectories).toHaveBeenCalledTimes(10_000)
    expect(log).toHaveBeenCalledOnce()
    readDirectories.mockClear()
    readDirectories.mockResolvedValueOnce(Array.from({ length: 9_999 }, () => child))
    expect(await folders.findProjectBelow(root(copy.root))).toEqual({ ok: true, value: undefined })
    expect(readDirectories).toHaveBeenCalledTimes(10_000)
  })
})
