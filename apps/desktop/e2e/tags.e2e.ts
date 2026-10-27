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

test('choosing tags above Characters groups the cards, in the order chosen, with the rest folded', async () => {
  await character('bea', 'Bea Halmi', '[Main, Varga family]')
  await character('ilka', 'Ilka Varga', '[main, Part Two – main]')
  await character('josef', 'Josef Varga', '[Varga family]')
  await character('noel', 'Noël', '[Part Two – main]')
  await character('yael', 'Yael', '')
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="character"]').click()
  const row = page.locator('.world-gallery').getByTestId('tag-filter')
  await expect(row.locator('.tag-choice')).toHaveText(['Main', 'Part Two – main', 'Varga family'])
  // Each card shows its tags, as written on its page; a card without tags shows none.
  await expect(page.locator('[data-page="characters/bea.md"]').getByTestId('card-tags').locator('.tag-pill')).toHaveText([
    'Main',
    'Varga family',
  ])
  await expect(page.locator('[data-page="characters/yael.md"]').getByTestId('card-tags')).toHaveCount(0)

  const cardsIn = (group: string) => page.locator(`[data-group="${group}"] .page-card-title`)
  await row.getByRole('button', { name: 'Part Two – main' }).click()
  await row.getByRole('button', { name: 'Main', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Main', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.gallery-group > .group-label')).toHaveText(['Part Two – main', 'Main', 'All characters (2)'])
  await expect(cardsIn('tag:Part Two – main')).toHaveText(['Ilka Varga', 'Noël'])
  await expect(cardsIn('tag:Main')).toHaveText(['Bea Halmi'])
  await expect(cardsIn('others')).toHaveCount(0)
  await page.getByTestId('the-rest').click()
  await expect(cardsIn('others')).toHaveText(['Josef Varga', 'Yael'])

  // Choosing them again lets them go, and the gallery is as it was; adding a page still works.
  await row.getByRole('button', { name: 'Part Two – main' }).click()
  await row.getByRole('button', { name: 'Main', exact: true }).click()
  await expect(page.getByTestId('gallery-character').locator('.page-card-title')).toHaveText([
    'Bea Halmi',
    'Ilka Varga',
    'Josef Varga',
    'Noël',
    'Yael',
  ])
  await expect(page.getByTestId('new-character')).toBeVisible()
})

test('while writing, the shelf groups by the tags chosen for each part, and remembers them after a restart', async () => {
  await character('bea', 'Bea Halmi', '[Part One – main, Varga family]')
  await character('ilka', 'Ilka Varga', '[Part One – main, Part Two – main]')
  await character('noel', 'Noël', '[Part Two – main]')
  await character('josef', 'Josef Varga', '[Varga family]')
  let page = await start()
  const writeIn = async (chapter: string): Promise<void> => {
    await page.locator(`[data-chapter="manuscript/${chapter}.md"]`).first().click()
    await expect(page.locator('[aria-current="page"]')).toHaveAttribute('data-chapter', `manuscript/${chapter}.md`)
  }
  const shelf = () => page.getByTestId('shelf')
  const group = (tag: string) => shelf().locator(`[data-group="tag:${tag}"] button span[dir]`)

  await writeIn('the-crossing')
  await page.keyboard.press('Control+Shift+R')
  await shelf().getByTestId('shelf-search').focus()
  await shelf().getByTestId('tag-filter').getByRole('button', { name: 'Part One – main' }).click()
  await expect(group('Part One – main')).toHaveText(['Bea Halmi', 'Ilka Varga'])
  // The rest: Josef and Noël, and the sample's places and notes.
  await expect(shelf().getByTestId('shelf-rest')).toHaveText(/^All pages \(\d+\)$/)
  await expect(shelf().locator('[data-group="others"] li')).toHaveCount(0)

  // Typing filters inside the groups; a matching tag is offered to choose.
  await shelf().getByTestId('shelf-search').fill('varga')
  await expect(group('Part One – main')).toHaveText(['Ilka Varga'])
  await expect(shelf().locator('[data-group="others"] button span[dir]')).toHaveText(['Josef Varga'])
  await shelf().getByTestId('matching-tags').getByRole('button', { name: 'Varga family' }).click()
  await expect(shelf().getByTestId('shelf-search')).toHaveValue('')
  await expect(group('Varga family')).toHaveText(['Josef Varga'])

  // Part Two has its own choice; going back to Part One brings its tags back.
  await writeIn('frost')
  await shelf().getByTestId('shelf-search').focus()
  await expect(shelf().getByTestId('tag-filter').locator('[aria-pressed="true"]')).toHaveCount(0)
  await shelf().getByTestId('tag-filter').getByRole('button', { name: 'Part Two – main' }).click()
  await expect(group('Part Two – main')).toHaveText(['Ilka Varga', 'Noël'])
  await writeIn('the-orchard-gate')
  // The row shows only while finding, so the page stays calm.
  await expect(shelf().getByTestId('tag-filter')).toHaveCount(0)
  await shelf().getByTestId('shelf-search').focus()
  await expect(shelf().getByTestId('tag-filter').locator('[aria-pressed="true"]')).toHaveText(['Part One – main', 'Varga family'])

  await running?.app.close()
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  page = running.page
  await page.locator('.project-title').waitFor()
  await writeIn('frost')
  if (!(await shelf().isVisible())) await page.keyboard.press('Control+Shift+R')
  await shelf().getByTestId('shelf-search').focus()
  await expect(shelf().getByTestId('tag-filter').locator('[aria-pressed="true"]')).toHaveText(['Part Two – main'])
})

test('"Link to…" groups by the chosen tags before anything is typed', async () => {
  await character('bea', 'Bea Halmi', '[Varga family]')
  await character('noel', 'Noël', '')
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-outline="outlines/main-story.md"]').click()
  const card = page.locator('.outline-card', { hasText: 'Ilka crosses the river' })
  await card.getByRole('button', { name: /^Actions for/ }).click()
  await page.getByTestId('menu-link-to').click()
  const picker = page.getByTestId('link-picker')
  await picker.getByTestId('tag-filter').getByRole('button', { name: 'Varga family' }).click()
  await expect(picker.getByTestId('link-search')).toBeFocused()
  await expect(picker.getByTestId('link-group-tag:Varga family').getByRole('option')).toHaveText(['Bea HalmiCharacter'])
  await expect(picker.getByTestId('link-group-character').getByRole('option')).toHaveText(['Noël'])
  await picker.getByTestId('link-search').press('Enter')
  await file('outlines/main-story.md').toContain('[Bea Halmi](../characters/bea.md)')
})

test('rename a tag everywhere, merging it into another, then remove one from all pages, by mouse and by keyboard', async () => {
  await character('bea', 'Bea Halmi', '[Main, Varga famliy]', 'The aunt.')
  await character('josef', 'Josef Varga', '[Varga family]', 'The uncle.')
  await character('noel', 'Noël', '[Marrow folk]', 'Keeps the ferry.')
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="character"]').click()
  const row = page.locator('.world-gallery').getByTestId('tag-filter')

  // Right-click: rename; typing an existing tag's name merges the two.
  await row.getByRole('button', { name: 'Varga famliy' }).click({ button: 'right' })
  await page.getByTestId('menu-tag-rename-everywhere').click()
  await expect(page.getByTestId('prompt-input')).toHaveValue('Varga famliy')
  await page.getByTestId('prompt-input').fill('Varga family')
  await page.getByTestId('prompt-input').press('Enter')
  await expect(page.locator('.notice-toast')).toContainText('Changed on one page.')
  await file('characters/bea.md').toBe('---\ntitle: Bea Halmi\ntags: [Main, Varga family]\n---\nThe aunt.\n')
  expect(await read('characters/josef.md')).toBe('---\ntitle: Josef Varga\ntags: [Varga family]\n---\nThe uncle.\n')
  await expect(row.locator('.tag-choice')).toHaveText(['Main', 'Marrow folk', 'Varga family'])

  // Keyboard: Shift+F10 on a focused tag opens the same menu.
  await row.getByRole('button', { name: 'Varga family' }).focus()
  await page.keyboard.press('Shift+F10')
  await expect(page.getByTestId('menu-tag-rename-everywhere')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('confirm')).toContainText('Remove the tag “Varga family” from 2 pages?')
  await page.getByTestId('confirm-yes').click()
  await file('characters/josef.md').toBe('---\ntitle: Josef Varga\n---\nThe uncle.\n')
  expect(await read('characters/bea.md')).toBe('---\ntitle: Bea Halmi\ntags: [Main]\n---\nThe aunt.\n')
  expect(await read('characters/noel.md')).toBe('---\ntitle: Noël\ntags: [Marrow folk]\n---\nKeeps the ferry.\n')
})

test('tidying: a project with clean tags shows nothing; near-duplicates are offered once, and merged on request', async () => {
  await character('bea', 'Bea Halmi', '[Main, Varga family]', 'The aunt.')
  await character('josef', 'Josef Varga', '[Varga family]', 'The uncle.')
  await character('noel', 'Noël', '[Used once]', 'Keeps the ferry.')
  let page = await start()
  await expect(page.locator('.project-title')).toBeVisible()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="character"]').click()
  await expect(page.locator('.world-gallery').getByTestId('tag-filter')).toBeVisible()
  await expect(page.locator('.notice-toast')).toHaveCount(0)
  await expect(page.getByTestId('tag-tidy')).toHaveCount(0)

  // A typo, made in another app; the next time the project opens, the author is told once.
  await running?.app.close()
  await character('ilka', 'Ilka Varga', '[Varga famliy]', 'The heir.')
  await writeFile(join(root, 'characters/yael.md'), '---\ntitle: [unclosed\ntags: [Main]\n---\n# Yael\n')
  const reopen = async (): Promise<Page> => {
    running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
    await running.page.locator('.project-title').waitFor()
    return running.page
  }
  page = await reopen()
  await expect(page.locator('.notice-toast')).toContainText('Some tags may need tidying (2).')
  await page.getByTestId('notice-action').click()
  const dialog = page.getByTestId('tidy-tags')
  await expect(dialog.getByTestId('tidy-pair').first()).toContainText('Varga family')
  await expect(dialog).toContainText('Yael')
  await dialog.getByRole('button', { name: 'Merge into “Varga family”' }).click()
  await file('characters/ilka.md').toBe('---\ntitle: Ilka Varga\ntags: [Varga family]\n---\nThe heir.\n')
  await expect(dialog.getByTestId('tidy-pair')).toHaveCount(0)
  // The broken page is opened for the author to fix; the app never repairs it.
  await dialog.getByRole('button', { name: 'Open page' }).click()
  await expect(page.getByTestId('reference-page')).toBeVisible()
  expect(await read('characters/yael.md')).toBe('---\ntitle: [unclosed\ntags: [Main]\n---\n# Yael\n')

  // Reported once: reopening says nothing, though "Tidy tags…" stays while a problem remains.
  await running?.app.close()
  page = await reopen()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="character"]').click()
  await expect(page.getByTestId('tag-tidy')).toBeVisible()
  await expect(page.locator('.notice-toast')).toHaveCount(0)

  // Fixed in another app: nothing left, and "Tidy tags…" is gone.
  await writeFile(join(root, 'characters/yael.md'), '---\ntitle: Yael\ntags: [Main]\n---\n')
  await expect(page.getByTestId('tag-tidy')).toHaveCount(0)
})

test('a card shows four tags at most, then how many more', async () => {
  await character('bea', 'Bea Halmi', '[Main, Varga family, Part One – secondary, Part Two – main, Marrow folk, Keeps secrets]')
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="character"]').click()
  await expect(page.locator('[data-page="characters/bea.md"]').getByTestId('card-tags').locator('.tag-pill')).toHaveText([
    'Main',
    'Varga family',
    'Part One – secondary',
    'Part Two – main',
    '+ 2 more',
  ])
})

test('the rest of a grouped gallery is named for its kind: all characters, all places or all notes', async () => {
  await character('bea', 'Bea Halmi', '[Varga family]')
  await character('noel', 'Noël', '')
  await mkdir(join(root, 'places'), { recursive: true })
  await writeFile(join(root, 'places/orchard.md'), '---\ntitle: The Salt Orchard\ntags: [Varga family]\n---\n')
  await writeFile(join(root, 'places/landing.md'), '---\ntitle: The Ferry Landing\n---\n')
  await mkdir(join(root, 'notes'), { recursive: true })
  await writeFile(join(root, 'notes/will.md'), '---\ntitle: The will\ntags: [Varga family]\n---\n')
  const page = await start()
  await page.getByTestId('workspace-story').click()
  for (const [kind, rest] of [
    ['character', 'All characters'],
    ['place', 'All places'],
    ['note', 'All notes'],
  ] as const) {
    await page.locator(`[data-gallery="${kind}"]`).click()
    const row = page.locator('.world-gallery').getByTestId('tag-filter')
    await row.getByRole('button', { name: 'Varga family' }).click()
    await expect(page.getByTestId('the-rest')).toHaveText(new RegExp(`^${rest} \\(\\d+\\)$`))
  }
})
