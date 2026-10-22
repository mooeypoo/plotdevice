import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as atomicWriter from '../../../infrastructure/fs/write-text-file-atomically'
import { readFrontmatter } from '../../../infrastructure/markdown/read-frontmatter'
import {
  copySampleNovel,
  makeTempFolder,
  type SampleNovelCopy
} from '../../../infrastructure/testing/sample-novel'
import { novelTemplate } from '../domain/novel-template'
import { readProject } from '../domain/project'
import { DEFAULT_PROJECT_SETTINGS } from '../domain/project-settings'
import type { ProjectRoot } from '../domain/project-root'
import { createMarkdownNovelFileStore } from './markdown-novel-file-store'
import { resolveBookWords } from '../../../book-language/book-words'
import { templateWordsOf } from '../../../book-language/context-words'

const ENGLISH = templateWordsOf(resolveBookWords('en'))

let folder: SampleNovelCopy
const store = createMarkdownNovelFileStore()

afterEach(async () => {
  vi.restoreAllMocks()
  await folder.remove()
})

describe('reading novel.md', () => {
  beforeEach(async () => {
    folder = await copySampleNovel()
  })

  it("reads the fixture's novel.md", async () => {
    expect(await store.read(folder.root as ProjectRoot)).toMatchObject({
      kind: 'read',
      frontmatter: { format: 1, title: 'The Salt Orchard', genre: 'literary fiction' }
    })
  })

  it('reports novel.md with broken YAML as unreadable', async () => {
    await writeFile(join(folder.root, 'novel.md'), '---\ntitle: "unclosed\n---\n')
    expect(await store.read(folder.root as ProjectRoot)).toEqual({
      kind: 'unreadable',
      problem: 'unparseable-frontmatter'
    })
  })

  it('reads a novel.md with no frontmatter as having no keys', async () => {
    await writeFile(join(folder.root, 'novel.md'), 'Just a premise.\n')
    expect(await store.read(folder.root as ProjectRoot)).toEqual({
      kind: 'read',
      frontmatter: undefined
    })
  })
})

describe('creating novel.md', () => {
  beforeEach(async () => {
    folder = await makeTempFolder()
  })

  it('reports a folder without novel.md as missing', async () => {
    expect(await store.read(folder.root as ProjectRoot)).toEqual({ kind: 'missing' })
  })

  it('writes the template, which reads back as the defaults with no warnings', async () => {
    const title = 'Ilka: "The Return" — בוקר'
    expect(await store.create(folder.root as ProjectRoot, novelTemplate(title, ENGLISH))).toEqual({
      ok: true,
      value: undefined
    })

    const bytes = await readFile(join(folder.root, 'novel.md'))
    const reading = readFrontmatter(bytes)
    expect(reading.kind).toBe('read')
    if (reading.kind !== 'read') return
    expect(reading.data).toMatchObject({
      calendar: 'gregorian',
      statuses: ['idea', 'outline', 'draft', 'revised', 'final'],
      threads: []
    })
    expect(readProject(folder.root as ProjectRoot, 'x', reading.data)).toMatchObject({
      title,
      formatVersion: 1,
      readOnly: false,
      settings: DEFAULT_PROJECT_SETTINGS,
      warnings: []
    })
  })

  it('never replaces an existing novel.md', async () => {
    await writeFile(join(folder.root, 'novel.md'), 'mine\n')
    expect(
      await store.create(folder.root as ProjectRoot, novelTemplate('x', ENGLISH))
    ).toMatchObject({
      ok: false,
      error: {
        code: 'already-exists',
        diagnostic: {
          reason: 'workspace-already-project',
          path: folder.root
        }
      }
    })
    expect(await readFile(join(folder.root, 'novel.md'), 'utf8')).toBe('mine\n')
  })

  it('retains the exact creation path and technical failure without publishing novel.md', async () => {
    vi.spyOn(atomicWriter, 'writeTextFileAtomically').mockRejectedValue(new Error('EACCES (יעל)'))
    expect(await store.create(folder.root as ProjectRoot, novelTemplate('New', ENGLISH))).toEqual({
      ok: false,
      error: {
        code: 'write-failed',
        message: "Couldn't write novel.md: EACCES (יעל)",
        diagnostic: {
          reason: 'file-create-failed',
          path: join(folder.root, 'novel.md'),
          detail: 'EACCES (יעל)'
        }
      }
    })
    await expect(readFile(join(folder.root, 'novel.md'))).rejects.toThrow()
  })
})

describe('the Hebrew template', () => {
  beforeEach(async () => {
    folder = await makeTempFolder()
  })

  it('reads back with its language, Hebrew statuses and no warnings', async () => {
    const hebrew = templateWordsOf(resolveBookWords('he'))
    await store.create(folder.root as ProjectRoot, novelTemplate('ספר', hebrew))
    const reading = await store.read(folder.root as ProjectRoot)
    expect(reading).toMatchObject({
      kind: 'read',
      frontmatter: { language: 'he', statuses: ['רעיון', 'מתווה', 'טיוטה', 'נערך', 'סופי'] }
    })
    if (reading.kind !== 'read') return
    expect(readProject(folder.root as ProjectRoot, 'x', reading.frontmatter).warnings).toEqual([])
  })
})

describe('setting one top-level key', () => {
  beforeEach(async () => {
    folder = await makeTempFolder()
  })

  const novel = (eol: string, bom = ''): string =>
    bom +
    [
      '---',
      '# my own notes',
      'title: Mine   # keep this',
      'language: en',
      'custom: [a, b]',
      '---',
      'Premise.',
      ''
    ].join(eol)

  it.each([
    ['LF', '\n', ''],
    ['CRLF with a BOM', '\r\n', '﻿']
  ])('changes only that key in a %s file', async (_, eol, bom) => {
    await writeFile(join(folder.root, 'novel.md'), novel(eol, bom))
    expect(await store.setKey(folder.root as ProjectRoot, 'language', 'he')).toEqual({
      ok: true,
      value: undefined
    })
    expect(await readFile(join(folder.root, 'novel.md'), 'utf8')).toBe(
      novel(eol, bom).replace('language: en', 'language: he')
    )
  })
})
