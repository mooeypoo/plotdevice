import { expect, test, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, openSettings, type Launched } from './launch'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let root = ''
let running: Launched | undefined
let pageMessages: string[] = []

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-refs-'))
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
  await page.locator('.project-title, [data-testid="open-project"]').first().waitFor()
  if (await page.getByTestId('open-project').isVisible()) await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  return page
}

const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')
const file = (path: string) => expect.poll(() => read(path).catch(() => ''))
const cspViolations = (): string[] => pageMessages.filter((message) => /Content.Security.Policy/i.test(message))

/** Every file's text, to prove what an action did and did not change. */
async function snapshot(): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) files[join(entry.parentPath, entry.name).slice(root.length + 1)] = await readFile(join(entry.parentPath, entry.name), 'utf8')
  }
  return files
}

async function newPage(page: Page, kind: 'character' | 'place' | 'note', title: string): Promise<void> {
  await page.getByTestId(`new-${kind}`).click()
  await page.getByTestId('prompt-input').fill(title)
  await page.getByTestId('prompt-input').press('Enter')
  await expect(page.getByTestId('reference-page').locator('.outline-title')).toHaveText(title)
}

test('scenario D: link a card to a character and a chapter, and consult them while writing', async () => {
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await newPage(page, 'character', 'Ilka Varga')
  await page.getByTestId('page-editor').locator('.cm-content').click()
  await page.keyboard.type('Inherits the orchard; distrusts everyone in Marrow.')
  await expect(page.getByTestId('page-save-status')).toHaveText('Saved')

  await page.locator('[data-outline="outlines/main-story.md"]').click()
  const card = page.locator('.outline-card', { hasText: 'Ilka crosses the river' })
  await card.getByRole('button', { name: /^Actions for/ }).click()
  await page.getByTestId('menu-link-to').click()
  await page.getByTestId('link-search').fill('ilka')
  await page.getByTestId('link-search').press('Enter')
  await file('outlines/main-story.md').toContain('- Ilka crosses the river, see [The Crossing](../manuscript/the-crossing.md) [Ilka Varga](../characters/ilka-varga.md)\n')

  // The card's chapter link opens it in Write.
  await card.getByRole('button', { name: 'The Crossing', exact: true }).click()
  await expect(page.getByTestId('workspace-write')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.cm-line', { hasText: 'knees' }).click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Her hands were cold.')
  await expect(page.getByTestId('save-status')).toHaveText('Saved')
  const before = await snapshot()

  await page.keyboard.press('Control+Shift+R')
  const fromOutline = page.getByTestId('from-outline')
  await expect(fromOutline).toContainText('Ilka crosses the river')
  await fromOutline.getByRole('button', { name: 'Ilka Varga' }).click()
  await expect(page.locator('[data-shelf-card="characters/ilka-varga.md"]')).toContainText('distrusts everyone in Marrow')

  // Back to the page: the cursor is where it was, and undo still knows the typing.
  await page.locator('.cm-content').focus()
  await page.keyboard.type(' And afraid.')
  await expect(page.locator('.cm-content')).toContainText('Her hands were cold. And afraid.')
  await page.keyboard.press('Control+z')
  await expect(page.locator('.cm-content')).not.toContainText('And afraid.')
  await expect(page.getByTestId('save-status')).toHaveText('Saved')
  expect(await snapshot()).toEqual(before) // consulting references changed no file
  expect(cspViolations()).toEqual([])
})

test('"Link to…" shows a few of each kind before anything is typed, and picks one by keyboard', async () => {
  await mkdir(join(root, 'characters'))
  await mkdir(join(root, 'places'))
  for (const name of ['Zed', 'Ilka', 'Bea', 'Noël', 'Marta', 'Ada']) await writeFile(join(root, `characters/${name.toLowerCase()}.md`), `---\ntitle: ${name}\n---\n`)
  await writeFile(join(root, 'places/marrow.md'), '---\ntitle: Marrow\n---\n')
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-outline="outlines/main-story.md"]').click()
  await page.locator('.outline-card', { hasText: 'The gate' }).getByRole('button', { name: /^Actions for/ }).click()
  await page.getByTestId('menu-link-to').click()

  await expect(page.getByTestId('link-group-chapter').getByRole('option')).toHaveText(['Prologue', 'The Crossing', 'The Orchard Gate', 'Frost', 'Epilogue'])
  await expect(page.getByTestId('link-group-character').getByRole('option')).toHaveText(['Ada', 'Bea', 'Ilka', 'Marta', 'Noël'])
  await expect(page.getByTestId('link-group-place').getByRole('option')).toHaveText(['Marrow'])
  await page.screenshot({ path: test.info().outputPath('link-picker.png') })

  // Down through the five chapters to the first character, without typing.
  for (let i = 0; i < 5; i++) await page.getByTestId('link-search').press('ArrowDown')
  await page.getByTestId('link-search').press('Enter')
  await file('outlines/main-story.md').toContain('- The gate, see [The Orchard Gate](../manuscript/the-orchard-gate.md) [Ada](../characters/ada.md)\n')
})

test('pinned pages keep their order, set by keyboard, after a restart', async () => {
  await mkdir(join(root, 'places'))
  await writeFile(join(root, 'places/marrow.md'), '---\ntitle: Marrow\n---\nWhere the orchard is.\n')
  let page = await start()
  await page.getByTestId('toggle-shelf').click()
  for (const query of ['loose', 'marrow']) {
    await page.getByTestId('shelf-search').fill(query)
    await page.getByTestId('shelf-search').press('Enter')
  }
  for (const title of ['Loose ideas', 'Marrow']) {
    await page.locator('.shelf-card', { hasText: title }).getByRole('button', { name: /^Actions for/ }).click()
    await page.getByTestId('menu-pin').click()
  }
  await page.locator('[data-shelf-card="places/marrow.md"]').focus()
  await page.keyboard.press('Alt+ArrowUp')
  await expect(page.locator('.shelf-card').first()).toContainText('Marrow')

  await running?.app.close()
  page = await start()
  await page.getByTestId('toggle-shelf').click()
  await expect(page.locator('.shelf-card')).toHaveText([/Marrow/, /Loose ideas/])
})

test('search finds pages by other names, in Hebrew too, ignoring niqqud', async () => {
  await mkdir(join(root, 'characters'))
  await writeFile(join(root, 'characters/yael.md'), '---\ntitle: יַעֵל\naka: [Yael]\n---\nאחותה של בּאה.\n')
  const page = await start()
  await page.getByTestId('toggle-shelf').click()
  for (const query of ['יעל', 'yael']) {
    await page.getByTestId('shelf-search').fill(query)
    await expect(page.getByTestId('shelf-results')).toContainText('יַעֵל')
  }
})

test('a page changed in another app while being edited offers the same choices as a chapter', async () => {
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await newPage(page, 'place', 'Marrow')
  await page.getByTestId('page-editor').locator('.cm-content').click()
  await page.keyboard.type('Mine.')
  await writeFile(join(root, 'places/marrow.md'), '---\ntitle: Marrow\n---\nChanged in another app.\n')
  await page.getByTestId('conflict-dialog').waitFor()
  await page.getByTestId('conflict-keep-both').click()
  await file('places/marrow.md').toBe('---\ntitle: Marrow\n---\nChanged in another app.\n')
  await file('places/marrow-my-version.md').toBe('---\ntitle: Marrow (my version)\n---\nMine.')
})

/** Controls on the page without an accessible name. */
async function unnamedControls(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, select, input, summary, [role="menuitem"], [role="option"], [tabindex="0"]')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => !(element.getAttribute('aria-label') ?? element.closest('label')?.textContent ?? element.textContent)?.trim())
      .map((element) => element.outerHTML.slice(0, 80)),
  )
}

test('accessibility: the shelf and pages are named in both languages and work by keyboard', async () => {
  const page = await start()
  await page.keyboard.press('Control+Shift+R')
  await page.getByTestId('shelf-search').focus()
  await page.keyboard.type('loose')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-shelf-card="notes/loose-ideas.md"]')).toBeFocused()
  expect(await unnamedControls(page)).toEqual([])
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-page="notes/loose-ideas.md"]').click()
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  expect(await unnamedControls(page)).toEqual([])
  expect(cspViolations()).toEqual([])
})
