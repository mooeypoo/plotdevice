import { expect, test, type Page } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// Templates for new projects (Milestone 19): the picker, what each template makes and where it opens,
// starter outlines, the outline guide, and "New project…" over an open book. In English and Hebrew.
let base = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-templates-'))
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
  await expect(page.getByTestId('new-project-location')).toHaveText(base)
  await page.getByTestId(`template-${template}`).click()
  await page.getByTestId('new-project-title').fill(title)
  await page.getByTestId('new-project-create').click()
  await page.locator('.project-title').waitFor()
}

const file = (path: string) => expect.poll(() => readFile(join(base, path), 'utf8').then(decodeURI, () => ''))

test('a D&D campaign: five kinds, sessions, the session plan, an NPC linked from it, and a starter outline', async () => {
  const page = await start('en')
  await page.getByTestId('new-project').click()
  await expect(page.getByTestId('template-novel').locator('input')).toBeChecked()
  await create(page, 'campaign', 'The Sunken Crown')

  // It opens on the session plan, with the outline guide above it, once.
  await expect(page.getByTestId('outline-title')).toHaveText('Session plan')
  await expect(page.getByTestId('board').locator('h3', { hasText: 'Opening scene' })).toBeVisible()
  await expect(page.getByTestId('outline-guide')).toBeVisible()
  await page.getByTestId('outline-guide-done').click()
  await expect(page.getByTestId('outline-guide')).toHaveCount(0)
  for (const folder of ['npcs', 'locations', 'factions', 'items', 'lore'])
    await expect(page.locator(`[data-gallery="${folder}"]`)).toBeVisible()

  // An NPC, linked from a card in the session plan.
  await page.locator('[data-gallery="npcs"]').click()
  await page.getByTestId('new-npcs').click()
  await page.getByTestId('prompt-input').fill('Captain Vey')
  await page.getByTestId('prompt-input').press('Enter')
  await page.locator('[data-outline="outlines/session-plan.md"]').click()
  await expect(page.getByTestId('outline-guide')).toHaveCount(0)
  const card = page.locator('.outline-card', { hasText: 'A messenger is waiting at the inn' })
  // Its ⋯ shows on hover or focus (Milestone 17), so point at the card first, as an author would.
  await card.hover()
  await card.locator('.menu-button').first().click()
  await page.getByTestId('menu-link-to').click()
  await page.getByTestId('link-search').fill('Captain Vey')
  await page.getByTestId('link-search').press('Enter')
  await file('The Sunken Crown/outlines/session-plan.md').toContain('(../npcs/captain-vey.md)')
  await file('The Sunken Crown/project.md').toContain('manuscriptUnit:\n  one: Session\n  many: Sessions\n')

  // A new outline from a starter takes the starter's name until the author types one.
  await page.getByTestId('new-outline').click()
  await page.getByTestId('prompt-choice-story-beats').click()
  await expect(page.getByTestId('prompt-input')).toHaveValue('Story beats')
  await page.getByTestId('prompt-input').press('Enter')
  await expect(page.getByTestId('outline-title')).toHaveText('Story beats')
  await file('The Sunken Crown/outlines/story-beats.md').toContain('## Act one\n\n- Opening image\n')

  // Write calls chapters sessions.
  await page.getByTestId('workspace-write').click()
  await expect(page.getByTestId('new-chapter').filter({ visible: true })).toHaveText('New Session')
})

test('a Hebrew novel opens on its outline, in Hebrew and right to left', async () => {
  const page = await start('he')
  await page.getByTestId('new-project').click()
  await expect(page.getByTestId('new-project-language')).toHaveValue('he')
  await create(page, 'novel', 'מטע המלח')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByTestId('outline-title')).toHaveText('העלילה')
  await expect(page.getByTestId('board').locator('h3', { hasText: 'התחלה' })).toBeVisible()
  await expect(page.getByTestId('outline-guide')).toContainText('מקטעים הם הצעדים הגדולים')
  await file('מטע המלח/project.md').toContain('suggestedTags: [דמות ראשית, דמות משנית]')
})

test("the book's language comes first, and the cards show what a template brings in it", async () => {
  const page = await start('en')
  await page.getByTestId('new-project').click()
  // Chosen above the cards, so it's chosen before them.
  const language = await page.getByTestId('new-project-language').boundingBox()
  const cards = await page.getByTestId('template-novel').boundingBox()
  expect(language && cards && language.y < cards.y).toBe(true)

  const campaign = page.getByTestId('template-campaign')
  await expect(campaign.getByTestId('template-peek')).toContainText('NPCs · Locations')
  await page.getByTestId('new-project-language').selectOption('he')
  // The app's words stay in English; what goes into the book is shown in Hebrew.
  await expect(campaign).toContainText('D&D campaign')
  await expect(campaign.getByTestId('template-peek')).toContainText('דמויות · מקומות · פלגים')
  await expect(campaign.getByTestId('template-peek')).toHaveAttribute('lang', 'he')
  await create(page, 'campaign', 'Salt Isles')
  await file('Salt Isles/project.md').toContain('מפגשים')
})

test('a short story opens in Write on its chapter; "New project…" over a book, and Back or Cancel to it', async () => {
  const page = await start('en')
  await page.getByTestId('new-project').click()
  // From the start screen there is no book to go back to, so only "← Back".
  await expect(page.getByTestId('new-project-cancel')).toHaveCount(0)
  await create(page, 'short-story', 'Salt')
  await expect(page.getByTestId('workspace-write')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[aria-current="page"]')).toContainText('Salt')

  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-new-project').click()
  await expect(page.getByTestId('new-project-form')).toBeVisible()
  // The bar's buttons belong to the book underneath, so the bar steps aside and the picker covers the whole window.
  await expect(page.getByTestId('app-menu')).toBeHidden()
  await expect(page.getByTestId('workspace-write')).toBeHidden()
  const picker = await page.locator('.welcome-view.over-book').boundingBox()
  const height = await page.evaluate(() => window.innerHeight)
  expect(picker && picker.y <= 1 && picker.height > height * 0.9).toBe(true)
  await page.getByTestId('new-project-back').click()
  await expect(page.getByTestId('new-project-form')).toHaveCount(0)
  await expect(page.getByTestId('app-menu')).toBeVisible()
  await expect(page.locator('[aria-current="page"]')).toContainText('Salt')

  // Cancel, beside Create, does the same.
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-new-project').click()
  await page.getByTestId('new-project-cancel').click()
  await expect(page.getByTestId('new-project-form')).toHaveCount(0)
  await expect(page.locator('[aria-current="page"]')).toContainText('Salt')

  // Settings opens over the picker (to change the app's language, say); Ctrl+O puts the picker away to open a book.
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-new-project').click()
  await page.keyboard.press('Control+,')
  await expect(page.getByTestId('settings')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('new-project-form')).toBeVisible()
  await page.keyboard.press('Control+o')
  await expect(page.getByTestId('new-project-form')).toHaveCount(0)
  await expect(page.getByTestId('app-menu')).toBeVisible()

  // Blank is what a new project always was.
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-new-project').click()
  await create(page, 'blank', 'Notebook')
  await expect(page.locator('.project-title')).toHaveText('Notebook')
  await file('Notebook/project.md').not.toMatch(/kinds|manuscriptUnit|suggestedTags/)
})
