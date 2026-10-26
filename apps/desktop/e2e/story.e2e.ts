import { expect, test, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
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

test('scenario B: build an outline visually, see it both ways, and find it all in the file', async () => {
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
  // Typed in place inside the card, like everywhere else, with @ to link.
  await expect(card(page, 'Wants to keep the orchard').locator('.card-new-detail .cm-placeholder')).toHaveText(
    'New detail of “Wants to keep the orchard”',
  )
  await page.keyboard.type('Because of her mother')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.getByTestId('add-section').click()
  await typeInPlace(page, 'Bea')

  await file('outlines/character-arcs.md').toBe(
    '# Character arcs\n\n## Ilka\n\n- Wants to keep the orchard\n  - Because of her mother\n\n## Bea\n',
  )
  await page.getByTestId('view-outline').click()
  await expect(page.getByTestId('list')).toContainText('Because of her mother')
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
  // The menu opens at once, while the move may still be saving: the move mustn't take the keyboard back.
  await page.getByTestId('outline-menu').click()
  await expect(page.getByTestId('menu-outline-undo')).toBeEnabled()
  await file(MAIN).toContain('## Beginning\n\n- The gate, see [The Orchard Gate](../manuscript/the-orchard-gate.md)\n- Ilka crosses')
  await expect(page.getByTestId('menu-outline-undo')).toBeFocused()
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
  await page.getByTestId('view-outline').click()
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
  await expect(page.getByTestId('list')).toBeVisible()
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

test('the list: + Add card, Enter for the next line, Tab to make it a detail, Shift+Tab to bring it back', async () => {
  const page = await start()
  await openStory(page)
  await page.getByTestId('view-outline').click()
  const line = page.getByTestId('editable-text')

  await page.getByTestId('add-card').first().click()
  await line.fill('Noël waits')
  await line.press('Enter')
  await line.fill('With the bolt cutters')
  await line.press('Tab') // a detail of "Noël waits"
  await expect(page.locator('.new-line')).toHaveCSS('--depth', '1')
  await line.press('Enter')
  await line.fill('The first frost')
  await line.press('Shift+Tab') // back to a card
  await expect(page.locator('.new-line')).toHaveCSS('--depth', '0')
  await line.press('Enter')
  await line.press('Escape')
  await expect(line).toHaveCount(0)

  await file(MAIN).toContain(
    '- The gate, see [The Orchard Gate](../manuscript/the-orchard-gate.md)\n- Noël waits\n  - With the bolt cutters\n- The first frost\n\n## Ending',
  )
  // The same outline on the board.
  await page.getByTestId('view-board').click()
  await expect(card(page, 'Noël waits')).toContainText('With the bolt cutters')
})

test('the list says what level a new line is: its bullet, its name, and what Tab would do', async () => {
  const page = await start()
  await openStory(page)
  await page.getByTestId('view-outline').click()
  const line = page.locator('.new-line')

  // The quiet + beside a section's name adds an item at its end, like "+ Add item" below.
  await page.getByTestId('add-item-top').first().click()
  await expect(line).toHaveClass(/level-item/)
  await expect(line.locator('.cm-placeholder')).toHaveText('New item')
  await expect(line.locator('.line-keys')).toContainText('Enter: next item')
  await expect(line.locator('.line-keys')).toContainText('Tab: make it a detail of “The gate, see The Orchard G…”')
  await page.keyboard.press('Tab')
  await expect(line).toHaveClass(/level-detail/)
  await expect(line.locator('.cm-placeholder')).toHaveText('New detail of “The gate, see The Orchard G…”')
  await expect(line.locator('.line-keys')).toContainText('Shift+Tab: make it an item')
  await page.keyboard.type('Rusted shut')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await file(MAIN).toContain('- The gate, see [The Orchard Gate](../manuscript/the-orchard-gate.md)\n  - Rusted shut\n')
  // Items and details have their own bullets.
  await expect(page.locator('[data-item="0/1"]')).toHaveClass(/level-item/)
  await expect(page.locator('[data-item="0/1/0"]')).toHaveClass(/level-detail/)
})

test('the list: + on a row adds a detail to it, and + Add section adds a section', async () => {
  const page = await start()
  await openStory(page)
  await page.getByTestId('view-outline').click()
  const row = page.locator('[data-item="0/0"]')
  await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await row.hover()
  // The row is shaded while hovered, so "+ Detail" at its far end clearly belongs to it.
  await expect(row).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await row.getByTestId('add-detail').click()
  await page.getByTestId('editable-text').fill('Carrying one suitcase')
  await page.getByTestId('editable-text').press('Enter')
  await page.getByTestId('editable-text').press('Escape')
  await file(MAIN).toContain('  - Bea at the landing\n  - Carrying one suitcase\n- The gate')

  await page.getByTestId('add-section').click()
  await typeInPlace(page, 'Middle')
  await file(MAIN).toContain('## Middle')
  await expect(page.getByTestId('list').locator('h3', { hasText: 'Middle' })).toBeVisible()
})

test('Story has two groups: Plot holds the outlines, World shows each kind of page as cards, A to Z', async () => {
  await mkdir(join(root, 'characters'))
  // File names in the opposite order to the titles, so the order shown must come from the titles.
  await writeFile(join(root, 'characters/a.md'), '---\ntitle: Noël Arany\naka: [Noël]\n---\nKeeps the keys.\n')
  await writeFile(join(root, 'characters/b.md'), '---\ntitle: Ilka Varga\n---\nInherits the orchard.\n')
  await writeFile(join(root, 'characters/c.md'), '---\ntitle: Bea Halmi\n---\nWaits at the landing.\n')
  const page = await start()
  await openStory(page)
  await expect(page.getByTestId('plot')).toContainText('Main story')
  await expect(page.getByTestId('view-board')).toBeVisible()
  await expect(page.locator('[data-testid^="view-"]')).toHaveCount(2) // Board and List; Cards is gone

  await expect(page.locator('[data-gallery="character"] .count')).toHaveText('3')
  await page.locator('[data-gallery="character"]').click()
  await expect(page.getByTestId('view-board')).toHaveCount(0) // the views belong to outlines only
  await expect(page.locator('.page-card-title')).toHaveText(['Bea Halmi', 'Ilka Varga', 'Noël Arany'])
  await expect(page.locator('[data-page="characters/a.md"]')).toContainText('Keeps the keys.')

  await page.locator('[data-page="characters/c.md"]').click()
  await expect(page.getByTestId('reference-page').locator('.outline-title')).toHaveText('Bea Halmi')
  await expect(page.locator('[data-gallery="character"]').locator('..')).toHaveClass(/current/)
  await page.getByTestId('back-to-gallery').click()
  await expect(page.getByTestId('gallery-character')).toBeVisible()
})

test('editing a card: links show as names, and @ or the link button adds one without writing Markdown', async () => {
  await mkdir(join(root, 'characters'))
  await writeFile(join(root, 'characters/bea.md'), '---\ntitle: Bea Halmi\naka: [Bea]\n---\nIlka’s aunt.\n')
  const page = await start()
  await openStory(page)
  await page.getByTestId('view-outline').click()
  await expect(page.getByTestId('add-card').first()).toHaveText('Add item')

  // Editing an item that has a link: the link is a name, not Markdown.
  await page.locator('[data-item="0/0"] .inline-text').dblclick()
  const field = page.getByTestId('editable-text')
  await expect(field.locator('.cm-link-chip')).toHaveText('The Crossing')
  await expect(field).not.toContainText('](')
  await page.keyboard.press('Escape')

  // A new item: type @ and part of a name, pick it with Enter, go on typing.
  await page.getByTestId('add-card').first().click()
  await expect(field).toBeFocused()
  await page.keyboard.type('Must meet @bea')
  await expect(page.getByTestId('item-suggestions').getByRole('option').first()).toContainText('Bea Halmi')
  await page.keyboard.press('Enter')
  await page.keyboard.type('at the landing')
  await expect(field.locator('.cm-link-chip')).toHaveText('Bea Halmi')
  await page.keyboard.press('Enter')
  await file(MAIN).toContain('- Must meet [Bea Halmi](../characters/bea.md) at the landing\n')

  // The link button does the same, for anyone who doesn't know @.
  await page.keyboard.type('Frost comes for ')
  await page.getByTestId('item-link').click()
  await page.getByTestId('link-search').fill('frost')
  await page.getByTestId('link-search').press('Enter')
  await expect(field).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape') // at once, while the line is still being kept: no next line opens
  await file(MAIN).toContain('- Frost comes for [Frost](../manuscript/frost.md)\n')
  await expect(field).toHaveCount(0)

  // An email address is not a link.
  await page.getByTestId('add-card').first().click()
  await expect(field).toBeFocused()
  await page.keyboard.type('Write to ilka@marrow')
  await expect(page.getByTestId('item-suggestions')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await file(MAIN).toContain('- Write to ilka@marrow\n')
})

test('a row’s menu opens in full and on top, wherever the row is: under the title bar, or low in the window', async () => {
  const page = await start()
  await page.setViewportSize({ width: 1100, height: 560 })
  await openStory(page)
  await page.getByTestId('view-outline').click()
  /** The whole menu is in the window, and on top: near its corners is the menu itself, not the bar or the page. */
  const inWindow = async (): Promise<boolean> =>
    page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]')
      const box = menu?.getBoundingClientRect()
      if (!menu || !box || box.top < 0 || box.bottom > window.innerHeight) return false
      // Inside the rounded corners.
      const corners = [
        [box.left + 20, box.top + 20],
        [box.right - 20, box.bottom - 20],
      ] as const
      return corners.every(([x, y]) => menu.contains(document.elementFromPoint(x, y)))
    })

  // The first row, just under the outline's title and views: the menu opens below it, in full.
  const first = page.locator('[data-item="0/0"]')
  await first.hover()
  await first.getByRole('button', { name: /^Actions for/ }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  expect(await inWindow()).toBe(true)
  await page.keyboard.press('Escape')

  // The last row, low in the window: the menu opens above it, over the bar if need be, never behind it.
  const last = page.locator('.list-row[data-item]').last()
  await last.scrollIntoViewIfNeeded()
  await last.hover()
  await last.getByRole('button', { name: /^Actions for/ }).click()
  const menu = await page.getByRole('menu').boundingBox()
  const row = await last.boundingBox()
  expect(await inWindow()).toBe(true)
  expect(menu && row && menu.y + menu.height <= row.y + row.height).toBe(true)
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
  for (const view of ['board', 'outline']) {
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
