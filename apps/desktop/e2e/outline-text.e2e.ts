import { expect, test, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, type Launched } from './launch'

// An outline's Text view (Milestone 14): its Markdown typed freely, then seen on the board and in the list.
const FIXTURES = join(import.meta.dirname, '../../../tests/fixtures')
const MAIN = 'outlines/main-story.md'

let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-outline-text-'))
  root = join(base, 'The Salt Orchard')
  await cp(join(FIXTURES, 'projects/salt-orchard'), root, { recursive: true })
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  const { page } = running
  await page.locator('.project-title, [data-testid="open-project"]').first().waitFor()
  if (await page.getByTestId('open-project').isVisible()) await page.getByTestId('open-project').click()
  await page.locator('.project-title').waitFor()
  await page.getByTestId('workspace-story').click()
  await page.locator(`[data-outline="${MAIN}"]`).click()
  return page
}

const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')
const file = (path: string) => expect.poll(() => read(path).catch(() => ''))
const card = (page: Page, text: string) => page.locator('.outline-card', { hasText: text })
const editor = (page: Page) => page.getByTestId('outline-text-editor').locator('.cm-content')

test('typed as text, Enter starts the next card and Tab makes a detail; the board shows it at once', async () => {
  const page = await start()
  await page.getByTestId('view-text').click()
  await expect(editor(page)).toBeFocused()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type('- The sale')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Bea signs at last')
  // Straight back, before the pause that saves: the board still shows what was typed.
  await page.getByTestId('view-board').click()
  await expect(card(page, 'The sale')).toContainText('Bea signs at last')
  await file(MAIN).toContain('for the last image\n- The sale\n  - Bea signs at last')
  // Nothing on the board to undo: the text's own changes were undone in the editor.
  await page.getByTestId('outline-menu').click()
  await expect(page.getByTestId('menu-outline-undo')).toBeDisabled()
})

test('Text opens on the card last focused, and going back focuses the card the cursor is on', async () => {
  const page = await start()
  await card(page, 'The gate').focus()
  await page.keyboard.press('ControlOrMeta+Shift+E')
  await expect(editor(page)).toBeFocused()
  await page.keyboard.type('Through ')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ControlOrMeta+Shift+E')
  await expect(page.getByTestId('board')).toBeVisible()
  // The cursor ended on "Bea at the landing", a detail: the board shows its card.
  await expect(card(page, 'Ilka crosses the river')).toBeFocused()
  await expect(card(page, 'Through The gate')).toBeVisible()
  await file(MAIN).toContain('- Through The gate, see [The Orchard Gate]')
})

test('@ in the text offers pages, and Enter puts in a link', async () => {
  await mkdir(join(root, 'characters'))
  await writeFile(join(root, 'characters/bea.md'), '---\ntitle: Bea Halmi\naka: [Bea]\n---\nIlka’s aunt.\n')
  const page = await start()
  await page.getByTestId('view-text').click()
  await expect(editor(page)).toBeFocused()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type('- Must meet @bea')
  await expect(page.getByTestId('item-suggestions').getByRole('option').first()).toContainText('Bea Halmi')
  await page.keyboard.press('Enter')
  await page.keyboard.type('at the landing')
  await expect(page.getByTestId('item-suggestions')).toHaveCount(0)
  await file(MAIN).toContain('- Must meet [Bea Halmi](../characters/bea.md) at the landing')
})

test('what the board will keep as written is counted, and Show selects it; the file is otherwise left as typed', async () => {
  const text = '# Main story\n\n## Beginning\n\n- A card\n\n| a | b |\n| - | - |\n| 1 | 2 |\n'
  await writeFile(join(root, MAIN), text)
  const page = await start()
  await page.getByTestId('view-text').click()
  await expect(page.getByTestId('outline-text-kept')).toContainText('One passage will show “kept as written” on the board.')
  await page.getByTestId('outline-text-show-kept').click()
  await expect(editor(page)).toBeFocused()
  await page.getByTestId('view-board').click()
  await expect(page.locator('.kept')).toHaveCount(1)
  expect(await read(MAIN)).toBe(text)
})
