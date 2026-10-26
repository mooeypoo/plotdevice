import { expect, test, type Page } from '@playwright/test'
import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const FROST = 'manuscript/frost.md'

let base = ''
let root = ''
let running: Launched | undefined
let pageMessages: string[] = []

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-versions-'))
  root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  pageMessages = []
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  running.page.on('console', (message) => pageMessages.push(message.text()))
  const { page } = running
  await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  return page
}

const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')
const file = (path: string) => expect.poll(() => read(path).catch(() => ''))

/** The open chapter's versions, from the book menu. */
async function chapterVersions(page: Page): Promise<void> {
  await page.getByTestId('book-menu').click()
  await page.getByTestId('menu-chapter-versions').click()
}

test('restore an earlier version of a chapter, then undo the restore', async () => {
  const original = await read(FROST)
  const page = await start()
  await page.locator(`[data-chapter="${FROST}"]`).first().click()
  await page.locator('.cm-line', { hasText: 'Ilka asked' }).click()
  await page.keyboard.press('End')
  await page.keyboard.type(' A new line of mine.')
  await expect(page.getByTestId('save-status')).toHaveText('Saved')

  await chapterVersions(page)
  await expect(page.getByTestId('version')).toHaveCount(1)
  await expect(page.getByTestId('version-preview')).toContainText('Ilka asked.')
  await expect(page.getByTestId('version-preview')).not.toContainText('A new line of mine.')
  await page.getByTestId('version-restore').click()
  await file(FROST).toBe(original)
  await expect(page.locator('.cm-content')).not.toContainText('A new line of mine.') // the editor shows it at once

  await chapterVersions(page)
  await expect(page.getByTestId('version')).toHaveCount(2)
  await page.getByTestId('version-restore').click() // the newest: what the restore replaced
  await file(FROST).toContain('A new line of mine.')
  await expect(page.locator('.cm-content')).toContainText('A new line of mine.')
})

test('the Versions panel is named and usable by keyboard, in both languages', async () => {
  const page = await start()
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  await closeSettings(page)
  await chapterVersions(page)
  await expect(page.getByTestId('versions')).toBeVisible()
  await expect(page.getByTestId('versions').locator('#versions-title')).toContainText('גרסאות קודמות')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('versions')).toBeHidden()
  expect(pageMessages.filter((message) => /Content.Security.Policy/i.test(message))).toEqual([])
})

test('scenario E: move a chapter, compile the book, and the order changed with no file renamed', async () => {
  const savedAs = join(base, 'compiled.md')
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root, PLOTDEVICE_TEST_SAVE_AS: savedAs })
  const { page } = running
  await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  const files = await readdir(join(root, 'manuscript'))
  await page.locator('[data-chapter="manuscript/frost.md"]').focus()
  await page.keyboard.press('Alt+ArrowUp') // out of Part Two, to just before it
  await expect
    .poll(async () => (await read('CONTENTS.md')).indexOf('frost.md') < (await read('CONTENTS.md')).indexOf('Part Two'))
    .toBe(true)
  await page.getByTestId('book-menu').click()
  await page.getByTestId('menu-export-book').click()
  await expect(page.getByRole('alert')).toContainText('compiled.md')
  const book = await readFile(savedAs, 'utf8')
  expect(book.split('\n').filter((line) => line.startsWith('#'))).toEqual([
    '## 1. Prologue',
    '# Part One: Arrival',
    '## 2. The Crossing',
    '## 3. The Orchard Gate',
    '## 4. Frost',
    '# Part Two: Salt',
    '## 5. Epilogue',
  ])
  expect(await readdir(join(root, 'manuscript'))).toEqual(files)
})
