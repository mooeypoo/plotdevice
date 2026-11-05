import type { IdGenerator } from '@plotdevice/application'
import { createFileStore, createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRepository, createReferenceRepository } from '../src/index'
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

  it('reads suggested tags as a list or a single tag, tidied, and none when absent (Milestone 19)', async () => {
    const list = await open(await book({ 'project.md': '---\ntitle: Book\nsuggestedTags: [Villain, " Ally ", villain, 3]\n---\n' }))
    expect(list.details.suggestedTags).toEqual(['Villain', 'Ally'])
    const one = await open(await book({ 'project.md': '---\ntitle: Book\nsuggestedTags: נבל\n---\n' }))
    expect(one.details.suggestedTags).toEqual(['נבל'])
    const none = await open(await book({ 'project.md': '---\ntitle: Book\n---\n' }))
    expect(none.details.suggestedTags).toEqual([])
    expect(none.warnings).toEqual([])
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

describe('writing the kinds to project.md (ADR 0011, decision 2)', () => {
  const ids: IdGenerator = { next: (prefix) => `${prefix}-1` }
  async function repositoryFor(root: string) {
    const repository = createProjectRepository({
      folders: createProjectFolders(),
      journals: createJournalStore(join(root, '..', 'app-data')),
      ids,
    })
    const opened = await repository.open(root)
    if (!opened.ok) throw new Error(opened.error)
    return { repository, snapshot: opened.value }
  }

  const SALT = '---\ntitle: The Salt Orchard\nlanguage: en\n# Kept by hand\nseries: Orchard Books\n---\nNotes the author keeps.\n'

  it('adds only the two keys, keeping comments, other keys and the body', async () => {
    const root = await book({ 'project.md': SALT })
    const { repository, snapshot } = await repositoryFor(root)
    const kinds = [
      { folder: 'characters', one: 'NPC', many: 'NPCs' },
      { folder: 'פלגים', one: 'פלג', many: 'פלגים' },
    ]
    const written = await repository.setKinds(snapshot, kinds, { one: 'Session', many: 'Sessions' })
    expect(written.ok && written.value.details.kinds).toEqual(kinds)
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(
      '---\ntitle: The Salt Orchard\nlanguage: en\n# Kept by hand\nseries: Orchard Books\n' +
        'kinds:\n  - folder: characters\n    one: NPC\n    many: NPCs\n  - folder: פלגים\n    one: פלג\n    many: פלגים\n' +
        'manuscriptUnit:\n  one: Session\n  many: Sessions\n---\nNotes the author keeps.\n',
    )
  })

  it('back to the defaults, the keys go and the file is as it was', async () => {
    const root = await book({ 'project.md': SALT })
    const first = await repositoryFor(root)
    const changed = await first.repository.setKinds(first.snapshot, [{ folder: 'npcs', one: 'NPC: Ally', many: 'NPCs' }], null)
    expect(await readFile(join(root, 'project.md'), 'utf8')).toContain('    one: "NPC: Ally"\n')
    if (!changed.ok) throw new Error(changed.error)
    await first.repository.setKinds(changed.value, [{ folder: 'characters' }, { folder: 'places' }, { folder: 'notes' }], null)
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(SALT)
  })

  it('writes nothing when nothing changes', async () => {
    const root = await book({ 'project.md': SALT })
    const { repository, snapshot } = await repositoryFor(root)
    expect((await repository.setKinds(snapshot, snapshot.details.kinds, null)).ok).toBe(true)
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(SALT)
  })
})
