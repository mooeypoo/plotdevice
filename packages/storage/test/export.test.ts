import type { ProjectSnapshot } from '@plotdevice/application'
import { writeDocx, writeEpub } from '@plotdevice/export'
import { createJournalStore, createProjectFolders, randomIdGenerator } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { execFile } from 'node:child_process'
import { cp, mkdtemp, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectRepository, readBookForExport, type ExportReading } from '../src/index'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const SAMPLES = join(import.meta.dirname, '../../../samples')
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function setup(source = FIXTURE) {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-export-'))
  dirs.push(base)
  const root = join(base, 'book')
  await cp(source, root, { recursive: true })
  const folders = createProjectFolders()
  const repository = createProjectRepository({ folders, journals: createJournalStore(join(base, 'app-data')), ids: randomIdGenerator })
  const open = async (): Promise<ProjectSnapshot> => {
    const opened = await repository.open(root)
    if (!opened.ok) throw new Error(opened.error)
    return opened.value
  }
  return { base, root, folders, open }
}

const p = (path: string) => path as ProjectPath
const reading = (changes: Partial<ExportReading> = {}): ExportReading => ({
  chapters: undefined,
  headings: 'number-and-name',
  directionMode: 'project',
  chapterLabel: (number) => `Chapter ${number}`,
  made: '2026-11-07T12:30:00.000Z',
  ...changes,
})
const outline = (entries: { kind: string; label?: string | null; name: string }[]) =>
  entries.map((entry) => (entry.kind === 'part' ? `# ${entry.name}` : `${entry.label ?? '—'} / ${entry.name}`))

describe('reading the book for export', () => {
  it('gives the book’s details and its parts and chapters in reading order, with headings', async () => {
    const { folders, open } = await setup()
    const { book, missing } = await readBookForExport(folders, await open(), reading())
    expect(missing).toEqual([])
    expect(book).toMatchObject({
      title: 'The Salt Orchard',
      author: 'Ines Varga',
      language: 'en',
      direction: 'ltr',
      made: '2026-11-07T12:30:00.000Z',
    })
    expect(outline(book.entries)).toEqual([
      'Chapter 1 / Prologue',
      '# Part One: Arrival',
      'Chapter 2 / The Crossing',
      'Chapter 3 / The Orchard Gate',
      '# Part Two: Salt',
      'Chapter 4 / Frost',
      'Chapter 5 / Epilogue',
    ])
  })

  it('heads chapters with only their names when the author chooses that', async () => {
    const { folders, open } = await setup()
    const { book } = await readBookForExport(folders, await open(), reading({ headings: 'name' }))
    expect(book.entries.flatMap((entry) => (entry.kind === 'chapter' ? [entry.label] : []))).toEqual([null, null, null, null, null])
  })

  it('exports only the chosen chapters, keeps their numbers, and still counts the whole book’s words', async () => {
    const { folders, open } = await setup()
    const snapshot = await open()
    const whole = await readBookForExport(folders, snapshot, reading())
    const some = await readBookForExport(folders, snapshot, reading({ chapters: new Set([p('manuscript/frost.md')]) }))
    expect(outline(some.book.entries)).toEqual(['# Part Two: Salt', 'Chapter 4 / Frost'])
    expect(some.wordCount).toBe(whole.wordCount)
    expect(whole.wordCount).toBeGreaterThan(0)
  })

  it('gives every paragraph a direction: marked ones keep theirs, others follow the author’s setting', async () => {
    const { root, folders, open } = await setup()
    await writeFile(
      join(root, 'manuscript/frost.md'),
      '---\ntitle: Frost\n---\nThe frost came.\n\nיעל אמרה שלא.\n\n::: {dir=rtl}\nMarked.\n:::\n',
    )
    const directions = async (directionMode: 'project' | 'auto') => {
      const { book } = await readBookForExport(
        folders,
        await open(),
        reading({ directionMode, chapters: new Set([p('manuscript/frost.md')]) }),
      )
      const chapter = book.entries.find((entry) => entry.kind === 'chapter')
      return chapter?.kind === 'chapter' ? chapter.blocks.map((block) => ('direction' in block ? block.direction : null)) : []
    }
    expect(await directions('project')).toEqual(['ltr', 'ltr', 'rtl'])
    expect(await directions('auto')).toEqual(['ltr', 'rtl', 'rtl'])
  })

  it('reads a Hebrew book right to left', async () => {
    const { folders, open } = await setup(join(SAMPLES, 'מטע-המלח'))
    const { book } = await readBookForExport(folders, await open(), reading({ chapterLabel: (number) => `פרק ${number}` }))
    expect(book).toMatchObject({ title: 'מטע המלח', language: 'he', direction: 'rtl' })
    expect(outline(book.entries)[0]).toBe('פרק 1 / פתיחה')
  })

  it('reports a chosen chapter that can’t be read, and not one that wasn’t chosen', async () => {
    const { root, folders, open } = await setup()
    const snapshot = await open()
    await unlink(join(root, 'manuscript/frost.md'))
    expect((await readBookForExport(folders, snapshot, reading())).missing).toEqual(['manuscript/frost.md'])
    expect((await readBookForExport(folders, snapshot, reading({ chapters: new Set([p('manuscript/prologue.md')]) }))).missing).toEqual([])
  })

  it('changes nothing in the project', async () => {
    const { root, folders, open } = await setup()
    const files = async () =>
      Promise.all(
        (await readdir(root, { recursive: true })).sort().map(async (name) => [name, await readFile(join(root, name)).catch(() => null)]),
      )
    const before = await files()
    await readBookForExport(folders, await open(), reading())
    expect(await files()).toEqual(before)
  })
})

// EPUBCheck is the standard e-book validator. CI sets EPUBCHECK_JAR; elsewhere this is skipped.
const epubcheck = process.env['EPUBCHECK_JAR']
const ONE_PIXEL_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
)
describe.skipIf(!epubcheck)('the sample books as e-books, checked by EPUBCheck', () => {
  it.each([
    ['the-salt-orchard', 'Contents', (n: number) => `Chapter ${n}`],
    ['מטע-המלח', 'תוכן העניינים', (n: number) => `פרק ${n}`],
  ])(
    '%s',
    async (sample, contents, chapterLabel) => {
      const { base, folders, open } = await setup(join(SAMPLES, sample))
      const { book } = await readBookForExport(folders, await open(), reading({ chapterLabel }))
      const file = join(base, 'book.epub')
      await writeFile(file, writeEpub(book, { contents }, { bytes: ONE_PIXEL_PNG, mediaType: 'image/png' }))
      const run = await promisify(execFile)('java', ['-jar', epubcheck as string, file, '--quiet']).catch(
        (error: { stdout: string; stderr: string }) => error,
      )
      expect(`${run.stdout}${run.stderr}`.trim()).toBe('')
    },
    60_000,
  )
})

// LibreOffice opens each sample book's Word file and prints it to PDF; the PDF must hold the book's
// text, in the packed Hebrew font. CI sets SOFFICE (Linux); elsewhere this is skipped.
const soffice = process.env['SOFFICE']
const FONTS = join(import.meta.dirname, '../../../apps/desktop/resources/fonts')
describe.skipIf(!soffice)('the sample books as Word files, opened by LibreOffice', () => {
  it.each([
    ['the-salt-orchard', 'by', (n: number) => `Chapter ${n}`, 'The Crossing'],
    ['מטע-המלח', 'מאת', (n: number) => `פרק ${n}`, 'המעבר'],
  ])(
    '%s',
    async (sample, by, chapterLabel, chapter) => {
      const { base, folders, open } = await setup(join(SAMPLES, sample))
      const { book } = await readBookForExport(folders, await open(), reading({ chapterLabel }))
      const font = {
        name: 'David Libre',
        regular: await readFile(join(FONTS, 'DavidLibre-Regular.ttf')),
        bold: await readFile(join(FONTS, 'DavidLibre-Bold.ttf')),
        fallback: 'David',
      }
      const options = { titlePage: true, wordCount: '84,000', doubleSpaced: true, paper: 'a4', by, hebrewFont: font } as const
      await writeFile(join(base, 'book.docx'), await writeDocx(book, options))
      const run = promisify(execFile)
      await run(soffice as string, ['--headless', '--convert-to', 'pdf', '--outdir', base, join(base, 'book.docx')], { timeout: 120_000 })
      const { stdout: text } = await run('pdftotext', ['-layout', join(base, 'book.pdf'), '-'])
      expect(text).toContain(chapter)
      if (book.direction === 'rtl') expect((await run('pdffonts', [join(base, 'book.pdf')])).stdout).toContain('DavidLibre')
    },
    180_000,
  )
})
