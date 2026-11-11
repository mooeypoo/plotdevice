import { expect, test, type Page } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// Poems (ADR 0013, Milestone 27): a poetry collection, typing lines and stanzas, an untitled poem known
// by its first line, the niqqud picker, and the Poem switch in a novel. In Hebrew and English.
let base = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-poems-'))
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(locale: 'en' | 'he'): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: base })
  const { page } = running
  if (locale === 'he') {
    await openSettings(page)
    await page.getByTestId('language').selectOption('he')
    await closeSettings(page)
  }
  return page
}

async function create(page: Page, template: string, title: string): Promise<void> {
  await page.getByTestId('new-project').click()
  await expect(page.getByTestId('new-project-location')).toHaveText(base)
  await page.getByTestId(`template-${template}`).click()
  await page.getByTestId('new-project-title').fill(title)
  await page.getByTestId('new-project-create').click()
  await page.locator('.project-title').waitFor()
}

const file = (path: string) => expect.poll(() => readFile(join(base, path), 'utf8').catch(() => ''), { timeout: 10_000 })

test('a Hebrew poetry collection: lines and stanzas, an untitled poem named by its first line, and niqqud', async () => {
  const page = await start('he')
  await create(page, 'poetry', 'שעות מלח')

  // It opens in Write, on its one untitled poem, ready to type.
  const title = page.getByTestId('chapter-title-field')
  await expect(title).toHaveText('')
  await expect(title).toHaveAttribute('data-placeholder', 'שיר ללא שם')
  await page.locator('.cm-content').click()
  await page.keyboard.type('הערב יורד')
  await page.keyboard.press('Enter')
  await page.keyboard.type('על הפרדס')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('והים זוכר')
  await file('שעות מלח/manuscript/שיר.md').toBe(
    '---\ntitle: ""\nid: ' + (await idOf('שעות מלח/manuscript/שיר.md')) + '\nform: poem\n---\nהערב יורד\\\nעל הפרדס\n\nוהים זוכר',
  )

  // The sidebar and the page call it by its first line, in italics, as it is typed.
  const row = page.getByTestId('navigator').locator('.chapter .untitled')
  await expect(row).toHaveText('הערב יורד')
  await expect(title).toHaveText('')

  // Niqqud: after the ה of הערב, a qamats from the picker (Ctrl+Shift+N).
  await page.locator('.cm-line').first().click()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowLeft') // right to left: Left moves forward, past the ה
  await page.keyboard.press('Control+Shift+N')
  await expect(page.getByTestId('niqqud-letter')).toHaveText('ה')
  await page.getByTestId('niqqud-qamats').click()
  await expect(page.getByTestId('niqqud-letter')).toHaveText('הָ')
  await expect(page.getByTestId('niqqud-qamats')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('niqqud-panel')).toHaveCount(0)
  await file('שעות מלח/manuscript/שיר.md').toContain('הָערב יורד\\\n')

  // Sections, not parts.
  await expect(page.getByTestId('new-part')).toHaveText('אסופה חדשה')
})

test('a Hebrew collection in an English interface: the empty poem speaks the book’s language and fits the page', async () => {
  const page = await start('en')
  await page.getByTestId('new-project').click()
  await page.getByTestId('template-poetry').click()
  await page.getByTestId('new-project-language').selectOption('he')
  await page.getByTestId('new-project-title').fill('שעות מלח')
  await page.getByTestId('new-project-create').click()
  await page.locator('.project-title').waitFor()

  await expect(page.getByTestId('chapter-title-field')).toHaveAttribute('data-placeholder', 'שיר ללא שם')
  await expect(page.getByTestId('navigator').locator('.chapter .untitled')).toHaveText('שיר ללא שם')
  await expect(page.locator('.cm-placeholder')).toHaveText('כאן מתחילים לכתוב.')
  // The interface's buttons and questions are in English; the page above the text is the book's.
  await expect(page.getByTestId('new-chapter').filter({ visible: true })).toHaveText('New poem')
  await expect(page.getByTestId('new-part')).toHaveText('New section')
  await expect(page.locator('.chapter-eyebrow')).toHaveText('שיר 1')
  await page.getByTestId('new-part').click()
  await expect(page.getByTestId('prompt-input')).toHaveAccessibleName('Section name')
  await page.keyboard.press('Escape')
  // The poem's hanging indent must not push the hint past the page: no sideways scrolling.
  const scroller = page.locator('.cm-scroller')
  expect(await scroller.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)

  // A long first line names the poem in the sidebar in two lines at most.
  await page.locator('.cm-content').click()
  await page.keyboard.type('שורה ארוכה מאוד '.repeat(12))
  const row = page.getByTestId('navigator').locator('.chapter .untitled')
  await expect(row).toContainText('שורה ארוכה')
  const lineHeight = await row.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight))
  expect((await row.boundingBox())?.height ?? 0).toBeLessThanOrEqual(lineHeight * 2 + 1)
  expect(await scroller.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)
})

test('the Poem switch makes one chapter of a novel a poem, and back, without changing its words', async () => {
  const page = await start('en')
  await create(page, 'short-story', 'Salt')
  await page.locator('.cm-content').click()
  await page.keyboard.type('One line')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('and another')
  await file('Salt/manuscript/salt.md').toContain('One line\\\nand another')

  await page.getByTestId('format-menu').click()
  await expect(page.getByTestId('menu-poem')).toHaveAttribute('aria-checked', 'false')
  await page.getByTestId('menu-poem').click()
  await file('Salt/manuscript/salt.md').toContain('form: poem\n---\nOne line\\\nand another')
  await expect(page.getByTestId('chapter-form')).toHaveText('Poem')

  // In a poem, Enter is a new line.
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('a third')
  await file('Salt/manuscript/salt.md').toContain('One line\\\nand another\\\na third')

  await page.getByTestId('format-menu').click()
  await expect(page.getByTestId('menu-poem')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('menu-poem').click()
  await file('Salt/manuscript/salt.md').not.toContain('form:')
  await file('Salt/manuscript/salt.md').toContain('One line\\\nand another\\\na third')
  await expect(page.getByTestId('chapter-form')).toHaveCount(0)
})

async function idOf(path: string): Promise<string> {
  const text = await readFile(join(base, path), 'utf8')
  return /\nid: (.*)\n/.exec(text)?.[1] ?? ''
}
