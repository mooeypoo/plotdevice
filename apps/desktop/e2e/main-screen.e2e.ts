import { expect, test, type Page } from '@playwright/test'
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// The main screen, tightened (Milestone 17): one sidebar, one header row, one top bar in Write and
// Story; Format on the page; collapse and Focus; empty and long books; narrow windows.
const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-main-screen-'))
  root = join(base, 'The Salt Orchard')
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(locale: 'en' | 'he' = 'en'): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  const { page } = running
  if (locale === 'he') {
    await openSettings(page)
    await page.getByTestId('language').selectOption('he')
    await closeSettings(page)
  }
  return page
}

async function openSample(locale: 'en' | 'he' = 'en'): Promise<Page> {
  await cp(FIXTURE, root, { recursive: true })
  const page = await start(locale)
  await page.getByTestId('open-project').click()
  await page.locator('.cm-content').first().waitFor()
  return page
}

const sidebar = (page: Page) => page.locator('nav.navigator').filter({ visible: true })
const visible = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true })

for (const locale of ['en', 'he'] as const) {
  test(`one sidebar, one header row and one top bar in Write and Story (${locale})`, async () => {
    const page = await openSample(locale)
    const write = await sidebar(page).boundingBox()
    await expect(visible(page, 'save-status')).toBeVisible()
    await expect(visible(page, 'item-header')).toBeVisible()

    await page.getByTestId('workspace-story').click()
    const story = await sidebar(page).boundingBox()
    expect(story?.x).toBe(write?.x)
    expect(story?.width).toBe(write?.width)
    // The same bar: the save status and Aa stay where they were.
    await expect(visible(page, 'save-status')).toBeVisible()
    await expect(visible(page, 'appearance')).toBeVisible()
    await expect(visible(page, 'item-header')).toBeVisible()
  })
}

test('the sidebar collapses the same way in both workspaces, by button and by Ctrl+\\', async () => {
  const page = await openSample()
  await visible(page, 'toggle-navigator').click()
  await expect(sidebar(page)).toHaveCount(0)
  await page.getByTestId('workspace-story').click()
  await expect(sidebar(page)).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+Backslash')
  await expect(sidebar(page)).toHaveCount(1)
  await page.getByTestId('workspace-write').click()
  await expect(sidebar(page)).toHaveCount(1)
})

test('Focus puts the sidebar and the shelf away and keeps the top bar; leaving brings both back', async () => {
  const page = await openSample()
  await visible(page, 'toggle-shelf').click()
  await expect(page.getByTestId('shelf')).toBeVisible()
  await page.keyboard.press('ControlOrMeta+Shift+F')
  await expect(sidebar(page)).toHaveCount(0)
  await expect(page.getByTestId('shelf')).toHaveCount(0)
  await expect(page.locator('.top-bar')).toHaveClass(/quiet/)
  await page.getByTestId('leave-focus').click()
  await expect(sidebar(page)).toHaveCount(1)
  await expect(page.getByTestId('shelf')).toBeVisible()
})

test('Format sits on every page to write on, and nowhere else', async () => {
  const page = await openSample()
  // A chapter: Format opens by keyboard, with what the ¶ menu had.
  await visible(page, 'format-menu').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('menu-format-heading2')).toBeVisible()
  await expect(page.getByTestId('menu-plain-text-edit')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByTestId('workspace-story').click()
  await page.locator('[data-outline="outlines/main-story.md"]').click()
  await expect(visible(page, 'format-menu')).toHaveCount(0) // the board
  await page.getByTestId('view-text').click()
  await expect(page.getByTestId('outline-text').getByTestId('format-menu')).toBeVisible()
  await page.getByTestId('view-board').click()
  await page.locator('[data-gallery="notes"]').click()
  await expect(visible(page, 'format-menu')).toHaveCount(0) // the gallery
  await page.locator('[data-page="notes/loose-ideas.md"]').click()
  await expect(page.getByTestId('reference-page').getByTestId('format-menu')).toBeVisible()
})

test('References shows its word in a wide window and only its icon in a narrow one, named in both', async () => {
  const page = await openSample()
  await page.setViewportSize({ width: 1280, height: 720 })
  const references = visible(page, 'toggle-shelf')
  await expect(references.locator('.tool-label')).toBeVisible()
  await page.setViewportSize({ width: 960, height: 600 })
  await expect(references.locator('.tool-label')).toBeHidden()
  await expect(references).toHaveAccessibleName('References')
  await expect(visible(page, 'format-menu')).toContainText('Format')
})

test('a card’s ⋯ shows on hover or keyboard focus; right-click and Shift+F10 open its menu', async () => {
  const page = await openSample()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-outline="outlines/main-story.md"]').click()
  const card = page.locator('.outline-card').first()
  const menu = card.locator(':scope > .card-head .menu-button')
  await expect(menu).toHaveCSS('opacity', '0')
  await card.hover()
  await expect(menu).toHaveCSS('opacity', '1')
  await page.mouse.move(0, 0)
  await card.click({ button: 'right' })
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await card.focus()
  await page.keyboard.press('Shift+F10')
  await expect(page.getByRole('menu')).toBeVisible()
})

test('a new book: the first chapter says where to start, and Story and World each offer one next step', async () => {
  // The folder dialog "chooses" the folder the new book goes in.
  root = base
  const page = await start()
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-title').fill('A New Book')
  await page.getByTestId('new-project-create').click()
  await page.getByTestId('navigator').waitFor()
  // No chapter yet: one next step; then the empty page says where to start.
  await expect(page.getByTestId('no-chapter')).toContainText('No chapters yet')
  await page.getByTestId('no-chapter').getByRole('button', { name: 'New chapter' }).click()
  await page.getByTestId('prompt-input').fill('One')
  await page.getByTestId('prompt-input').press('Enter')
  await expect(page.locator('.cm-placeholder')).toHaveText('Start writing here.')

  await page.getByTestId('workspace-story').click()
  await expect(page.getByTestId('no-outline')).toContainText('No outline yet')
  await page.getByTestId('no-outline').getByRole('button', { name: 'New outline' }).click()
  await expect(page.getByTestId('prompt-input')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.locator('[data-gallery="characters"]').click()
  await expect(page.getByTestId('no-characters')).toContainText('No characters yet')
  await page.getByTestId('new-characters').click()
  await expect(page.getByTestId('prompt-input')).toBeVisible()
})

test('a long book: parts fold to their count, the open chapter’s part stays open, and folds are remembered', async () => {
  await cp(FIXTURE, root, { recursive: true })
  // Sixty chapters in six parts.
  const parts: string[] = []
  for (let p = 0; p < 6; p++) {
    const lines: string[] = [`- Part ${p + 1}`]
    for (let c = 0; c < 10; c++) {
      const n = p * 10 + c + 1
      await writeFile(join(root, `manuscript/c${n}.md`), `---\ntitle: Chapter ${n}\n---\nText ${n}.\n`)
      lines.push(`  - [Chapter ${n}](manuscript/c${n}.md)`)
    }
    parts.push(lines.join('\n'))
  }
  await writeFile(join(root, 'CONTENTS.md'), `# The Salt Orchard\n\n${parts.join('\n')}\n`)
  let page = await start()
  await page.getByTestId('open-project').click()
  await page.locator('[data-chapter="manuscript/c14.md"]').click()

  const part = (name: string) => page.locator('.part-fold', { hasText: name })
  await part('Part 4').click()
  await expect(part('Part 4')).toHaveAttribute('aria-expanded', 'false')
  await expect(part('Part 4')).toContainText('· 10')
  await expect(page.locator('[data-chapter="manuscript/c31.md"]')).toHaveCount(0)
  // The part being written can't hide its open chapter.
  await part('Part 2').click()
  await expect(page.locator('[data-chapter="manuscript/c14.md"]')).toBeVisible()

  await running?.app.close()
  running = undefined
  // The app reopens the book where the author left off.
  page = await start()
  await expect(part('Part 4')).toHaveAttribute('aria-expanded', 'false')
})
