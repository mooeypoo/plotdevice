import { expect, test, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, type Launched } from './launch'

// Backups of each book (Milestone 20): turning them on, the book menu's note, restoring as a copy and
// in place (and back again), and the one-time offer when leaving a book with some content.
const SAMPLE = join(import.meta.dirname, '../../../samples/the-salt-orchard')

let base = ''
let root = ''
let backups = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-backups-'))
  root = join(base, 'books', 'The Salt Orchard')
  backups = join(base, 'Dropbox')
  await cp(SAMPLE, root, { recursive: true })
  await mkdir(backups)
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root, PLOTDEVICE_TEST_BACKUP_TO: backups })
  const { page } = running
  await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  return page
}

async function bookMenu(page: Page, item: string): Promise<void> {
  await page.getByTestId('book-menu').click()
  await page.getByTestId(`menu-${item}`).click()
}

test('turn backups on, see the note, and restore a backup in place and back again', async () => {
  const page = await start()
  await bookMenu(page, 'backups')
  const dialog = page.getByTestId('backups-dialog')
  await expect(dialog.getByTestId('backups-off-note')).toBeVisible()
  await dialog.getByTestId('choose-backup-folder').click()
  await expect(dialog.getByTestId('backup-folder')).toHaveText(backups)
  await expect.poll(async () => (await readdir(backups)).filter((name) => name.endsWith('.zip'))).toHaveLength(1)
  await expect(dialog.getByTestId('cleanup-none')).toBeChecked()
  await dialog.getByTestId('backups-close').click()

  await page.getByTestId('book-menu').click()
  await expect(page.getByTestId('menu-note')).toContainText('Backed up')
  await page.keyboard.press('Escape')

  // Change a chapter outside the app's editor, then put the backup back.
  const chapter = join(root, 'manuscript', 'frost.md')
  const original = await readFile(chapter, 'utf8')
  await writeFile(chapter, original.replace(/\n[^\n]+\n?$/, '\nRewritten after the backup.\n'))
  await bookMenu(page, 'restore')
  const restore = page.getByTestId('restore-dialog')
  await restore.getByTestId('restore-entry').first().click()
  await expect(restore.getByTestId('restore-preview')).toContainText('One file is different in the book now.')
  await restore.getByTestId('restore-replace').click()
  await page.getByTestId('confirm-yes').click()
  await expect.poll(() => readFile(chapter, 'utf8')).toBe(original)
  await expect(page.locator('.notice-toast')).toContainText('The book is back to the backup')

  // The book as it was is a backup too: restoring it undoes the restore.
  await bookMenu(page, 'restore')
  const before = restore.getByTestId('restore-entry').filter({ hasText: 'before restoring' })
  await before.click()
  await restore.getByTestId('restore-replace').click()
  await page.getByTestId('confirm-yes').click()
  await expect.poll(() => readFile(chapter, 'utf8')).toContain('Rewritten after the backup.')
})

test('a backup opened as a separate copy leaves the book alone, and opens from the notice', async () => {
  const page = await start()
  await bookMenu(page, 'back-up-now')
  await expect(page.locator('.notice-toast')).toContainText('Backup saved')
  await bookMenu(page, 'restore')
  const restore = page.getByTestId('restore-dialog')
  await restore.getByTestId('restore-entry').first().click()
  await restore.getByTestId('restore-copy').click()
  await expect(page.locator('.notice-toast')).toContainText('a book of its own')
  const copies = (await readdir(join(base, 'books'))).filter((name) => name.startsWith('The Salt Orchard ('))
  expect(copies).toHaveLength(1)
  await page.getByTestId('notice-action').click()
  await expect(page.locator('.project-title')).toHaveText('The Salt Orchard')
  await page.getByTestId('book-menu').click()
  await expect(page.getByTestId('menu-note')).toContainText('No backups yet')
})

test('leaving a book with some content offers backups once; Not now never asks again', async () => {
  const page = await start()
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-open-project').click()
  const offer = page.getByTestId('backup-offer')
  await expect(offer).toBeVisible()
  await expect(offer).toContainText('Keep a copy of “The Salt Orchard” somewhere safe?')
  await expect(offer).toContainText('Backups…, in the book menu')
  await offer.getByTestId('offer-not-now').click()
  await expect(offer).toBeHidden()
  await page.locator('.project-title').waitFor()
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-open-project').click()
  await expect(offer).toBeHidden()
  await expect(page.locator('.project-title')).toHaveText('The Salt Orchard')
})

test('the sample book: tried from the start screen, never offered backups, and started over after asking', async () => {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  const { page } = running
  await page.getByTestId('try-sample').click()
  await expect(page.locator('.project-title')).toHaveText('The Salt Orchard')
  await expect(page.getByTestId('sample-badge')).toBeVisible()
  const copy = join(base, 'user-data', 'sample', 'the-salt-orchard', 'manuscript', 'frost.md')
  const original = await readFile(copy, 'utf8')
  await writeFile(copy, 'Scribbled over.\n')

  await page.getByTestId('book-menu').click()
  await page.getByTestId('menu-restart-sample').click()
  await expect(page.getByTestId('confirm')).toContainText('Your other books stay exactly as they are.')
  await page.getByTestId('confirm-yes').click()
  // Read again until the fresh copy is in place: for a moment while it's copied, the file isn't there.
  await expect.poll(() => readFile(copy, 'utf8').catch(() => '')).toBe(original)
  await expect(page.locator('.notice-toast')).toContainText('The sample is back as it first was.')

  // Leaving the sample for another book offers nothing.
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-open-project').click()
  await expect(page.getByTestId('backup-offer')).toBeHidden()
  await expect(page.locator('.project-title')).toHaveText('The Salt Orchard')
  await expect(page.getByTestId('sample-badge')).toHaveCount(0)
})
