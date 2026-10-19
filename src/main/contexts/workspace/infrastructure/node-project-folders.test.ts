import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import type { ProjectRoot } from '../domain/project-root'
import { createNodeProjectFolders } from './node-project-folders'

let copy: SampleNovelCopy
const folders = createNodeProjectFolders()
const root = (path: string): ProjectRoot => path as ProjectRoot

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

describe('createNodeProjectFolders', () => {
  it('tells folders from files and missing paths', async () => {
    expect(await folders.exists(root(copy.root))).toBe(true)
    expect(await folders.exists(root(join(copy.root, 'novel.md')))).toBe(false)
    expect(await folders.exists(root(join(copy.root, 'missing')))).toBe(false)
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
    expect(await folders.findProjectAbove(root(join(copy.root, 'manuscript', 'Part One')))).toBe(
      copy.root
    )
  })

  it('finds no project above the project itself', async () => {
    expect(await folders.findProjectAbove(root(copy.root))).toBeUndefined()
  })

  it('finds a project below a parent folder', async () => {
    expect(await folders.findProjectBelow(root(dirname(copy.root)))).toBe(copy.root)
  })

  it('does not count the folder itself as below', async () => {
    expect(await folders.findProjectBelow(root(copy.root))).toBeUndefined()
  })

  it('ignores projects inside dot-folders', async () => {
    const hidden = join(copy.root, 'notes', '.archive', 'old')
    await mkdir(hidden, { recursive: true })
    await writeFile(join(hidden, 'novel.md'), '---\nformat: 1\n---\n')
    expect(await folders.findProjectBelow(root(join(copy.root, 'notes')))).toBeUndefined()
  })
})
