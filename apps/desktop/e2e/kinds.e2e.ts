import { expect, test, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// Kinds of pages per book (Milestone 18, ADR 0011): add one, fill and link it, rename it and match its
// folder with a backup and an undo, remove it, and call chapters something else. In English and Hebrew.
const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-kinds-'))
  root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  await mkdir(join(base, 'backups'))
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(locale: 'en' | 'he'): Promise<Page> {
  running = await launch(join(base, 'user-data'), {
    PLOTDEVICE_TEST_CHOOSE_FOLDER: root,
    PLOTDEVICE_TEST_BACKUP_TO: join(base, 'backups'),
  })
  const { page } = running
  if (locale === 'he') {
    await openSettings(page)
    await page.getByTestId('language').selectOption('he')
    await closeSettings(page)
  }
  await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  return page
}

/** A file's text as the author would read it: Hebrew file names in links may be %-encoded. */
const file = (path: string) => expect.poll(() => readFile(join(root, path), 'utf8').then(decodeURI, () => ''))

async function kindsDialog(page: Page): Promise<void> {
  await page.getByTestId('book-menu').click()
  await page.getByTestId('menu-kinds').click()
  await expect(page.getByTestId('kinds-dialog')).toBeVisible()
}

async function kindMenu(page: Page, folder: string, item: string): Promise<void> {
  await page.getByTestId('kinds-dialog').locator(`[data-kind="${folder}"] .menu-button`).click()
  await page.getByTestId(`menu-${item}`).click()
}

const WORDS = {
  en: {
    one: 'Faction',
    many: 'Factions',
    folder: 'factions',
    page: 'The Merchants',
    newOne: 'Guild',
    newMany: 'Guilds',
    newFolder: 'guilds',
  },
  he: { one: 'פלג', many: 'פלגים', folder: 'פלגים', page: 'הסוחרים', newOne: 'גילדה', newMany: 'גילדות', newFolder: 'גילדות' },
} as const

for (const locale of ['en', 'he'] as const) {
  const words = WORDS[locale]

  test(`a kind of the book's own: add, link, rename, match folders, undo, remove (${locale})`, async () => {
    const page = await start(locale)
    await page.getByTestId('workspace-story').click()

    // Add the kind; its folder follows the plural.
    await page.getByTestId('new-kind').click()
    await page.getByTestId('kind-add').click()
    await page.getByTestId('kind-one').fill(words.one)
    await page.getByTestId('kind-many').fill(words.many)
    await expect(page.getByTestId('kind-folder')).toHaveValue(words.folder)
    await page.getByTestId('kind-save').click()
    await file('project.md').toContain(`  - folder: ${words.folder}\n    one: ${words.one}\n    many: ${words.many}\n`)
    await page.getByTestId('kinds-close').click()

    // A page of that kind, linked from a card.
    await page.locator(`[data-gallery="${words.folder}"]`).click()
    await page.getByTestId(`new-${words.folder}`).click()
    await page.getByTestId('prompt-input').fill(words.page)
    await page.getByTestId('prompt-input').press('Enter')
    await expect(page.getByTestId('reference-page').locator('.item-title')).toHaveText(words.page)
    await page.locator('[data-outline="outlines/main-story.md"]').click()
    const card = page.locator('.outline-card', { hasText: 'Ilka crosses the river' })
    await card.locator('.menu-button').first().click()
    await page.getByTestId('menu-link-to').click()
    await page.getByTestId('link-search').fill(words.page)
    await page.getByTestId('link-search').press('Enter')
    const pageFile = (await readdir(join(root, words.folder)))[0] ?? ''
    await file('outlines/main-story.md').toContain(`(../${words.folder}/${pageFile})`)

    // Renaming the kind changes its names only; matching the folder is offered, with a backup first.
    await kindsDialog(page)
    await kindMenu(page, words.folder, 'kind-rename')
    await page.getByTestId('kind-one').fill(words.newOne)
    await page.getByTestId('kind-many').fill(words.newMany)
    await page.getByTestId('kind-save').click()
    await file('project.md').toContain(`  - folder: ${words.folder}\n    one: ${words.newOne}\n    many: ${words.newMany}\n`)
    await page.getByTestId('match-folders').click()
    const match = page.getByTestId('match-folders-dialog')
    await expect(match.locator(`[data-rename="${words.folder}"]`)).toContainText(`${words.newFolder}/`)
    await expect(match.getByTestId('rename-folders')).toBeDisabled()
    await match.getByTestId('backup-now').click()
    await expect(match.getByTestId('backup-made')).toBeVisible()
    expect((await readdir(join(base, 'backups'))).length).toBe(1)
    await match.getByTestId('rename-folders').click()
    await file('outlines/main-story.md').toContain(`(../${words.newFolder}/${pageFile})`)
    await file('project.md').toContain(`  - folder: ${words.newFolder}\n`)
    await expect(page.getByTestId('kinds-mismatch')).toHaveCount(0)
    await page.getByTestId('kinds-close').click()

    // Undo, from the book menu, until the book closes.
    await page.getByTestId('book-menu').click()
    await page.getByTestId('menu-undo-folders').click()
    await file('outlines/main-story.md').toContain(`(../${words.folder}/${pageFile})`)
    expect(await readdir(root)).not.toContain(words.newFolder)
    await page.getByTestId('book-menu').click()
    await expect(page.getByTestId('menu-undo-folders')).toHaveCount(0)
    await page.keyboard.press('Escape')

    // Removing the kind deletes nothing: its pages are "Not sorted yet".
    await kindsDialog(page)
    await kindMenu(page, words.folder, 'kind-remove')
    await page.getByTestId('confirm-yes').click()
    await file('project.md').not.toContain(`folder: ${words.folder}`)
    await expect(page.getByTestId('kinds-dialog').locator(`[data-unsorted="${words.folder}"]`)).toBeVisible()
    await page.getByTestId('kinds-close').click()
    await expect(page.locator(`[data-gallery="${words.folder}"]`)).toBeVisible()
    expect(await readdir(join(root, words.folder))).toEqual([pageFile])
  })
}

test('a book that calls its chapters sessions', async () => {
  const page = await start('en')
  await kindsDialog(page)
  await page.getByTestId('unit-one').fill('Session')
  await page.getByTestId('unit-many').fill('Sessions')
  await page.getByTestId('unit-save').click()
  await file('project.md').toContain('manuscriptUnit:\n  one: Session\n  many: Sessions\n')
  await page.getByTestId('kinds-close').click()
  await page.getByTestId('workspace-write').click()
  await expect(page.getByTestId('new-chapter').filter({ visible: true })).toHaveText('New Session')
})
