import { createFileStore, createProjectFolders } from '@plotdevice/fs-node'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createReferenceRepository } from '../src/index'
import { readProject } from '../src/read-project'

// Kinds of pages per project (Milestone 18, ADR 0011): read from project.md, pages listed by folder.
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function book(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'plotdevice-kinds-'))
  dirs.push(root)
  const all = { 'CONTENTS.md': '# Book\n', ...files }
  for (const [path, text] of Object.entries(all)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  return root
}

async function open(root: string) {
  const opened = await readProject(root, createFileStore(root), [])
  if (!opened.ok) throw new Error(opened.error)
  return opened.value
}

const CAMPAIGN = [
  '---',
  'title: The Sunken Crown',
  'language: en',
  '# The party’s own words, kept by hand',
  'kinds:',
  '  - folder: npcs',
  '    one: NPC',
  '    many: NPCs',
  '  - folder: פלגים',
  '    one: פלג',
  '    many: פלגים',
  '  - folder: notes',
  'manuscriptUnit:',
  '  one: Session',
  '  many: Sessions',
  '---',
  '',
].join('\n')

describe('reading the kinds of pages', () => {
  it('a book without kinds has characters, places and notes, and chapters', async () => {
    const project = await open(await book({ 'project.md': '---\ntitle: The Salt Orchard\n---\n' }))
    expect(project.details.kinds).toEqual([{ folder: 'characters' }, { folder: 'places' }, { folder: 'notes' }])
    expect(project.details.manuscriptUnit).toBeNull()
    expect(project.warnings).toEqual([])
  })

  it('reads the book’s own kinds, in Hebrew too, and what it calls a chapter', async () => {
    const project = await open(await book({ 'project.md': CAMPAIGN }))
    expect(project.details.kinds).toEqual([
      { folder: 'npcs', one: 'NPC', many: 'NPCs' },
      { folder: 'פלגים', one: 'פלג', many: 'פלגים' },
      { folder: 'notes' },
    ])
    expect(project.details.manuscriptUnit).toEqual({ one: 'Session', many: 'Sessions' })
  })

  it('kinds it can’t use are reported, the defaults are used, and the file is left alone', async () => {
    const text = '---\ntitle: A\nkinds:\n  - folder: ../outside\nmanuscriptUnit: Session\n---\n'
    const root = await book({ 'project.md': text })
    const project = await open(root)
    expect(project.details.kinds).toEqual([{ folder: 'characters' }, { folder: 'places' }, { folder: 'notes' }])
    expect(project.warnings.map((warning) => warning.code)).toEqual(['unreadable-kinds', 'unreadable-manuscript-unit'])
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(text)
  })
})

describe('listing pages by folder', () => {
  it('lists pages in the book’s kinds and in folders it doesn’t list; never the book’s own folders', async () => {
    const root = await book({
      'project.md': CAMPAIGN,
      'npcs/bea.md': '# Bea\n',
      'פלגים/הסוחרים.md': '# הסוחרים\n',
      'characters/ilka.md': '# Ilka\n',
      'manuscript/one.md': '# One\n',
      'outlines/arc.md': '# Arc\n',
      'README.md': '# About\n',
    })
    const pages = await createReferenceRepository({ folders: createProjectFolders() }).listReferences(root)
    expect(pages.map((page) => [page.file, page.kind])).toEqual([
      ['characters/ilka.md', 'characters'],
      ['npcs/bea.md', 'npcs'],
      ['פלגים/הסוחרים.md', 'פלגים'],
    ])
  })

  it('a listed kind whose folder doesn’t exist yet is simply empty', async () => {
    const root = await book({ 'project.md': CAMPAIGN })
    expect(await createReferenceRepository({ folders: createProjectFolders() }).listReferences(root)).toEqual([])
    expect((await open(root)).warnings).toEqual([])
  })
})
