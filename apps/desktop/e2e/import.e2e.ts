import { expect, test, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ENGLISH_BOOK, HEBREW_BOOK } from '../../../packages/import/src/docx-fixtures.test-support'
import { launch, type Launched } from './launch'

// Bringing in a Word file (Milestone 23): a new book from it, and chapters added to an open book.
const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-import-'))
  await writeFile(join(base, 'מטע המלח.docx'), HEBREW_BOOK)
  await writeFile(join(base, 'Salt.docx'), ENGLISH_BOOK)
  await mkdir(join(base, 'Books'))
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(env: Record<string, string>): Promise<Page> {
  running = await launch(join(base, 'user-data'), env)
  return running.page
}

test('a new book from a Hebrew Word file: check the chapters, rename one, then make the book', async () => {
  const wordFile = join(base, 'מטע המלח.docx')
  const page = await start({ PLOTDEVICE_TEST_WORD_FILE: wordFile, PLOTDEVICE_TEST_CHOOSE_FOLDER: join(base, 'Books') })
  await page.getByTestId('new-project').click()
  await page.getByTestId('from-word-file').click()
  const preview = page.getByTestId('import-dialog')
  await expect(preview).toBeVisible()
  await expect(page.getByTestId('import-split-headings')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('import-name-0')).toHaveValue('המעבר')
  await expect(page.getByTestId('import-note')).toContainText('2 comments, one picture, one table')
  await page.getByTestId('import-name-1').fill('הרוח')
  await page.getByTestId('import-name-1').press('Tab')
  await page.getByTestId('import-next').click()
  await expect(preview).toBeHidden()

  await expect(page.getByTestId('from-word')).toContainText('מטע המלח.docx')
  await expect(page.getByTestId('new-project-title')).toHaveValue('מטע המלח')
  await expect(page.getByTestId('new-project-language')).toHaveValue('he')
  await page.getByTestId('new-project-create').click()
  await page.locator('.project-title').waitFor()

  const root = join(base, 'Books', 'מטע המלח')
  const contents = await readFile(join(root, 'CONTENTS.md'), 'utf8')
  expect(contents).toContain('- חלק ראשון: הגעה')
  expect(contents).toContain('[המעבר]')
  expect(contents).toContain('[הרוח]')
  expect((await readdir(join(root, 'manuscript'))).length).toBe(2)
  expect(await readFile(wordFile)).toEqual(Buffer.from(HEBREW_BOOK)) // the Word file is never changed
})

test('change how a file splits, start a chapter by hand, and join it back', async () => {
  const page = await start({ PLOTDEVICE_TEST_WORD_FILE: join(base, 'Salt.docx'), PLOTDEVICE_TEST_CHOOSE_FOLDER: join(base, 'Books') })
  await page.getByTestId('new-project').click()
  await page.getByTestId('from-word-file').click()
  await expect(page.getByTestId('import-split-chapter-lines')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('import-found')).toHaveText('2 chapters')
  await page.getByTestId('import-split-page-breaks').click()
  await expect(page.getByTestId('import-found')).toHaveText('3 chapters')
  await page.getByTestId('import-split-chapter-lines').click()
  await expect(page.getByTestId('import-found')).toHaveText('2 chapters')

  await page.getByTestId('import-name-0').click() // select the first chapter
  await page.locator('.import-paragraph').nth(1).hover()
  await page.locator('.import-paragraph').nth(1).getByRole('button').click()
  await expect(page.getByTestId('import-found')).toHaveText('3 chapters')
  await page.getByTestId('import-join').click()
  await expect(page.getByTestId('import-found')).toHaveText('2 chapters')

  await page.getByTestId('import-keep-1').uncheck()
  await expect(page.getByTestId('import-found')).toHaveText('One chapter')
  await page.getByTestId('import-cancel').click()
  await expect(page.getByTestId('import-dialog')).toBeHidden()
  await expect(page.getByTestId('from-word')).toBeHidden() // cancelled: back to the templates
  expect(await readdir(join(base, 'Books'))).toEqual([])
})

test('add chapters to the open book, in a new part at the end, and use the file’s title when offered', async () => {
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  const page = await start({ PLOTDEVICE_TEST_WORD_FILE: join(base, 'Salt.docx'), PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  const before = await readFile(join(root, 'project.md'), 'utf8')

  await page.getByTestId('book-menu').click()
  await page.getByTestId('menu-import-add').click()
  await expect(page.getByTestId('import-dialog')).toBeVisible()
  await expect(page.getByTestId('import-part-name')).toHaveValue('THE SALT ORCHARD')
  await page.getByTestId('import-part-name').fill('From Salt.docx')
  await expect(page.getByTestId('import-next')).toHaveText('Add 2 chapters at the end')
  await page.getByTestId('import-next').click()

  await expect(page.getByRole('alert')).toContainText('Added 2 chapters at the end of the book.')
  expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(before) // the book's details don't change by themselves
  expect(await readFile(join(root, 'CONTENTS.md'), 'utf8')).toMatch(
    /- From Salt\.docx\n {2}- \[The Crossing\]\(manuscript\/[^)]+\)\n {2}- \[Chapter Two\]/,
  )

  await page.getByTestId('notice-action').click()
  await expect(page.locator('.project-title')).toContainText('THE SALT ORCHARD')
  expect(await readFile(join(root, 'project.md'), 'utf8')).toContain('title: THE SALT ORCHARD')
})

test('a file that isn’t a Word file says so, and nothing opens', async () => {
  await writeFile(join(base, 'notes.docx'), 'just text')
  const page = await start({ PLOTDEVICE_TEST_WORD_FILE: join(base, 'notes.docx') })
  await page.getByTestId('new-project').click()
  await page.getByTestId('from-word-file').click()
  await expect(page.getByRole('alert')).toContainText("That isn't a Word file Plot Device can read.")
  await expect(page.getByTestId('import-dialog')).toBeHidden()
})
