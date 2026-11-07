import { expect, test, type Page } from '@playwright/test'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, type Launched } from './launch'

// The Export window (Milestone 22): Word, PDF, e-book and Markdown, as an author uses it.
const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-export-'))
  root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(saveAs: string, env: Record<string, string> = {}): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root, PLOTDEVICE_TEST_SAVE_AS: saveAs, ...env })
  const { page } = running
  await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  return page
}

async function openExport(page: Page): Promise<void> {
  await page.getByTestId('book-menu').click()
  await page.getByTestId('menu-export-book').click()
  await expect(page.getByTestId('export-dialog')).toBeVisible()
}

test('export a Word manuscript, then show it in its folder', async () => {
  const saveAs = join(base, 'book.docx')
  const page = await start(saveAs)
  await openExport(page)
  await expect(page.getByTestId('export-format-word')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('export-title-page')).toBeChecked()
  await expect(page.getByTestId('export-no-title')).toBeHidden()
  await page.getByTestId('export-go').click()
  await expect(page.getByTestId('export-dialog')).toBeHidden()
  await expect(page.getByRole('alert')).toContainText('book.docx')
  expect((await readFile(saveAs)).subarray(0, 2).toString()).toBe('PK')
})

test('only the choices that apply to a format show', async () => {
  const page = await start(join(base, 'book.epub'))
  await openExport(page)
  await expect(page.getByTestId('export-double')).toBeVisible()
  await expect(page.getByTestId('export-choose-cover')).toBeHidden()
  await page.getByTestId('export-format-epub').click()
  await expect(page.getByTestId('export-double')).toBeHidden()
  await expect(page.getByTestId('export-title-page')).toBeHidden()
  await expect(page.getByTestId('export-choose-cover')).toBeVisible()
})

test('a PDF printed from the book, on the paper chosen', async () => {
  const saveAs = join(base, 'book.pdf')
  const page = await start(saveAs)
  await openExport(page)
  await page.getByTestId('export-format-pdf').click()
  await page.getByTestId('export-paper').selectOption('a4')
  await page.getByTestId('export-go').click()
  await expect(page.getByRole('alert')).toContainText('book.pdf', { timeout: 30_000 })
  const pdf = await readFile(saveAs)
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  // A4 is about 595 × 842 points; Chromium writes 594.96 × 841.92.
  const [, width = '0', height = '0'] = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf.toString('latin1')) ?? []
  expect(Math.round(Number(width))).toBe(595)
  expect(Math.round(Number(height))).toBe(842)
})

test('a book without a title: the title typed in the window is saved with the book', async () => {
  const project = await readFile(join(root, 'project.md'), 'utf8')
  await writeFile(join(root, 'project.md'), project.replace('title: The Salt Orchard', 'title: Untitled project'))
  const saveAs = join(base, 'book.epub')
  const page = await start(saveAs)
  await openExport(page)
  await expect(page.getByTestId('export-no-title')).toBeVisible()
  await page.getByTestId('export-book-title').fill('Salt and Frost')
  await expect(page.getByTestId('export-no-title')).toBeHidden()
  await expect(page.getByTestId('export-saves-details')).toBeVisible()
  await page.getByTestId('export-format-epub').click()
  await page.getByTestId('export-go').click()
  await expect(page.getByRole('alert')).toContainText('book.epub')
  await expect.poll(async () => readFile(join(root, 'project.md'), 'utf8')).toContain('title: Salt and Frost\n')
  await expect(page.locator('.project-title')).toContainText('Salt and Frost')
})

test('choose chapters: First three, then none, which can’t be exported', async () => {
  const saveAs = join(base, 'book.md')
  const page = await start(saveAs)
  await openExport(page)
  await page.getByTestId('export-format-markdown').click()
  await page.getByTestId('export-some-chapters').check()
  await page.getByTestId('export-none').click()
  await expect(page.getByTestId('export-go')).toBeDisabled()
  await page.getByTestId('export-first-three').click()
  await page.getByTestId('export-headings-name').check()
  await page.getByTestId('export-go').click()
  await expect(page.getByRole('alert')).toContainText('book.md')
  const headings = (await readFile(saveAs, 'utf8')).split('\n').filter((line) => line.startsWith('#'))
  expect(headings).toEqual(['## Prologue', '# Part One: Arrival', '## The Crossing', '## The Orchard Gate'])

  // Remembered for the book: the next time, the window opens the same way.
  await openExport(page)
  await expect(page.getByTestId('export-format-markdown')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('export-some-chapters')).toBeChecked()
  await expect(page.getByTestId('export-headings-name')).toBeChecked()
})

test('cancelling the save dialog keeps the window open and writes nothing', async () => {
  const page = await start('')
  await openExport(page)
  await page.getByTestId('export-go').click()
  await expect(page.getByTestId('export-dialog')).toBeVisible()
  await page.getByTestId('export-cancel').click()
  await expect(page.getByTestId('export-dialog')).toBeHidden()
})
