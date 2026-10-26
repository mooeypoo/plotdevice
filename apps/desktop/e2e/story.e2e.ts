import { expect, test, type Page } from '@playwright/test'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

const FIXTURES = join(import.meta.dirname, '../../../tests/fixtures')
const MAIN = 'outlines/main-story.md'

let base = ''
let root = ''
let running: Launched | undefined
let pageMessages: string[] = []

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-story-'))
  root = join(base, 'The Salt Orchard')
  await cp(join(FIXTURES, 'projects/salt-orchard'), root, { recursive: true })
  pageMessages = []
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

/** The sample novel, opened in the app; folder dialogs "choose" it. */
async function start(): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  running.page.on('console', (message) => pageMessages.push(message.text()))
  const { page } = running
  // On a first start the welcome screen shows; after that the app reopens the project by itself.
  await page.locator('.project-title, [data-testid="open-project"]').first().waitFor()
  if (await page.getByTestId('open-project').isVisible()) await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  return page
}

async function openStory(page: Page, outline = MAIN): Promise<void> {
  await page.getByTestId('workspace-story').click()
  await page.locator(`[data-outline="${outline}"]`).click()
  await expect(page.locator('[data-outline][aria-current="page"]')).toHaveAttribute('data-outline', outline)
}

const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')
/** The file as it will be once the app's write lands: writes finish after the screen updates. */
const file = (path: string) => expect.poll(() => read(path).catch(() => ''))
const card = (page: Page, text: string) => page.locator('.outline-card', { hasText: text })
const cspViolations = (): string[] => pageMessages.filter((message) => /Content.Security.Policy/i.test(message))

async function chapterBytes(): Promise<Record<string, string>> {
  const files = await readdir(join(root, 'manuscript'))
  return Object.fromEntries(await Promise.all(files.map(async (name) => [name, await read(`manuscript/${name}`)] as const)))
}

/** Types into the in-place editor and confirms with Enter. */
async function typeInPlace(page: Page, text: string): Promise<void> {
  const input = page.getByTestId('editable-text')
  await input.fill(text)
  await input.press('Enter')
}

test('scenario B: build an outline visually, see it three ways, and find it all in the file', async () => {
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.getByTestId('new-outline').click()
  await page.getByTestId('prompt-input').fill('Character arcs')
  await page.getByTestId('prompt-input').press('Enter')
  await expect(page.locator('.outline-title')).toHaveText('Character arcs')

  await page.getByTestId('add-section').click()
  await typeInPlace(page, 'Ilka')
  await page.getByTestId('add-card').click()
  await typeInPlace(page, 'Wants to keep the orchard')
  await page.getByTestId('editable-text').press('Escape') // adding continues, as in a list, until Escape
  await card(page, 'Wants to keep the orchard')
    .getByRole('button', { name: /Actions for/ })
    .click()
  await page.getByTestId('menu-add-detail').click()
  await page.getByTestId('prompt-input').fill('Because of her mother')
  await page.getByTestId('prompt-input').press('Enter')
  await page.getByTestId('add-section').click()
  await typeInPlace(page, 'Bea')

  await file('outlines/character-arcs.md').toBe(
    '# Character arcs\n\n## Ilka\n\n- Wants to keep the orchard\n  - Because of her mother\n\n## Bea\n',
  )
  await page.getByTestId('view-outline').click()
  await expect(page.getByTestId('list')).toContainText('Because of her mother')
  await page.getByTestId('view-cards').click()
  await expect(card(page, 'Wants to keep the orchard')).toContainText('Ilka')
  expect(cspViolations()).toEqual([])
})

test('scenario C: moving a card changes only those lines of the outline, and no chapter', async () => {
  const page = await start()
  const chapters = await chapterBytes()
  await openStory(page)

  await card(page, 'The gate').focus()
  await page.keyboard.press('Alt+ArrowRight') // to the next section
  await expect(page.locator('[data-testid="column"]').nth(1)).toContainText('The gate')
  await file(MAIN).toBe(
    '# Main story\n\n## Beginning\n\n- Ilka crosses the river, see [The Crossing](../manuscript/the-crossing.md)\n  - Bea at the landing\n\n## Ending\n\n- Back to [the crossing](../manuscript/the-crossing.md "first chapter") for the last image\n- The gate, see [The Orchard Gate](../manuscript/the-orchard-gate.md)\n',
  )
  await expect(card(page, 'The gate')).toBeFocused() // the keyboard stays with the card

  // Onto the top half of a card: the dragged card goes before it.
  await card(page, 'Ilka crosses').dragTo(card(page, 'Back to'), { targetPosition: { x: 20, y: 4 } })
  await expect(page.locator('[data-testid="column"]').nth(1).locator('.outline-card').first()).toContainText('Ilka crosses')
  await file(MAIN).toContain(
    '## Ending\n\n- Ilka crosses the river, see [The Crossing](../manuscript/the-crossing.md)\n  - Bea at the landing\n- Back to',
  )
  expect(await chapterBytes()).toEqual(chapters)

  await undo(page)
  await undo(page)
  await file(MAIN).toBe(await readFile(join(FIXTURES, 'projects/salt-orchard', MAIN), 'utf8'))
})

test('what the board can’t show is kept as written, and moves with its card', async () => {
  await cp(join(FIXTURES, 'outlines/embedded-blocks.md'), join(root, 'outlines/research.md'))
  const page = await start()
  await openStory(page, 'outlines/research.md')
  await expect(page.getByTestId('kept-as-written')).toHaveCount(5)
  await card(page, 'Salt tolerance').focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect
    .poll(async () => {
      const text = await read('outlines/research.md')
      return text.indexOf('- Census of Marrow') < text.indexOf('- Salt tolerance')
    })
    .toBe(true)
  await file('outlines/research.md').toContain('- Salt tolerance of pear trees\n  ```\n  NaCl 4 g/L: leaf burn\n  ```\n')
})

test('an outline changed in another app reloads, and undo never overwrites that change', async () => {
  const page = await start()
  await openStory(page)
  await card(page, 'The gate').focus()
  await page.keyboard.press('Alt+ArrowUp')
  await page.getByTestId('outline-menu').click()
  await expect(page.getByTestId('menu-outline-undo')).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  const theirs = '# Main story\n\n## Rewritten elsewhere\n\n- A new card from another app\n'
  await writeFile(join(root, MAIN), theirs)
  await expect(card(page, 'A new card from another app')).toBeVisible()
  await undo(page)
  await expect(page.getByRole('alert')).toContainText('changed in another app')
  await file(MAIN).toBe(theirs)
})

test('switching between Story and Write keeps the editor, the cursor and undo; the app reopens where the author was', async () => {
  let page = await start()
  await page.locator('[data-chapter="manuscript/prologue.md"]').first().click()
  await page.keyboard.press('End')
  await page.keyboard.type(' One')
  await page.evaluate(() => {
    ;(window as unknown as { editorElement: Element | null }).editorElement =
      document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelector('.cm-editor') ?? null
  })
  await openStory(page)
  await page.getByTestId('view-cards').click()
  await page.getByTestId('workspace-write').click()
  await page.keyboard.type(' Two')
  await expect(page.locator('.cm-content')).toContainText('river. One Two')
  const sameEditor = await page.evaluate(
    () =>
      (window as unknown as { editorElement: Element | null }).editorElement ===
      document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelector('.cm-editor'),
  )
  expect(sameEditor).toBe(true)
  await page.keyboard.press('Control+z')
  await expect(page.locator('.cm-content')).not.toContainText('One Two')

  await page.getByTestId('workspace-story').click()
  await running?.app.close()
  page = await start()
  await expect(page.getByTestId('cards')).toBeVisible()
  await expect(page.locator('[data-outline][aria-current="page"]')).toHaveAttribute('data-outline', MAIN)
})

test('a chapter chosen in the manuscript outline opens in Write', async () => {
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.getByTestId('show-manuscript').click()
  await page.getByTestId('manuscript-outline').getByRole('button', { name: /Frost/ }).click()
  await expect(page.getByTestId('workspace-write')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.cm-content')).toContainText('the frost came early')
})

test('in Hebrew, columns run right to left and the arrow keys follow them', async () => {
  const page = await start()
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  await closeSettings(page)
  await openStory(page)
  await card(page, 'The gate').focus()
  await page.keyboard.press('Alt+ArrowLeft') // the next section is to the left in right-to-left
  await expect(page.locator('[data-testid="column"]').nth(1)).toContainText('The gate')
  await expect(page.getByTestId('workspace-story')).toHaveText('סיפור')
})

/** Undo, from the ⋯ menu beside the outline's views. */
async function undo(page: Page): Promise<void> {
  await page.getByTestId('outline-menu').click()
  await page.getByTestId('menu-outline-undo').click()
}

/** Controls on the page without an accessible name. */
async function unnamedControls(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, select, input, summary, [role="menuitem"], [tabindex="0"]')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => !(element.getAttribute('aria-label') ?? element.closest('label')?.textContent ?? element.textContent)?.trim())
      .map((element) => element.outerHTML.slice(0, 80)),
  )
}

test('accessibility: every Story control is named in both languages, and cards can be added by keyboard alone', async () => {
  const page = await start()
  await openStory(page)
  for (const view of ['board', 'outline', 'cards']) {
    await page.getByTestId(`view-${view}`).click()
    expect(await unnamedControls(page), view).toEqual([])
  }
  await page.getByTestId('view-board').click()
  await page.getByTestId('add-card').first().focus()
  await page.keyboard.press('Enter')
  await page.keyboard.type('Added by keyboard')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await file(MAIN).toContain('- Added by keyboard\n')
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  expect(await unnamedControls(page)).toEqual([])
  expect(cspViolations()).toEqual([])
})
