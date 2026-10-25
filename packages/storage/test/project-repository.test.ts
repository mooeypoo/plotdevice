import type { IdGenerator, ProjectSnapshot } from '@plotdevice/application'
import { createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRepository, type RepositoryOptions } from '../src/index'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const p = (path: string) => path as ProjectPath
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'plotdevice-repo-'))
  dirs.push(dir)
  return dir
}

/** Predictable ids, so created files can be compared byte for byte. */
function sequentialIds(): IdGenerator {
  let n = 0
  return { next: (prefix) => `${prefix}-t${String(++n).padStart(5, '0')}` }
}

async function setup(options: Partial<RepositoryOptions> = {}) {
  const base = await tempDir()
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  const repository = createProjectRepository({ folders: createProjectFolders(), journals: createJournalStore(join(base, 'app-data')), ids: sequentialIds(), ...options })
  const opened = await repository.open(root)
  if (!opened.ok) throw new Error(`open failed: ${opened.error}`)
  const read = (path: string) => readFile(join(root, path), 'utf8')
  return { base, root, repository, snapshot: opened.value, read }
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.error)}`)
  return result.value
}

/** Every file's bytes, so a test can prove nothing else changed. */
async function snapshotFiles(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) files[join(entry.parentPath, entry.name).slice(root.length + 1).replaceAll('\\', '/')] = await readFile(join(entry.parentPath, entry.name), 'utf8')
  }
  return files
}

const titles = (snapshot: ProjectSnapshot) =>
  snapshot.contents.entries.map((e) => (e.kind === 'chapter' ? e.linkText : `${e.name}: ${e.chapters.map((c) => c.linkText).join(', ')}`))

describe('creating a project', () => {
  it('writes exactly the documented files, in a folder named after the title', async () => {
    const location = await tempDir()
    const repository = createProjectRepository({ folders: createProjectFolders(), journals: createJournalStore(join(location, 'app-data')), ids: sequentialIds() })
    const snapshot = unwrap(await repository.create(location, { title: 'The Salt Orchard', language: 'he', author: 'Ines Varga' }))
    const root = join(location, 'The Salt Orchard')
    expect(snapshot.root).toBe(root)
    expect(await snapshotFiles(root)).toEqual({
      'project.md': '---\ntitle: The Salt Orchard\nauthor: Ines Varga\nlanguage: he\nchapterNumbering: continuous\nid: prj-t00001\nschemaVersion: 1\n---\n',
      'CONTENTS.md': '# The Salt Orchard\n',
    })
    expect(await readdir(join(root, 'manuscript'))).toEqual([])
    expect(snapshot.contents.entries).toEqual([])
    expect(snapshot.details).toMatchObject({ title: 'The Salt Orchard', language: 'he', chapterNumbering: 'continuous' })
  })

  it('refuses invalid details, an existing folder, and a folder inside another project', async () => {
    const { base, root, repository } = await setup()
    expect(await repository.create(base, { title: '', language: 'en' })).toEqual({ ok: false, error: 'invalid-details' })
    expect(await repository.create(base, { title: 'The Salt Orchard', language: 'en' })).toEqual({ ok: false, error: 'folder-exists' })
    expect(await repository.create(join(root, 'notes'), { title: 'Nested', language: 'en' })).toEqual({ ok: false, error: 'inside-project' })
  })
})

describe('opening a project', () => {
  it('reads details, contents, and chapters that are not in the book yet', async () => {
    const { snapshot } = await setup()
    expect(snapshot.details).toMatchObject({ title: 'The Salt Orchard', author: 'Ines Varga', language: 'en', chapterNumbering: 'continuous', id: 'prj-7d2k9q', schemaVersion: 1 })
    expect(titles(snapshot)).toEqual(['Prologue', 'Part One: Arrival: The Crossing, The Orchard Gate', 'Part Two: Salt: Frost', 'Epilogue'])
    expect(snapshot.chapters.filter((c) => !c.listed).map((c) => c.file)).toEqual(['manuscript/draft-ideas.md'])
    expect(snapshot).toMatchObject({ missing: [], outdatedLinkText: [], relinkSuggestions: [], duplicateIds: [], warnings: [], recovered: [] })
  })

  it('refuses a folder that is not a project, and a project from a newer version of the app', async () => {
    const { root, repository } = await setup()
    expect(await repository.open(join(root, 'notes'))).toEqual({ ok: false, error: 'not-a-project' })
    await writeFile(join(root, 'project.md'), '---\ntitle: X\nlanguage: en\nschemaVersion: 99\n---\n')
    expect(await repository.open(root)).toEqual({ ok: false, error: 'newer-format' })
  })

  it('reports a chapter that is not UTF-8 without failing the project', async () => {
    const { root, repository } = await setup()
    await writeFile(join(root, 'manuscript/frost.md'), Buffer.from([0x2d, 0x20, 0xff, 0xfe, 0x0a]))
    const snapshot = unwrap(await repository.open(root))
    expect(snapshot.chapters.find((c) => c.file === 'manuscript/frost.md')).toMatchObject({ status: 'unreadable', listed: true })
  })

  it('warns about contents entries pointing outside the project or at non-Markdown files', async () => {
    const { root, repository } = await setup()
    await writeFile(join(root, 'CONTENTS.md'), '# T\n\n- [Outside](../secret.md)\n- [Fine](manuscript/frost.md)\n')
    const snapshot = unwrap(await repository.open(root))
    expect(titles(snapshot)).toEqual(['Fine'])
    expect(snapshot.warnings.map((w) => w.code)).toEqual(['invalid-path'])
  })
})

describe('changing the book', () => {
  it('adds a chapter: a new file named from its title, and one line in the contents', async () => {
    const { repository, snapshot, read } = await setup()
    const after = unwrap(await repository.changeContents(snapshot, { kind: 'add-chapter', title: 'Thaw', placement: { part: 2, index: 1 }, text: 'It began to thaw.\n' }))
    expect(await read('manuscript/thaw.md')).toBe('---\ntitle: Thaw\nid: ch-t00001\n---\nIt began to thaw.\n')
    expect(await read('CONTENTS.md')).toContain('  - [Frost](manuscript/frost.md)\n  - [Thaw](manuscript/thaw.md)\n- [Epilogue]')
    expect(titles(after)[2]).toBe('Part Two: Salt: Frost, Thaw')
  })

  it('gives a new chapter a free file name when its title is taken', async () => {
    const { repository, snapshot } = await setup()
    const after = unwrap(await repository.changeContents(snapshot, { kind: 'add-chapter', title: 'Frost', placement: { part: null, index: 0 } }))
    expect(after.contents.entries[0]).toMatchObject({ file: 'manuscript/frost-2.md', linkText: 'Frost' })
  })

  it('moves a chapter without renaming or touching any chapter file (PRD scenario E)', async () => {
    const { root, repository, snapshot, read } = await setup()
    const before = await snapshotFiles(root)
    unwrap(await repository.changeContents(snapshot, { kind: 'move-chapter', file: p('manuscript/epilogue.md'), placement: { part: null, index: 0 } }))
    const after = await snapshotFiles(root)
    expect(await read('CONTENTS.md')).toBe(before['CONTENTS.md']?.replace('- [Epilogue](manuscript/epilogue.md)\n', '').replace('- [Prologue]', '- [Epilogue](manuscript/epilogue.md)\n- [Prologue]'))
    expect({ ...after, 'CONTENTS.md': '' }).toEqual({ ...before, 'CONTENTS.md': '' })
  })

  it('removes a chapter from the book but keeps its file, which is then "not in the book yet"', async () => {
    const { root, repository, snapshot, read } = await setup()
    const after = unwrap(await repository.changeContents(snapshot, { kind: 'remove-from-book', file: p('manuscript/frost.md') }))
    expect(await read('CONTENTS.md')).not.toContain('frost.md')
    expect(await readdir(join(root, 'manuscript'))).toContain('frost.md')
    expect(after.chapters.filter((c) => !c.listed).map((c) => c.file)).toEqual(['manuscript/draft-ideas.md', 'manuscript/frost.md'])
  })

  it('adds an unlisted chapter to the book, using its title', async () => {
    const { repository, snapshot, read } = await setup()
    unwrap(await repository.changeContents(snapshot, { kind: 'add-to-book', file: p('manuscript/draft-ideas.md'), placement: { part: null, index: 4 } }))
    expect(await read('CONTENTS.md')).toContain('- [Epilogue](manuscript/epilogue.md)\n- [Draft ideas](manuscript/draft-ideas.md)\n')
  })

  it('adds and renames parts', async () => {
    const { repository, snapshot, read } = await setup()
    const added = unwrap(await repository.changeContents(snapshot, { kind: 'add-part', name: 'Part Three: Sale', index: 3 }))
    const renamed = unwrap(await repository.changeContents(added, { kind: 'rename-part', part: 1, name: 'Arrival' }))
    expect(await read('CONTENTS.md')).toContain('- Arrival\n')
    expect(titles(renamed)).toContain('Part Three: Sale: ')
  })

  it('checks domain rules before writing anything', async () => {
    const { root, repository, snapshot } = await setup()
    const before = await snapshotFiles(root)
    expect(await repository.changeContents(snapshot, { kind: 'move-chapter', file: p('manuscript/frost.md'), placement: { part: 0, index: 0 } })).toEqual({ ok: false, error: 'invalid' })
    expect(await repository.changeContents(snapshot, { kind: 'add-part', name: '   ', index: 0 })).toEqual({ ok: false, error: 'invalid' })
    expect(await snapshotFiles(root)).toEqual(before)
  })

  it('refuses to change contents edited outside the app since the snapshot, leaving them as they are (PRD scenario G)', async () => {
    const { root, repository, snapshot, read } = await setup()
    await writeFile(join(root, 'CONTENTS.md'), '# Reordered in Obsidian\n\n- [Frost](manuscript/frost.md)\n')
    expect(await repository.changeContents(snapshot, { kind: 'add-part', name: 'X', index: 0 })).toEqual({ ok: false, error: 'stale' })
    expect(await read('CONTENTS.md')).toBe('# Reordered in Obsidian\n\n- [Frost](manuscript/frost.md)\n')
  })
})

describe('missing and renamed chapters (PRD scenario I)', () => {
  it('reports a missing chapter, suggests the renamed file, and relinks only when asked', async () => {
    const { root, repository, read } = await setup()
    const frost = await read('manuscript/frost.md')
    await unlink(join(root, 'manuscript/frost.md'))
    await writeFile(join(root, 'manuscript/hard-frost.md'), frost)
    const snapshot = unwrap(await repository.open(root))
    expect(snapshot.missing).toEqual(['manuscript/frost.md'])
    expect(snapshot.relinkSuggestions).toEqual([{ missing: 'manuscript/frost.md', found: 'manuscript/hard-frost.md', reason: 'same-title' }])
    expect(await read('CONTENTS.md')).toContain('(manuscript/frost.md)') // nothing changed by opening
    const relinked = unwrap(await repository.changeContents(snapshot, { kind: 'relink', missing: p('manuscript/frost.md'), found: p('manuscript/hard-frost.md') }))
    expect(relinked.missing).toEqual([])
    expect(await read('CONTENTS.md')).toContain('  - [Frost](manuscript/hard-frost.md)\n')
  })

  it('reports link text that no longer matches a title, and updates it when asked', async () => {
    const { root, repository, read } = await setup()
    await writeFile(join(root, 'manuscript/frost.md'), (await read('manuscript/frost.md')).replace('title: Frost', 'title: Hard Frost'))
    const snapshot = unwrap(await repository.open(root))
    expect(snapshot.outdatedLinkText).toEqual([{ file: 'manuscript/frost.md', linkText: 'Frost', title: 'Hard Frost' }])
    const fixed = unwrap(await repository.changeContents(snapshot, { kind: 'update-link-text', file: p('manuscript/frost.md') }))
    expect(fixed.outdatedLinkText).toEqual([])
    expect(await read('CONTENTS.md')).toContain('  - [Hard Frost](manuscript/frost.md)\n')
  })

  it('reports chapters that share an id', async () => {
    const { root, repository, read } = await setup()
    await writeFile(join(root, 'manuscript/frost-copy.md'), await read('manuscript/frost.md'))
    const snapshot = unwrap(await repository.open(root))
    expect(snapshot.duplicateIds).toEqual([{ id: 'ch-p0n1zz', files: ['manuscript/frost-copy.md', 'manuscript/frost.md'] }])
  })
})

describe('renaming a chapter title', () => {
  it('changes the title in the chapter and its contents line, and never the file name', async () => {
    const { root, repository, snapshot, read } = await setup()
    const after = unwrap(await repository.renameChapter(snapshot, p('manuscript/frost.md'), 'Hard Frost'))
    expect(await read('manuscript/frost.md')).toBe((await readFile(join(FIXTURE, 'manuscript/frost.md'), 'utf8')).replace('title: Frost', 'title: Hard Frost'))
    expect(await read('CONTENTS.md')).toContain('  - [Hard Frost](manuscript/frost.md)\n')
    expect(await readdir(join(root, 'manuscript'))).toContain('frost.md')
    expect(after.outdatedLinkText).toEqual([])
  })
})

describe('chapter text (PRD scenario A, core half)', () => {
  it('saves and reads back text, keeping the frontmatter as it was', async () => {
    const { root, repository, read } = await setup()
    const chapter = unwrap(await repository.readChapter(root, p('manuscript/frost.md')))
    expect(chapter.text).toBe('יעל said the frost came early that year. "Early for whom?" Ilka asked.\n')
    const saved = unwrap(await repository.saveChapter(root, p('manuscript/frost.md'), 'A new first line.\n', chapter.revision))
    expect(await read('manuscript/frost.md')).toBe('---\ntitle: Frost\nid: ch-p0n1zz\n---\nA new first line.\n')
    expect(unwrap(await repository.readChapter(root, p('manuscript/frost.md')))).toEqual({ text: 'A new first line.\n', revision: saved })
  })

  it('refuses to save over a chapter edited elsewhere since it was read', async () => {
    const { root, repository, read } = await setup()
    const chapter = unwrap(await repository.readChapter(root, p('manuscript/frost.md')))
    await writeFile(join(root, 'manuscript/frost.md'), 'Edited in another app.\n')
    expect(await repository.saveChapter(root, p('manuscript/frost.md'), 'Stale text.\n', chapter.revision)).toEqual({ ok: false, error: 'stale' })
    expect(await read('manuscript/frost.md')).toBe('Edited in another app.\n')
  })

  it('creates a project, writes a first chapter, and finds it intact after reopening', async () => {
    const location = await tempDir()
    const repository = createProjectRepository({ folders: createProjectFolders(), journals: createJournalStore(join(location, 'app-data')), ids: sequentialIds() })
    const created = unwrap(await repository.create(location, { title: 'מטע המלח', language: 'he' }))
    const withChapter = unwrap(await repository.changeContents(created, { kind: 'add-chapter', title: 'פרק ראשון', placement: { part: null, index: 0 }, text: 'יעל קראה את המכתב. Ilka listened.\n' }))
    const reopened = unwrap(await repository.open(withChapter.root))
    expect(reopened.contents.entries).toEqual([{ kind: 'chapter', file: 'manuscript/פרק-ראשון.md', linkText: 'פרק ראשון' }])
    expect(unwrap(await repository.readChapter(reopened.root, p('manuscript/פרק-ראשון.md'))).text).toBe('יעל קראה את המכתב. Ilka listened.\n')
  })
})

describe('renaming a page file (explicit, through the recovery journal)', () => {
  async function withPage(options: Partial<RepositoryOptions> = {}) {
    const context = await setup(options)
    await mkdir(join(context.root, 'characters'))
    await writeFile(join(context.root, 'characters/ilka.md'), '---\ntitle: Ilka Varga\n---\nSee [Bea](bea.md).\n')
    await writeFile(join(context.root, 'characters/bea.md'), '---\ntitle: Bea\n---\nIlka’s aunt: [Ilka](ilka.md), also [[ilka]].\n')
    await writeFile(join(context.root, 'outlines/main-story.md'), '## Beginning\n\n- Ilka arrives, see [Ilka](../characters/ilka.md)\n')
    await writeFile(join(context.root, 'manuscript/frost.md'), '---\ntitle: Frost\nid: ch-p0n1zz\n---\nAbout [Ilka](../characters/ilka.md).\n')
    const snapshot = unwrap(await context.repository.open(context.root))
    return { ...context, snapshot }
  }

  it('renames the page and fixes every link to it, in outlines, chapters and other pages', async () => {
    const { root, repository, snapshot, read } = await withPage()
    const contents = await read('CONTENTS.md')
    const result = unwrap(await repository.renameFile(snapshot, p('characters/ilka.md'), 'ilka-varga'))
    expect(result.file).toBe('characters/ilka-varga.md')
    expect(result.filesChanged).toEqual(['characters/bea.md', 'manuscript/frost.md', 'outlines/main-story.md'])
    expect(await read('characters/bea.md')).toBe('---\ntitle: Bea\n---\nIlka’s aunt: [Ilka](ilka-varga.md), also [[ilka-varga]].\n')
    expect(await read('outlines/main-story.md')).toContain('[Ilka](../characters/ilka-varga.md)')
    expect(await read('manuscript/frost.md')).toContain('About [Ilka](../characters/ilka-varga.md).')
    expect(await read('CONTENTS.md')).toBe(contents)
    expect(await readdir(join(root, 'characters'))).toEqual(expect.arrayContaining(['ilka-varga.md', 'bea.md']))
  })

  it('refuses a name another page has', async () => {
    const { repository, snapshot } = await withPage()
    expect(await repository.renameFile(snapshot, p('characters/ilka.md'), 'Bea')).toEqual({ ok: false, error: 'name-taken' })
  })

  it.each(['journal-saved', 'step-0', 'step-1', 'step-2', 'step-3'])('is finished on the next open after an interruption at %s', async (point) => {
    const reference = await withPage()
    unwrap(await reference.repository.renameFile(reference.snapshot, p('characters/ilka.md'), 'ilka-varga'))
    const expected = await snapshotFiles(reference.root)
    const crashing = await withPage({ crashAt: (reached) => reached === point })
    await expect(crashing.repository.renameFile(crashing.snapshot, p('characters/ilka.md'), 'ilka-varga')).rejects.toThrow('simulated crash')
    expect(unwrap(await crashing.repository.open(crashing.root)).recovered).toEqual([{ journal: expect.any(String), outcome: 'completed' }])
    expect(await snapshotFiles(crashing.root)).toEqual(expected)
  })
})

describe('renaming a chapter file (explicit, through the recovery journal)', () => {
  it('renames the file and fixes the contents and every link to it, changing nothing else', async () => {
    const { root, repository, snapshot, read } = await setup()
    const before = await snapshotFiles(root)
    const result = unwrap(await repository.renameFile(snapshot, p('manuscript/the-crossing.md'), '01 crossing'))
    const after = await snapshotFiles(root)
    expect(result.filesChanged).toEqual(['CONTENTS.md', 'notes/loose-ideas.md', 'outlines/main-story.md'])
    expect(result.linksUpdated).toBe(7)
    expect(after['manuscript/01 crossing.md']).toBe(before['manuscript/the-crossing.md'])
    expect(after['manuscript/the-crossing.md']).toBeUndefined()
    expect(await read('CONTENTS.md')).toContain('  - [The Crossing](<manuscript/01 crossing.md>)\n')
    expect(await read('outlines/main-story.md')).toContain('[The Crossing](<../manuscript/01 crossing.md>)')
    expect(await read('notes/loose-ideas.md')).toContain('[[01 crossing|the first chapter]]')
    for (const path of ['project.md', 'manuscript/frost.md', 'manuscript/prologue.md', 'notes/crossing-notes.md']) expect(after[path]).toBe(before[path])
    expect(result.snapshot.missing).toEqual([])
  })

  it('refuses unsafe or taken names, and changes nothing', async () => {
    const { root, repository, snapshot } = await setup()
    const before = await snapshotFiles(root)
    expect(await repository.renameFile(snapshot, p('manuscript/the-crossing.md'), 'con')).toEqual({ ok: false, error: 'invalid-name' })
    expect(await repository.renameFile(snapshot, p('manuscript/the-crossing.md'), 'what?')).toEqual({ ok: false, error: 'invalid-name' })
    expect(await repository.renameFile(snapshot, p('manuscript/the-crossing.md'), 'Frost')).toEqual({ ok: false, error: 'name-taken' })
    expect(await snapshotFiles(root)).toEqual(before)
  })

  it('renames when only the case changes', async () => {
    const { root, repository, snapshot } = await setup()
    unwrap(await repository.renameFile(snapshot, p('manuscript/frost.md'), 'Frost'))
    expect(await readdir(join(root, 'manuscript'))).toContain('Frost.md')
  })

  // Interrupt the rename after each step (in-process; Spike C proved the same journal with real SIGKILLs).
  const crashPoints = ['journal-saved', 'step-0', 'step-1', 'step-2', 'step-3']

  it.each(crashPoints)('is finished on the next open after an interruption at %s', async (point) => {
    const reference = await setup()
    unwrap(await reference.repository.renameFile(reference.snapshot, p('manuscript/the-crossing.md'), 'crossing'))
    const expected = await snapshotFiles(reference.root)

    const crashing = await setup({ crashAt: (reached) => reached === point })
    await expect(crashing.repository.renameFile(crashing.snapshot, p('manuscript/the-crossing.md'), 'crossing')).rejects.toThrow('simulated crash')
    const reopened = unwrap(await crashing.repository.open(crashing.root))
    expect(reopened.recovered).toEqual([{ journal: expect.any(String), outcome: 'completed' }])
    expect(await snapshotFiles(crashing.root)).toEqual(expected)
    expect(unwrap(await crashing.repository.open(crashing.root)).recovered).toEqual([]) // nothing left to do
  })

  it('stops and reports instead of overwriting a file edited after the interruption', async () => {
    const { root, repository: crashing, snapshot } = await setup({ crashAt: (reached) => reached === 'step-1' })
    await expect(crashing.renameFile(snapshot, p('manuscript/the-crossing.md'), 'crossing')).rejects.toThrow('simulated crash')
    await writeFile(join(root, 'outlines/main-story.md'), '# Rewritten in another app\n')
    const reopened = unwrap(await crashing.open(root))
    expect(reopened.recovered).toEqual([{ journal: expect.any(String), outcome: 'needs-attention', files: ['outlines/main-story.md'] }])
    expect(await readFile(join(root, 'outlines/main-story.md'), 'utf8')).toBe('# Rewritten in another app\n')
  })
})

describe('keeping both versions of a chapter changed elsewhere (PRD scenario G, core half)', () => {
  const elsewhere = '---\ntitle: Frost\nid: ch-p0n1zz\npov: Ilka # who tells it\n---\nEdited in another app.\n'

  it("saves the author's text next to the chapter, with its details, a new title and a new id", async () => {
    const { root, repository, read } = await setup()
    await writeFile(join(root, 'manuscript/frost.md'), elsewhere)
    const copy = unwrap(await repository.saveChapterCopy(root, p('manuscript/frost.md'), 'יעל wrote this in the app.\n', 'my version'))
    expect(copy).toBe('manuscript/frost-my-version.md')
    expect(await read('manuscript/frost-my-version.md')).toBe('---\ntitle: Frost (my version)\nid: ch-t00001\npov: Ilka # who tells it\n---\nיעל wrote this in the app.\n')
    expect(await read('manuscript/frost.md')).toBe(elsewhere)
  })

  it('shows the copy as not in the book yet, with no duplicate ids', async () => {
    const { root, repository } = await setup()
    await writeFile(join(root, 'manuscript/frost.md'), elsewhere)
    unwrap(await repository.saveChapterCopy(root, p('manuscript/frost.md'), 'Mine.\n', 'my version'))
    const reopened = unwrap(await repository.open(root))
    expect(reopened.chapters.find((c) => c.file === 'manuscript/frost-my-version.md')).toMatchObject({ title: 'Frost (my version)', listed: false })
    expect(reopened.duplicateIds).toEqual([])
  })

  it('never overwrites an earlier copy', async () => {
    const { root, repository, read } = await setup()
    unwrap(await repository.saveChapterCopy(root, p('manuscript/frost.md'), 'First.\n', 'my version'))
    expect(unwrap(await repository.saveChapterCopy(root, p('manuscript/frost.md'), 'Second.\n', 'my version'))).toBe('manuscript/frost-my-version-2.md')
    expect(await read('manuscript/frost-my-version.md')).toMatch(/\nFirst\.\n$/)
  })

  it('regression: a copy of a character, place or note page gets no id; only chapters have ids', async () => {
    const { root, repository, read } = await setup()
    await mkdir(join(root, 'places'))
    await writeFile(join(root, 'places/marrow.md'), '---\ntitle: Marrow\n---\nChanged elsewhere.\n')
    unwrap(await repository.saveChapterCopy(root, p('places/marrow.md'), 'Mine.\n', 'my version'))
    expect(await read('places/marrow-my-version.md')).toBe('---\ntitle: Marrow (my version)\n---\nMine.\n')
  })

  it("still saves the author's text when the chapter was deleted elsewhere", async () => {
    const { root, repository, read } = await setup()
    await unlink(join(root, 'manuscript/frost.md'))
    unwrap(await repository.saveChapterCopy(root, p('manuscript/frost.md'), 'Mine.\n', 'my version'))
    expect(await read('manuscript/frost-my-version.md')).toBe('---\ntitle: frost (my version)\nid: ch-t00001\n---\nMine.\n')
  })
})
