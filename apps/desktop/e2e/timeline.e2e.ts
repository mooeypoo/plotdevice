import { expect, test, type Page } from '@playwright/test'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// The timeline (Milestone 20, ADR 0012): the sample novel's outlines side by side, lined up.
const FIXTURES = join(import.meta.dirname, '../../../tests/fixtures')
const MAIN = 'outlines/main-story.md'
const BEA = 'outlines/beas-path.md'
const HISTORY = 'outlines/history-of-marrow.md'

let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-timeline-'))
  root = join(base, 'The Salt Orchard')
  await cp(join(FIXTURES, 'projects/salt-orchard'), root, { recursive: true })
  await writeFile(
    join(root, BEA),
    [
      '# Bea’s path',
      '',
      '## Staying behind',
      '',
      '- Bea refuses to leave',
      '',
      '## Waiting at the landing',
      'At the same time as [Beginning](main-story.md#beginning)',
      '',
      '- Waits at the landing for a week, see [The Crossing](../manuscript/the-crossing.md)',
      '',
      '## The ledger at night',
      '',
      '- Writes in the ledger, see [Frost](../manuscript/frost.md)',
      '',
    ].join('\n'),
  )
  // As a book made by this version names it; without it, the first outline by name would be main.
  const project = await readFile(join(root, 'project.md'), 'utf8')
  await writeFile(
    join(root, 'project.md'),
    project.replace('series: Orchard Books\n', 'series: Orchard Books\nmainOutline: outlines/main-story.md\n'),
  )
  await writeFile(join(root, HISTORY), '# History of Marrow\n\n## The salt years\n\n- The first trees are planted in salt ground\n')
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
  await page.getByTestId('show-timeline').click()
  await page.getByTestId('timeline').waitFor()
  return page
}

const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')
const file = (path: string) => expect.poll(() => read(path).catch(() => ''))
const storyline = (page: Page, path: string) => page.locator(`[data-storyline="${path}"]`)

test('shows the storylines side by side, named by the main outline’s sections, and lined up', async () => {
  const page = await start()
  await expect(page.getByTestId('timeline-source')).toContainText('Column names come from the main outline:')
  await expect(page.getByTestId('timeline-source')).toContainText('Main story')
  // The main outline is listed first in the sidebar, marked Main.
  await expect(page.locator('[data-outline]').first()).toHaveAttribute('data-outline', MAIN)
  await expect(page.getByTestId('main-badge')).toHaveText('Main')
  await expect(page.locator('.timeline-moment:not(.gap) .moment-name')).toHaveText(['Beginning', 'Ending'])
  // "Waiting at the landing" shares the Beginning column; "Staying behind" sits in a gap before it.
  const landing = storyline(page, BEA).locator('.timeline-cell', { hasText: 'Waiting at the landing' })
  await expect(landing).toHaveClass(/lined-up/)
  await expect(landing.locator('.chapter-chip')).toHaveText('Chapter 2 · The Crossing')
  await expect(storyline(page, BEA).locator('.timeline-cell', { hasText: 'Staying behind' })).toHaveClass(/not-lined-up/)
  await page.screenshot({ path: test.info().outputPath('timeline-en.png') })
})

test('lines a section up from its menu, and unpins it, writing one line under its heading', async () => {
  const page = await start()
  const before = await read(HISTORY)
  const salt = storyline(page, HISTORY).locator('.timeline-cell', { hasText: 'The salt years' })
  await salt.hover()
  await salt.locator('.menu-button').click()
  await page.getByRole('menuitem', { name: 'Bea’s path: Staying behind' }).click()
  await file(HISTORY).toContain('## The salt years\n\nAt the same time as [Staying behind](beas-path.md#staying-behind)\n')
  await expect(salt).toHaveClass(/lined-up/)
  await salt.hover()
  await salt.locator('.menu-button').click()
  await page.getByRole('menuitem', { name: 'Unpin' }).click()
  await file(HISTORY).toBe(before)
})

test('renames a column, which renames the section and the line-ups that point to it', async () => {
  const page = await start()
  await page.getByTestId('column-1').click()
  const input = page.getByTestId('editable-text')
  await input.fill('The arrival')
  await input.press('Enter')
  await file(MAIN).toContain('## The arrival\n')
  await file(BEA).toContain('At the same time as [The arrival](main-story.md#the-arrival)')
})

test('makes another outline the main one, changing only project.md', async () => {
  const page = await start()
  const outlines = await Promise.all([MAIN, BEA, HISTORY].map(read))
  await page.getByTestId('change-main').click()
  await page.getByRole('menuitem', { name: 'Bea’s path' }).click()
  await expect(page.locator('dialog[open]')).toContainText('Nothing in your outlines changes')
  await page.getByTestId('confirm-yes').click()
  await file('project.md').toContain('mainOutline: outlines/beas-path.md\n')
  await expect(page.locator('.timeline-moment:not(.gap) .moment-name')).toHaveText([
    'Staying behind',
    'Waiting at the landing',
    'The ledger at night',
  ])
  expect(await Promise.all([MAIN, BEA, HISTORY].map(read))).toEqual(outlines)
})

test('in Hebrew, earlier moments sit on the right', async () => {
  const page = await start()
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  await closeSettings(page)
  await expect(page.getByTestId('timeline-source')).toContainText('שמות העמודות באים מהמתווה הראשי')
  const [first, second] = await page
    .locator('.timeline-moment:not(.gap)')
    .evaluateAll((moments) => moments.map((moment) => moment.getBoundingClientRect().left))
  expect(first).toBeGreaterThan(second ?? Infinity)
  await page.screenshot({ path: test.info().outputPath('timeline-he.png') })
})

test('drags a section onto a moment to line it up, and a card to another moment of its storyline', async () => {
  const page = await start()
  // History of Marrow's only section goes onto the main story's Ending column.
  const salt = storyline(page, HISTORY).locator('.timeline-cell', { hasText: 'The salt years' })
  // Wide enough to show both ends, as a drag across a scrolling timeline loses its way in a test.
  await page.setViewportSize({ width: 1700, height: 1000 })
  const ending = storyline(page, MAIN).locator('.timeline-cell', { hasText: 'Back to the crossing' })
  await salt.locator('.cell-head').dragTo(ending)
  await file(HISTORY).toContain('## The salt years\n\nAt the same time as [Ending](main-story.md#ending)\n')
  await expect(salt).toHaveClass(/lined-up/)

  // Bea's first card moves to the ledger section, in her own outline only.
  const card = page.locator('.timeline-card', { hasText: 'Bea refuses to leave' })
  await card.dragTo(storyline(page, BEA).locator('.timeline-cell', { hasText: 'The ledger at night' }).locator('.timeline-add-card'))
  await file(BEA).toMatch(/## The ledger at night\n\n- Writes in the ledger.*\n- Bea refuses to leave\n/)
  await expect(page.locator('.timeline-card', { hasText: 'Bea refuses to leave' })).toBeVisible()
})

test('offers only moments that keep the storyline’s order', async () => {
  const page = await start()
  // "The ledger at night" comes after "Waiting at the landing", which is lined up with Beginning:
  // it can't go at Beginning, nor before it.
  const ledger = storyline(page, BEA).locator('.timeline-cell', { hasText: 'The ledger at night' })
  await ledger.hover()
  await ledger.locator('.cell-head .menu-button').click()
  await expect(page.getByRole('menuitem', { name: 'Ending' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Beginning' })).toHaveCount(0)
  await page.keyboard.press('Escape')
})
