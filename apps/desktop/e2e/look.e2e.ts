import { expect, test, type Locator, type Page } from '@playwright/test'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// Milestone 9: the app's own menus, the formatting bubble, and right-to-left in the new layout.
let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-look-'))
  root = join(base, 'the-salt-orchard')
  await cp(join(import.meta.dirname, '../../../samples/the-salt-orchard'), root, { recursive: true })
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(): Promise<Launched> {
  running = await launch(join(base, 'user-data'), {}, [root])
  await running.page.locator('.cm-content').waitFor()
  return running
}

test('there is no File, Edit, View or Window bar: on Linux and Windows the menu only keeps its shortcuts', async () => {
  const { app } = await start()
  const menu = await app.evaluate(({ BrowserWindow, Menu }) => ({
    visible: BrowserWindow.getAllWindows()[0]?.isMenuBarVisible(),
    labels: Menu.getApplicationMenu()?.items.map((item) => item.label) ?? [],
    platform: process.platform,
  }))
  test.skip(menu.platform === 'darwin', 'macOS always shows its menu bar')
  expect(menu.visible).toBe(false)
  expect(menu.labels).toEqual(['View'])
})

test('the book menu and the app menu work by keyboard, and close on Escape or a click outside', async () => {
  const { page } = await start()
  const book = page.getByTestId('book-menu')
  await book.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('menu-export-book')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('menu-chapter-versions')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(book).toBeFocused()

  await page.getByTestId('app-menu').click()
  await expect(page.getByTestId('menu-settings')).toBeVisible()
  await page.locator('.cm-content').click()
  await expect(page.getByRole('menu')).toHaveCount(0)
})

test('selecting text offers formatting beside it, and Bold bolds the selection', async () => {
  const { page } = await start()
  await page.locator('[data-chapter="manuscript/frost.md"]').first().click()
  const bubble = page.getByTestId('format-bubble')
  await expect(bubble).toBeHidden()
  await page.locator('.cm-line', { hasText: 'Early for whom' }).click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await expect(bubble).toBeVisible()
  await bubble.getByTestId('bubble-bold').click()
  await expect.poll(() => readFile(join(root, 'manuscript/frost.md'), 'utf8')).toContain('**"Early for whom?" Ilka asked.**')
  await page.keyboard.press('ArrowRight') // nothing selected: the bubble goes
  await expect(bubble).toBeHidden()
})

test('in Hebrew the top bar and the chapter list mirror, with the open chapter’s thread on the right', async () => {
  const { page } = await start()
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  await closeSettings(page)
  const at = async (testid: string) => (await page.getByTestId(testid).boundingBox())?.x ?? NaN
  expect(await at('book-menu')).toBeGreaterThan(await at('app-menu'))
  const thread = await page
    .locator('.chapter-row.current')
    .evaluate((row) => ({ left: getComputedStyle(row, '::before').left, right: getComputedStyle(row, '::before').right }))
  // Measured from each side of the row: on the right, the thread is far from the left edge.
  expect(parseFloat(thread.right)).toBeLessThan(0)
  expect(parseFloat(thread.left)).toBeGreaterThan(100)
})

/** Drags `source` to a point inside `target` (a fraction of its height down), showing the drop line on the way. */
async function dragBy(page: Page, source: Locator, target: Locator, fraction: number): Promise<void> {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('nothing to drag')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * fraction, { steps: 8 })
}

test('a card dragged on the board shows where it will land, and lands there', async () => {
  const { page } = await start()
  await page.getByTestId('workspace-story').click()
  const card = (text: string) => page.locator('.outline-card', { hasText: text })
  await dragBy(page, card('Ilka inherits'), card('The gate is chained'), 0.75)
  await expect(card('The gate is chained')).toHaveClass(/drop-after/)
  await page.mouse.up()
  await expect
    .poll(async () => {
      const text = await readFile(join(root, 'outlines/main-story.md'), 'utf8')
      return text.indexOf('- The gate is chained') < text.indexOf('- Ilka inherits')
    })
    .toBe(true)
  await expect(page.locator('.drop-before, .drop-after')).toHaveCount(0)
})

test('a chapter dragged in the chapter list shows where it will land, and the book’s order changes', async () => {
  const { page } = await start()
  const row = (file: string) => page.locator(`.chapter-row:has([data-chapter="manuscript/${file}.md"])`).first()
  await dragBy(page, row('epilogue'), row('frost'), 0.25)
  await expect(row('frost')).toHaveClass(/drop-before/)
  await page.mouse.up()
  await expect
    .poll(async () => {
      const contents = await readFile(join(root, 'CONTENTS.md'), 'utf8')
      return (
        contents.indexOf('epilogue.md') < contents.indexOf('frost.md') && contents.indexOf('Part Two') < contents.indexOf('epilogue.md')
      )
    })
    .toBe(true)
})

test('the references search offers pages before anything is typed, characters first', async () => {
  const { page } = await start()
  await page.getByTestId('toggle-shelf').click()
  await page.getByTestId('shelf-search').focus()
  const results = page.getByTestId('shelf-results')
  await expect(results).toBeVisible()
  await expect(results.locator('li').first()).toContainText('Character')
  await results.getByRole('button', { name: /Bea Halmi/ }).click()
  await expect(page.locator('.shelf-card', { hasText: 'Bea Halmi' })).toBeVisible()
  await expect(results).toBeHidden()
})

test('a menu near the window’s edge opens towards the inside, so none of it is cut off', async () => {
  const { page } = await start()
  await page.getByTestId('toggle-shelf').click()
  await page.getByTestId('shelf-search').fill('Bea')
  await page.getByTestId('shelf-search').press('Enter')
  await page
    .locator('.shelf-card')
    .getByRole('button', { name: /^Actions for/ })
    .click()
  const box = await page.getByRole('menu').boundingBox()
  const width = await page.evaluate(() => window.innerWidth)
  expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true)
})

test('About credits the author and links to the documentation; formatting commands have icons', async () => {
  const { page } = await start()
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-about').click()
  await expect(page.getByTestId('about-author').getByRole('link', { name: 'Moriel Schottlender' })).toHaveAttribute(
    'href',
    'https://moriel.tech',
  )
  await expect(page.getByTestId('about-documentation')).toHaveAttribute('href', 'https://mooeypoo.github.io/plotdevice/')
  await page.keyboard.press('Escape')
  await page.getByTestId('format-menu').click()
  await expect(page.getByTestId('menu-format-bulletList').locator('svg')).toHaveCount(1)
})

test('a reference card’s details show as formatted text, not Markdown', async () => {
  const { page } = await start()
  await page.getByTestId('toggle-shelf').click()
  await page.getByTestId('shelf-search').fill('Bea')
  await page.getByTestId('shelf-search').press('Enter')
  const card = page.locator('.shelf-card', { hasText: 'Bea Halmi' })
  await card.getByText('Details').click()
  await expect(card.locator('.page-details h3', { hasText: 'Habits' })).toBeVisible()
  await expect(card.locator('.page-details .inline-link', { hasText: 'Ilka' })).toBeVisible()
  await expect(card.locator('.page-details')).not.toContainText('##')
  await expect(card.locator('.page-details')).not.toContainText('](')
})
