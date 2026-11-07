import type { NewChapter } from '@plotdevice/application'
import { chooseSplit, splitManuscript } from '@plotdevice/domain'
import { writeDocx } from '@plotdevice/export'
import { createFileStore, createJournalStore, createProjectFolders, randomIdGenerator } from '@plotdevice/fs-node'
import { importedChapters, readDocx } from '@plotdevice/import'
import { plainTextOf, readChapterForExport, splitFrontmatter } from '@plotdevice/markdown'
import { chmod, cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { HEBREW_BOOK } from '../../import/src/docx-fixtures.test-support'
import { checkProject, createProjectRepository, readBookForExport } from '../src/index'

// Bringing in a Word file (Milestone 23), on real folders.
const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const SAMPLES = join(import.meta.dirname, '../../../samples')
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function setup(source?: string) {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-import-'))
  dirs.push(base)
  const root = join(base, 'book')
  if (source) await cp(source, root, { recursive: true })
  const folders = createProjectFolders()
  const repository = createProjectRepository({ folders, journals: createJournalStore(join(base, 'app-data')), ids: randomIdGenerator })
  return { base, root, folders, repository }
}

async function hebrewChapters(): Promise<NewChapter[]> {
  const read = await readDocx(HEBREW_BOOK)
  if (!read.ok) throw new Error(read.error)
  return importedChapters(read.value, splitManuscript(read.value.paragraphs, 'headings'), 'rtl')
}

const filesIn = async (root: string) =>
  Object.fromEntries(
    await Promise.all(
      (await readdir(root, { recursive: true })).sort().map(async (name) => [name, await readFile(join(root, name)).catch(() => null)]),
    ),
  )

describe('a new book from a Word file', () => {
  it('is a complete book in a new folder: its parts and chapters in order, each chapter’s text in its file', async () => {
    const { base, repository } = await setup()
    const made = await repository.create(
      base,
      { title: 'מטע המלח', language: 'he', author: 'אינס ורגה' },
      undefined,
      await hebrewChapters(),
    )
    if (!made.ok) throw new Error(made.error)
    const book = made.value
    expect(book.root).toBe(join(base, 'מטע המלח'))
    expect(book.details).toMatchObject({ title: 'מטע המלח', author: 'אינס ורגה', language: 'he' })
    expect(book.contents.entries.map((e) => (e.kind === 'part' ? [e.name, e.chapters.map((c) => c.linkText)] : e.linkText))).toEqual([
      ['חלק ראשון: הגעה', ['המעבר']],
      ['חלק שני: מלח', ['רוח מלוחה']],
    ])
    const firstPart = book.contents.entries[0]
    if (firstPart?.kind !== 'part') throw new Error('expected a part')
    const first = await readFile(join(book.root, firstPart.chapters[0]?.file ?? ''), 'utf8')
    expect(first).toMatch(/^---\ntitle: המעבר\nid: ch-[0-9a-z]{6}\n---\nהמעבורת יצאה/)
    expect(first).toContain('[^1]: בשנת 1904 המעבר ארך שעתיים.')
    expect((await checkProject(createFileStore(book.root))).findings).toEqual([])
  })

  it('won’t use a folder that already exists', async () => {
    const { base, repository } = await setup(FIXTURE)
    const made = await repository.create(base, { title: 'book', language: 'en' }, undefined, await hebrewChapters())
    expect(made).toEqual({ ok: false, error: 'folder-exists' })
  })
})

describe('chapters from a Word file, added to a book', () => {
  it('go in at the end, in their parts, and change nothing else in the book', async () => {
    const { root, repository } = await setup(FIXTURE)
    const opened = await repository.open(root)
    if (!opened.ok) throw new Error(opened.error)
    const before = await filesIn(root)
    const added = await repository.addChapters(opened.value, [
      { title: 'Frost', part: 'From the Word file', body: 'A new frost.\n' },
      { title: 'Salt Wind', part: 'From the Word file', body: 'Wind.\n' },
    ])
    if (!added.ok) throw new Error(added.error)
    const entries = added.value.contents.entries
    expect(entries.at(-1)).toMatchObject({
      kind: 'part',
      name: 'From the Word file',
      chapters: [{ linkText: 'Frost' }, { linkText: 'Salt Wind' }],
    })
    expect(added.value.details).toEqual(opened.value.details)
    // Another chapter is already called Frost: the new one gets a file of its own.
    const lastPart = entries.at(-1)
    const newFiles = lastPart?.kind === 'part' ? lastPart.chapters.map((c) => c.file) : []
    expect(newFiles[0]).not.toBe('manuscript/frost.md')
    const after = await filesIn(root)
    for (const [name, bytes] of Object.entries(before)) if (name !== 'CONTENTS.md') expect(after[name], name).toEqual(bytes)
    expect(await readFile(join(root, newFiles[0] as string), 'utf8')).toMatch(/\n---\nA new frost\.\n$/)
  })

  it('refuses when CONTENTS.md changed since the book was read, and writes nothing', async () => {
    const { root, repository } = await setup(FIXTURE)
    const opened = await repository.open(root)
    if (!opened.ok) throw new Error(opened.error)
    const before = await filesIn(root)
    const changed = await repository.changeContents(opened.value, { kind: 'add-part', name: 'Elsewhere', index: 0 })
    expect(changed.ok).toBe(true)
    const stale = await repository.addChapters(opened.value, [{ title: 'Late', part: null, body: '' }])
    expect(stale).toEqual({ ok: false, error: 'stale' })
    expect(Object.keys(await filesIn(root)).filter((name) => !(name in before))).toEqual([])
  })

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'keeps the chapters, outside the book, if CONTENTS.md can’t be written',
    async () => {
      const { root, repository } = await setup(FIXTURE)
      const opened = await repository.open(root)
      if (!opened.ok) throw new Error(opened.error)
      await chmod(join(root, 'CONTENTS.md'), 0o444)
      await chmod(root, 0o555) // no new files beside it either: the atomic write needs one
      await chmod(join(root, 'manuscript'), 0o755)
      const added = await repository.addChapters(opened.value, [{ title: 'Kept', part: null, body: 'Not lost.\n' }])
      await chmod(root, 0o755)
      await chmod(join(root, 'CONTENTS.md'), 0o644)
      expect(added.ok).toBe(false)
      const reopened = await repository.open(root)
      if (!reopened.ok) throw new Error(reopened.error)
      expect(reopened.value.chapters.find((c) => c.title === 'Kept')).toMatchObject({ listed: false })
    },
  )
})

describe('a round trip: each sample book, exported to Word and brought back in', () => {
  it.each(['the-salt-orchard', 'מטע-המלח'])('%s comes back with the same chapters, parts and text', async (sample) => {
    const { root, folders, repository } = await setup(join(SAMPLES, sample))
    const opened = await repository.open(root)
    if (!opened.ok) throw new Error(opened.error)
    const hebrew = opened.value.details.language === 'he'
    const { book } = await readBookForExport(folders, opened.value, {
      chapters: undefined,
      headings: 'number-and-name',
      directionMode: 'project',
      chapterLabel: (n) => (hebrew ? `פרק ${n}` : `Chapter ${n}`),
      made: '2026-11-07T12:00:00.000Z',
    })
    const options = {
      titlePage: true,
      wordCount: hebrew ? 'כ־1,000 מילים' : 'about 1,000 words',
      doubleSpaced: true,
      paper: 'a4',
      by: hebrew ? 'מאת' : 'by',
      hebrewFont: null,
    } as const
    const read = await readDocx(await writeDocx(book, options))
    if (!read.ok) throw new Error(read.error)
    const plan = splitManuscript(read.value.paragraphs, chooseSplit(read.value.paragraphs))
    expect(plan).toMatchObject({ title: book.title, author: book.author })
    const back = importedChapters(read.value, plan, book.direction)

    const original = await Promise.all(
      opened.value.contents.entries.flatMap((entry) =>
        (entry.kind === 'part' ? entry.chapters.map((c) => ({ ...c, part: entry.name })) : [{ ...entry, part: null }]).map(
          async (chapter) => ({
            title: chapter.linkText,
            part: chapter.part,
            text: plainTextOf(readChapterForExport(splitFrontmatter(await readFile(join(root, chapter.file), 'utf8')).body)),
          }),
        ),
      ),
    )
    // A Word file has nothing that marks where a part ends, so a chapter after a part, outside it (the
    // Epilogue), comes back inside that part. The author moves it out with one drag.
    let lastPart: string | null = null
    const expected = original.map((chapter) => {
      lastPart = chapter.part ?? lastPart
      return { ...chapter, part: lastPart }
    })
    expect(
      back.map((chapter) => ({ title: chapter.title, part: chapter.part, text: plainTextOf(readChapterForExport(chapter.body)) })),
    ).toEqual(expected)
  })
})
