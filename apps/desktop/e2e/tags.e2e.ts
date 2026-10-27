import { expect, test, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, type Launched } from './launch'

// Milestone 12: tags on pages, lists grouped by them, and tidying them.
const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-tags-'))
  root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  await mkdir(join(root, 'characters'))
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
  return page
}

const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')
const file = (path: string) => expect.poll(() => read(path).catch(() => ''))
const character = (name: string, title: string, tags: string, text = 'Someone in Marrow.') =>
  writeFile(join(root, `characters/${name}.md`), `---\ntitle: ${title}\n${tags ? `tags: ${tags}\n` : ''}---\n${text}\n`)

async function openCharacter(page: Page, name: string): Promise<void> {
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="character"]').click()
  await page.locator(`[data-page="characters/${name}.md"]`).click()
}

test('tag a character from its page, picking an existing tag or making a new one, then remove one', async () => {
  await character('bea', 'Bea Halmi', '[Main, Varga family]')
  await character('noel', 'Noël', '', 'Keeps the ferry.')
  const page = await start()
  await openCharacter(page, 'noel')
  const tags = page.getByTestId('page-tags')
  const pills = tags.locator('.tag-pill > span')

  // The project's tags are suggested while typing; Enter adds the highlighted one.
  await page.getByTestId('tag-add').click()
  await page.getByTestId('tag-input').fill('var')
  await expect(page.getByRole('option')).toHaveText(['Varga family', 'New tag: “var”'])
  await page.getByTestId('tag-input').press('Enter')
  // The field stays open for the next tag; one nobody has yet is made by typing it.
  await page.getByTestId('tag-input').fill('Part Two: main')
  await page.getByTestId('tag-input').press('Enter')
  await page.getByTestId('tag-input').press('Escape')
  await expect(page.getByTestId('tag-add')).toBeFocused()
  await expect(pills).toHaveText(['Varga family', 'Part Two: main'])
  await file('characters/noel.md').toBe('---\ntitle: Noël\ntags: [Varga family, "Part Two: main"]\n---\nKeeps the ferry.\n')

  await tags.getByRole('button', { name: 'Remove the tag “Varga family”' }).click()
  await file('characters/noel.md').toBe('---\ntitle: Noël\ntags: ["Part Two: main"]\n---\nKeeps the ferry.\n')
  await expect(pills).toHaveText(['Part Two: main'])
})
