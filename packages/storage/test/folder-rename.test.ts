import type { IdGenerator } from '@plotdevice/application'
import { createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRepository, type RepositoryOptions } from '../src/index'

// "Match folder names…" (Milestone 18, ADR 0011 decision 7, ADR 0005 note of 2026-11-04): a kind's
// folder renamed to its plural, every link to it updated, as one journalled operation with an undo.
// Test-first: the highest-risk part of the milestone.

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const ids: IdGenerator = { next: (prefix) => `${prefix}-1` }

const BOOK: Record<string, string> = {
  'project.md': [
    '---',
    'title: The Sunken Crown',
    'language: en',
    'kinds:',
    '  - folder: characters',
    '    one: NPC',
    '    many: NPCs',
    '  - folder: groups',
    '    one: פלג',
    '    many: פלגים',
    '  - folder: notes',
    '---',
    'Notes by hand.',
    '',
  ].join('\n'),
  'CONTENTS.md': '# The Sunken Crown\n\n- [Session one](manuscript/one.md)\n',
  'manuscript/one.md':
    '---\ntitle: Session one\n---\n[Bea](../characters/bea.md) meets [the merchants](<../groups/the merchants.md#oath> "first").\n',
  'outlines/arc.md': '# Arc\n\n## Start\n\n- [[characters/bea]] and [[bea]] and `[x](../characters/bea.md)`\n',
  'characters/bea.md':
    '---\ntitle: Bea\n---\nOwes [the merchants](../groups/the%20merchants.md).\n\n## Relationships\n- Friend of [Ilka](ilka.md)\n',
  'characters/ilka.md': '# Ilka\n\nSee [Bea][bea].\n\n[bea]: bea.md\n',
  'groups/the merchants.md': '# The merchants\n\nLed by [Bea](../characters/bea.md).\n',
  'notes/salt.md': '# Salt\n\nKnown to [Bea](../characters/bea.md) and [Ilka](<../characters/ilka.md>).\n',
}

async function book(files: Record<string, string> = BOOK, options: Partial<RepositoryOptions> = {}) {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-folders-'))
  dirs.push(base)
  const root = join(base, 'The Sunken Crown')
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  const make = (more: Partial<RepositoryOptions> = {}) =>
    createProjectRepository({
      folders: createProjectFolders(),
      journals: createJournalStore(join(base, 'app-data')),
      ids,
      ...options,
      ...more,
    })
  const repository = make()
  const opened = await repository.open(root)
  if (!opened.ok) throw new Error(opened.error)
  const read = (path: string) => readFile(join(root, path), 'utf8')
  const all = async () => Object.fromEntries(await Promise.all(Object.keys(files).map(async (path) => [path, await read(path)] as const)))
  return { root, repository, snapshot: opened.value, read, all, make }
}

const RENAMES = [
  { from: 'characters', to: 'npcs' },
  { from: 'groups', to: 'פלגים' },
]

describe('planning: the preview', () => {
  it('lists each folder, how many pages move, and exactly the links that will change', async () => {
    const { repository, snapshot } = await book()
    const plan = await repository.planFolderRenames(snapshot, RENAMES)
    expect(plan.renames).toEqual([
      { from: 'characters', to: 'npcs', files: 2, blocked: null },
      { from: 'groups', to: 'פלגים', files: 1, blocked: null },
    ])
    // one.md: 2; arc.md: 1 (the path wikilink; the bare [[bea]] keeps meaning bea, and code is never touched);
    // characters/bea.md: 1; groups/the merchants.md: 1; notes/salt.md: 2. Links between siblings stay.
    expect(plan.linksUpdated).toBe(7)
    expect(plan.filesChanged).toEqual(['manuscript/one.md', 'notes/salt.md', 'npcs/bea.md', 'outlines/arc.md', 'פלגים/the merchants.md'])
  })

  it.each([
    ['a folder with that name already exists', { 'npcs/x.md': '# X\n' }, { from: 'characters', to: 'npcs' }, 'exists'],
    ['only the letter case differs', {}, { from: 'characters', to: 'Characters' }, 'case-only'],
    ['a name Windows can’t use', {}, { from: 'characters', to: 'con' }, 'invalid-name'],
    ['the book’s own folder', {}, { from: 'characters', to: 'manuscript' }, 'invalid-name'],
    ['something other than pages is in the folder', { 'characters/map.png': 'png' }, { from: 'characters', to: 'npcs' }, 'other-files'],
    ['the folder isn’t there', {}, { from: 'factions', to: 'groups-2' }, 'missing'],
  ])('refuses when %s, with that reason', async (_name, extra, rename, reason) => {
    const { repository, snapshot } = await book({ ...BOOK, ...extra })
    const plan = await repository.planFolderRenames(snapshot, [rename])
    expect(plan.renames[0]?.blocked).toBe(reason)
  })
})

describe('renaming', () => {
  it('moves the pages, updates every link, and the kinds in project.md, removing the old folders', async () => {
    const { root, repository, snapshot, read } = await book()
    const renamed = await repository.renameFolders(snapshot, RENAMES)
    expect(renamed.ok && renamed.value.linksUpdated).toBe(7)
    expect(renamed.ok && renamed.value.snapshot.details.kinds.map((kind) => kind.folder)).toEqual(['npcs', 'פלגים', 'notes'])

    const top = (await readdir(root)).sort()
    expect(top).toEqual(['CONTENTS.md', 'manuscript', 'notes', 'npcs', 'outlines', 'project.md', 'פלגים'])
    expect(await read('manuscript/one.md')).toBe(
      '---\ntitle: Session one\n---\n[Bea](../npcs/bea.md) meets [the merchants](<../פלגים/the merchants.md#oath> "first").\n',
    )
    expect(await read('outlines/arc.md')).toBe('# Arc\n\n## Start\n\n- [[npcs/bea]] and [[bea]] and `[x](../characters/bea.md)`\n')
    // Inside the moved folders: sibling links stay as written; links across them follow.
    // Still %-encoded, as the author wrote it; read back, it leads to the renamed folder.
    expect(decodeURI(await read('npcs/bea.md'))).toBe(
      '---\ntitle: Bea\n---\nOwes [the merchants](../פלגים/the merchants.md).\n\n## Relationships\n- Friend of [Ilka](ilka.md)\n',
    )
    expect(await read('npcs/ilka.md')).toBe(BOOK['characters/ilka.md'])
    expect(await read('פלגים/the merchants.md')).toBe('# The merchants\n\nLed by [Bea](../npcs/bea.md).\n')
    expect(await read('notes/salt.md')).toBe('# Salt\n\nKnown to [Bea](../npcs/bea.md) and [Ilka](<../npcs/ilka.md>).\n')
    expect(await read('project.md')).toBe(
      BOOK['project.md']?.replace('folder: characters', 'folder: npcs').replace('folder: groups', 'folder: פלגים'),
    )
    expect(await read('CONTENTS.md')).toBe(BOOK['CONTENTS.md'])
  })

  it('does nothing when any rename is blocked', async () => {
    const { repository, snapshot, all } = await book({ ...BOOK, 'npcs/x.md': '# X\n' })
    const before = await all()
    expect(await repository.renameFolders(snapshot, RENAMES)).toEqual({ ok: false, error: 'blocked' })
    expect(await all()).toEqual(before)
  })

  it('an interruption is finished from the journal when the book opens again', async () => {
    const { root, snapshot, read, make } = await book()
    const crashing = make({ crashAt: (point) => point === 'step-2' })
    await expect(crashing.renameFolders(snapshot, RENAMES)).rejects.toThrow('simulated crash')
    const reopened = await make().open(root)
    expect(reopened.ok && reopened.value.recovered).toEqual([{ journal: 'jrn-1', outcome: 'completed' }])
    expect(await read('notes/salt.md')).toBe('# Salt\n\nKnown to [Bea](../npcs/bea.md) and [Ilka](<../npcs/ilka.md>).\n')
    expect(reopened.ok && reopened.value.details.kinds.map((kind) => kind.folder)).toEqual(['npcs', 'פלגים', 'notes'])
  })
})

describe('undoing', () => {
  it('puts every name and link back, byte for byte', async () => {
    const { root, repository, snapshot, all } = await book()
    const before = await all()
    const renamed = await repository.renameFolders(snapshot, RENAMES)
    if (!renamed.ok) throw new Error(renamed.error)
    const undone = await repository.undoFolderRenames(renamed.value.snapshot, renamed.value.undo)
    expect(undone.ok).toBe(true)
    expect(await all()).toEqual(before)
    expect((await readdir(root)).sort()).toEqual(['CONTENTS.md', 'characters', 'groups', 'manuscript', 'notes', 'outlines', 'project.md'])
  })

  it('refuses, and changes nothing, when a file changed since', async () => {
    const { root, repository, snapshot } = await book()
    const renamed = await repository.renameFolders(snapshot, RENAMES)
    if (!renamed.ok) throw new Error(renamed.error)
    await writeFile(join(root, 'notes/salt.md'), 'Changed in another app.\n')
    const undone = await repository.undoFolderRenames(renamed.value.snapshot, renamed.value.undo)
    expect(undone).toEqual({ ok: false, error: 'stale' })
    expect(decodeURI(await readFile(join(root, 'npcs/bea.md'), 'utf8'))).toContain('../פלגים/')
    expect(await readFile(join(root, 'notes/salt.md'), 'utf8')).toBe('Changed in another app.\n')
  })

  it('a page that only moved goes back with what was typed in it since', async () => {
    const { root, repository, snapshot, read } = await book()
    const renamed = await repository.renameFolders(snapshot, RENAMES)
    if (!renamed.ok) throw new Error(renamed.error)
    await writeFile(join(root, 'npcs/ilka.md'), '# Ilka\n\nA beekeeper.\n')
    const undone = await repository.undoFolderRenames(renamed.value.snapshot, renamed.value.undo)
    expect(undone.ok).toBe(true)
    expect(await read('characters/ilka.md')).toBe('# Ilka\n\nA beekeeper.\n')
    expect(await read('notes/salt.md')).toBe(BOOK['notes/salt.md'])
  })

  it('refuses when a page was added to a renamed folder since, which would be left behind', async () => {
    const { root, repository, snapshot } = await book()
    const renamed = await repository.renameFolders(snapshot, RENAMES)
    if (!renamed.ok) throw new Error(renamed.error)
    await writeFile(join(root, 'npcs/cato.md'), '# Cato\n')
    expect(await repository.undoFolderRenames(renamed.value.snapshot, renamed.value.undo)).toEqual({ ok: false, error: 'stale' })
    expect((await readdir(join(root, 'npcs'))).sort()).toEqual(['bea.md', 'cato.md', 'ilka.md'])
  })
})
