import { expect, test, type Page } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// Renaming a chapter on the page (Milestone 28): click the title, type, Enter. Esc puts the old name
// back; clicking away saves; only a poem can be left untitled.
let base = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-title-'))
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function create(template: string, title: string, locale: 'en' | 'he' = 'en'): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: base })
  const { page } = running
  if (locale === 'he') {
    await openSettings(page)
    await page.getByTestId('language').selectOption('he')
    await closeSettings(page)
  }
  await page.getByTestId('new-project').click()
  await page.getByTestId(`template-${template}`).click()
  await page.getByTestId('new-project-title').fill(title)
  await page.getByTestId('new-project-create').click()
  await page.locator('.project-title').waitFor()
  return page
}

const file = (path: string) => expect.poll(() => readFile(join(base, path), 'utf8').catch(() => ''), { timeout: 10_000 })

/** Clicks the title and replaces what it says, without pressing anything after. */
async function retype(page: Page, text: string): Promise<void> {
  const title = page.getByTestId('chapter-title-field')
  await title.click()
  await page.keyboard.press('ControlOrMeta+A')
  if (text === '') await page.keyboard.press('Backspace')
  else await page.keyboard.insertText(text)
}

test('click the title, type a new one, Enter: the chapter and the contents are renamed, and the cursor goes on into the text', async () => {
  const page = await create('short-story', 'Salt')
  const title = page.getByTestId('chapter-title-field')
  await expect(title).toHaveText('Salt')
  await expect(title).toHaveAccessibleName('Title')

  await retype(page, 'The Crossing')
  await page.keyboard.press('Enter')
  await file('Salt/manuscript/salt.md').toContain('title: The Crossing\n')
  await file('Salt/CONTENTS.md').toContain('[The Crossing](manuscript/salt.md)')
  await expect(page.getByTestId('navigator')).toContainText('The Crossing')
  await expect(page.locator('.cm-editor')).toHaveClass(/cm-focused/)

  // Typing goes into the text, not the title.
  await page.keyboard.type('The ferry left.')
  await file('Salt/manuscript/salt.md').toContain('The ferry left.')
  await expect(title).toHaveText('The Crossing')
})

test('Esc puts the old name back; clicking away saves; a chapter can’t be left without a name; line breaks become spaces', async () => {
  const page = await create('short-story', 'Salt')
  const title = page.getByTestId('chapter-title-field')

  await retype(page, 'Never mind')
  await page.keyboard.press('Escape')
  await expect(title).toHaveText('Salt')
  await file('Salt/manuscript/salt.md').toContain('title: Salt\n')

  await retype(page, 'Low Tide')
  await page.locator('.cm-content').click()
  await file('Salt/manuscript/salt.md').toContain('title: Low Tide\n')

  await retype(page, '')
  await page.keyboard.press('Enter')
  await expect(title).toHaveText('Low Tide')
  await file('Salt/manuscript/salt.md').toContain('title: Low Tide\n')

  await retype(page, 'Two\nlines')
  await page.keyboard.press('Enter')
  await file('Salt/manuscript/salt.md').toContain('title: Two lines\n')
  await expect(title).toHaveText('Two lines')
})

test('a Hebrew poem: given a title on the page, then emptied again, it is untitled', async () => {
  const page = await create('poetry', 'שעות מלח', 'he')
  const title = page.getByTestId('chapter-title-field')
  await expect(title).toHaveAttribute('data-placeholder', 'שיר ללא שם')
  await expect(title).toHaveAccessibleName('שם')

  await retype(page, 'עֶרֶב בַּפַּרְדֵּס')
  await page.keyboard.press('Enter')
  // An untitled poem's `title: ""` keeps its quotes when filled in: the line is changed, not restyled.
  await file('שעות מלח/manuscript/שיר.md').toContain('title: "עֶרֶב בַּפַּרְדֵּס"\n')
  await expect(page.getByTestId('navigator')).toContainText('עֶרֶב בַּפַּרְדֵּס')

  await retype(page, '')
  await page.keyboard.press('Enter')
  await file('שעות מלח/manuscript/שיר.md').toContain('title: ""\n')
  await expect(title).toHaveText('')
  await expect(page.getByTestId('navigator').locator('.chapter .untitled')).toHaveText('שיר ללא שם')
})
