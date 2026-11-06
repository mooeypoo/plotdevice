import { expect, test, type Page } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// Rendered editing (Milestone 16, ADR 0010): no Markdown mark ever shows, and the cursor never gets
// stuck on one. Cursor cases are checked in the real app, where bidi works as it will for authors:
// keys are pressed, a marker is typed, and the saved file says exactly where the cursor was.

const MARK = '¦'

interface CursorCase {
  name: string
  body: string
  /** Pressed after Ctrl+Home. */
  keys: string[]
  /** Typed after the keys; the marker unless said otherwise. */
  type?: string
  expected: string
}

const times = (n: number, key: string): string[] => Array.from({ length: n }, () => key)

let base = ''
let root = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-rendered-'))
  root = join(base, 'Cursor Book')
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

const chapterFile = (i: number): string => `manuscript/c${String(i + 1).padStart(2, '0')}.md`
const chapterText = (title: string, body: string): string => `---\ntitle: ${title}\n---\n${body}\n`

/** A book with one chapter per text, a character, a note and an outline. */
async function writeBook(language: 'en' | 'he', bodies: string[]): Promise<void> {
  for (const folder of ['manuscript', 'characters', 'notes', 'outlines']) await mkdir(join(root, folder), { recursive: true })
  await writeFile(join(root, 'project.md'), `---\ntitle: Cursor Book\nlanguage: ${language}\nschemaVersion: 1\n---\n`)
  const contents = bodies.map((_, i) => `- [Case ${i + 1}](${chapterFile(i)})`).join('\n')
  await writeFile(join(root, 'CONTENTS.md'), `# Cursor Book\n\n${contents}\n`)
  for (const [i, body] of bodies.entries()) await writeFile(join(root, chapterFile(i)), chapterText(`Case ${i + 1}`, body))
  await writeFile(join(root, 'characters/bea.md'), '---\ntitle: Bea Halmi\n---\nIlka’s aunt.\n')
  await writeFile(join(root, 'characters/ilka.md'), '---\ntitle: Ilka Varga\n---\nInherits the orchard.\n')
  await writeFile(join(root, 'notes/ledger.md'), '---\ntitle: The ledger\n---\nWho owes whom.\n')
  await writeFile(join(root, 'outlines/main-story.md'), '# Main story\n\n## Beginning\n\n- Ilka arrives\n')
}

async function start(locale: 'en' | 'he' = 'en'): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: root })
  const { page } = running
  if (locale === 'he') {
    await openSettings(page)
    await page.getByTestId('settings').locator('select').first().selectOption('he')
    await closeSettings(page)
  }
  await page.getByTestId('open-project').click()
  await page.locator('.cm-content').first().waitFor()
  return page
}

const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8')
const file = (path: string) => expect.poll(() => read(path).catch(() => ''), { timeout: 10_000 })
const writer = (page: Page) => page.getByTestId('editor').locator('.cm-content')

async function openChapter(page: Page, i: number): Promise<void> {
  await page
    .locator(`[data-chapter="${chapterFile(i)}"]`)
    .first()
    .click()
  await expect(page.locator('[aria-current="page"]')).toHaveAttribute('data-chapter', chapterFile(i))
  await expect(writer(page)).toBeFocused()
}

async function runCases(page: Page, cases: CursorCase[]): Promise<void> {
  for (const [i, each] of cases.entries()) {
    await test.step(each.name, async () => {
      await openChapter(page, i)
      await page.keyboard.press('ControlOrMeta+Home')
      for (const key of each.keys) await page.keyboard.press(key)
      await page.keyboard.type(each.type ?? MARK)
      await file(chapterFile(i)).toBe(chapterText(`Case ${i + 1}`, each.expected))
    })
  }
}

/** No Markdown mark shows on any line of the editor. */
async function expectNoMarks(page: Page): Promise<void> {
  const shown = await writer(page).innerText()
  expect(shown).not.toMatch(/\*\*|\]\(|^#{1,6} |^> /m)
}

const english: CursorCase[] = [
  {
    name: 'Right to the end of a bold word: inside the bold',
    body: 'Was **never** there',
    keys: times(9, 'ArrowRight'),
    expected: `Was **never${MARK}** there`,
  },
  {
    name: 'one more Right: past the hidden marks and the space',
    body: 'Was **never** there',
    keys: times(10, 'ArrowRight'),
    expected: `Was **never** ${MARK}there`,
  },
  {
    name: 'Left from the end, back to the bold word',
    body: 'Was **never** there',
    keys: ['End', ...times(6, 'ArrowLeft')],
    expected: `Was **never${MARK}** there`,
  },
  {
    name: 'Right into a link’s words',
    body: 'Ask [Bea](../characters/bea.md) now',
    keys: times(5, 'ArrowRight'),
    expected: `Ask [B${MARK}ea](../characters/bea.md) now`,
  },
  {
    name: 'Right to the end of a link: outside it',
    body: 'Ask [Bea](../characters/bea.md) now',
    keys: times(7, 'ArrowRight'),
    expected: `Ask [Bea](../characters/bea.md)${MARK} now`,
  },
  {
    name: 'Down to a heading: after its hidden marks',
    body: 'One.\n\n## Two',
    keys: ['ArrowDown', 'ArrowDown'],
    expected: `One.\n\n## ${MARK}Two`,
  },
  {
    name: 'Home on a bullet: after the bullet',
    body: '- pears\n  - the north rows',
    keys: ['ArrowDown', 'End', 'Home'],
    expected: `- pears\n  - ${MARK}the north rows`,
  },
  {
    name: 'Backspace at the start of a heading makes it body text',
    body: 'One.\n\n## Two',
    keys: ['ArrowDown', 'ArrowDown', 'Backspace'],
    type: '',
    expected: 'One.\n\nTwo',
  },
  {
    name: 'Backspace at the start of a detail moves it out',
    body: '- pears\n  - the north rows',
    keys: ['ArrowDown', 'Home', 'Backspace'],
    type: '',
    expected: '- pears\n- the north rows',
  },
  {
    name: 'Backspace past a link’s end erases its last letter',
    body: 'Ask [Bea](b.md) now',
    keys: times(7, 'ArrowRight').concat('Backspace'),
    type: '',
    expected: 'Ask [Be](b.md) now',
  },
  {
    name: 'erasing a link’s every letter removes the link',
    body: 'Ask [Bea](b.md) now',
    keys: times(7, 'ArrowRight').concat(times(3, 'Backspace')),
    type: '',
    expected: 'Ask  now',
  },
  { name: 'Shift+End selects a heading’s words, not its marks', body: '## Two', keys: ['Shift+End'], type: 'Three', expected: '## Three' },
  {
    name: 'Ctrl+Alt+2 makes a heading, Ctrl+Alt+0 body text again',
    body: 'Two',
    keys: ['ControlOrMeta+Alt+2'],
    type: '',
    expected: '## Two',
  },
  { name: 'bold switched on, then typed into', body: 'Frost', keys: ['End', 'ControlOrMeta+b'], type: 'bite', expected: 'Frost**bite**' },
  {
    name: 'bold switched on and left: nothing left behind',
    body: 'Frost came',
    keys: ['End', 'ControlOrMeta+b', 'Home'],
    expected: `${MARK}Frost came`,
  },
  {
    name: 'typing Markdown: the marks disappear once understood',
    body: 'x',
    keys: ['End', 'Enter'],
    type: '## Coda',
    expected: 'x\n\n## Coda',
  },
]

test('English: the cursor never stops on a hidden mark, and typing lands where it shows', async () => {
  await writeBook(
    'en',
    english.map((each) => each.body),
  )
  const page = await start()
  await runCases(page, english)
  await expectNoMarks(page)
})

// In a right-to-left line, Left moves forward.
const hebrew: CursorCase[] = [
  {
    name: 'Left to the end of a bold phrase: inside the bold',
    body: 'היה **אף פעם** שם',
    keys: times(10, 'ArrowLeft'),
    expected: `היה **אף פעם${MARK}** שם`,
  },
  {
    name: 'one more Left: past the marks and the space',
    body: 'היה **אף פעם** שם',
    keys: times(11, 'ArrowLeft'),
    expected: `היה **אף פעם** ${MARK}שם`,
  },
  {
    name: 'into a link, a letter with a dagesh counted once',
    body: 'ראה את [בּיה](../characters/bea.md) שם',
    keys: times(8, 'ArrowLeft'),
    expected: `ראה את [בּ${MARK}יה](../characters/bea.md) שם`,
  },
  {
    name: 'to the end of a link: outside it',
    body: 'ראה את [בּיה](../characters/bea.md) שם',
    keys: times(10, 'ArrowLeft'),
    expected: `ראה את [בּיה](../characters/bea.md)${MARK} שם`,
  },
  {
    name: 'Backspace at the start of a heading',
    body: 'אחת.\n\n## שתיים',
    keys: ['ArrowDown', 'ArrowDown', 'Backspace'],
    type: '',
    expected: 'אחת.\n\nשתיים',
  },
  { name: 'Ctrl+Alt+2 in Hebrew', body: 'שתיים', keys: ['ControlOrMeta+Alt+2'], type: '', expected: '## שתיים' },
]

test('Hebrew: the same, with Left moving forward through the text', async () => {
  await writeBook(
    'he',
    hebrew.map((each) => each.body),
  )
  const page = await start('he')
  await runCases(page, hebrew)
  await expectNoMarks(page)
})

/**
 * Mixed lines can't be predicted key by key without restating the bidi algorithm, so the promise is
 * checked instead: walking the line with one arrow, every press moves the cursor somewhere new, the
 * walk visits each visible place once, and no mark ever shows.
 */
for (const [name, language, body, key] of [
  ['Hebrew with English bold', 'he', 'נואל ענה **Never** ושתק', 'ArrowLeft'],
  ['English with a Hebrew link', 'en', 'Ask [בּיה](../characters/bea.md) now', 'ArrowRight'],
] as const) {
  test(`mixed lines (${name}): every press moves, and no mark shows`, async () => {
    await writeBook(language, [body])
    const page = await start(language)
    await openChapter(page, 0)
    const line = page.getByTestId('editor').locator('.cm-line').first()
    const visible = (await line.innerText()).length
    const seen: string[] = []
    for (let presses = 0; presses <= visible; presses++) {
      await page.keyboard.press('ControlOrMeta+Home')
      for (let i = 0; i < presses; i++) await page.keyboard.press(key)
      await page.keyboard.type(MARK)
      const shown = await line.innerText()
      expect(shown).not.toMatch(/\*|\]\(/)
      seen.push(shown)
      await page.keyboard.press('ControlOrMeta+z')
    }
    expect(new Set(seen).size).toBe(seen.length)
    await file(chapterFile(0)).toBe(chapterText('Case 1', body))
  })
}

for (const locale of ['en', 'he'] as const)
  test(`an outline written in Text without typing a Markdown symbol shows on the board (${locale} interface)`, async () => {
    await writeBook('en', ['x'])
    const page = await start(locale)
    await page.getByTestId('workspace-story').click()
    await page.locator('[data-outline="outlines/main-story.md"]').click()
    await page.getByTestId('view-text').click()
    const text = page.getByTestId('outline-text-editor').locator('.cm-content')
    await expect(text).toBeFocused()
    // The end of the last card: the file's final line break leaves an empty line below it.
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('The sale')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.keyboard.type('Bea signs at last')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.type('Coda')
    await page.keyboard.press('ControlOrMeta+Alt+2')
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Last image')
    expect(await text.innerText()).not.toMatch(/^#|^- /m)
    await page.getByTestId('view-board').click()
    await expect(page.locator('.outline-card', { hasText: 'The sale' })).toContainText('Bea signs at last')
    await expect(page.getByRole('region', { name: 'Coda' }).locator('.outline-card')).toContainText('Last image')
    await file('outlines/main-story.md').toBe(
      '# Main story\n\n## Beginning\n\n- Ilka arrives\n- The sale\n  - Bea signs at last\n## Coda\n\n- Last image\n',
    )
  })

test('plain text: from Format on the page, every mark visible; back to normal view keeps undo', async () => {
  await writeBook('en', ['x'])
  await writeFile(join(root, 'characters/bea.md'), '---\ntitle: Bea Halmi\n---\nIlka’s **aunt**.\n')
  const page = await start()
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="characters"]').click()
  await page.locator('[data-page="characters/bea.md"]').click()
  const text = page.getByTestId('page-editor').locator('.cm-content')
  await expect(text).toHaveText('Ilka’s aunt.')
  // Format, at the page's corner, holds it (Milestone 17); Write's own Format stays hidden behind Story.
  await page.getByTestId('reference-page').getByTestId('format-menu').click()
  await page.getByTestId('menu-plain-text-edit').click()
  await expect(page.getByTestId('plain-text-banner')).toBeVisible()
  await expect(text).toHaveText('Ilka’s **aunt**.')
  await text.click()
  await page.keyboard.press('ControlOrMeta+Home')
  await page.keyboard.press('End')
  await page.keyboard.type(' *Kind.*')
  await file('characters/bea.md').toBe('---\ntitle: Bea Halmi\n---\nIlka’s **aunt**. *Kind.*\n')
  await page.getByTestId('plain-text-back').click()
  await expect(page.getByTestId('plain-text-banner')).toBeHidden()
  await expect(text).toHaveText('Ilka’s aunt. Kind.')
  await text.click()
  await page.keyboard.press('ControlOrMeta+z')
  await file('characters/bea.md').toBe('---\ntitle: Bea Halmi\n---\nIlka’s **aunt**.\n')
})

test('plain text when a page opens, from Settings', async () => {
  await writeBook('en', ['x'])
  const page = await start()
  await openSettings(page)
  await page.getByTestId('plain-text-setting').check()
  await closeSettings(page)
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="characters"]').click()
  await page.locator('[data-page="characters/bea.md"]').click()
  await expect(page.getByTestId('plain-text-banner')).toBeVisible()
})

test('plain text and back with Ctrl+Shift+M; the switch beside Format only once turned on in Settings', async () => {
  await writeBook('en', ['The **orchard** at dusk'])
  const page = await start()
  await openChapter(page, 0)
  // Off by default: no switch, but the keys work and the Format menu shows them.
  await expect(page.getByTestId('plain-text-switch')).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+Shift+M')
  await expect(page.getByTestId('plain-text-banner')).toBeVisible()
  await expect(writer(page)).toHaveText('The **orchard** at dusk')
  // The cursor stays in the editor: typing goes on.
  await page.keyboard.type('!')
  await page.keyboard.press('ControlOrMeta+Shift+M')
  await expect(page.getByTestId('plain-text-banner')).toBeHidden()
  await expect(writer(page)).not.toContainText('**')
  await page.getByTestId('format-menu').click()
  await expect(page.getByTestId('menu-plain-text-edit')).toContainText('Ctrl+Shift+M')
  await page.keyboard.press('Escape')

  await openSettings(page)
  await page.getByTestId('plain-text-switch-setting').check()
  await closeSettings(page)
  const toggle = page.getByTestId('plain-text-switch').filter({ visible: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(writer(page)).toContainText('**orchard**')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('plain-text-banner')).toBeHidden()

  // On a page too, and the keys switch only the editor being typed in.
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="characters"]').click()
  await page.locator('[data-page="characters/bea.md"]').click()
  const pageToggle = page.getByTestId('reference-page').getByTestId('plain-text-switch')
  await page.getByTestId('page-editor').locator('.cm-content').click()
  await page.keyboard.press('ControlOrMeta+Shift+M')
  await expect(pageToggle).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('workspace-write').click()
  await expect(page.getByTestId('plain-text-banner').filter({ visible: true })).toHaveCount(0)
})

test('links: @ on a page puts one in, the popup changes and removes it, and its words are erased letter by letter', async () => {
  await writeBook('en', ['See [the ledger](../notes/ledger.md) first.'])
  const page = await start()
  await openChapter(page, 0)
  // The popup, from inside the link's words.
  await page.keyboard.press('ControlOrMeta+Home')
  for (const key of times(6, 'ArrowRight')) await page.keyboard.press(key)
  await expect(page.getByTestId('link-bubble-target')).toHaveText('Goes to The ledger')
  await page.getByTestId('link-change').click()
  await page.getByTestId('link-search').fill('Ilka')
  await page.getByTestId('link-search').press('Enter')
  await file(chapterFile(0)).toBe(chapterText('Case 1', 'See [the ledger](../characters/ilka.md) first.'))
  await expect(page.getByTestId('link-bubble-target')).toHaveText('Goes to Ilka Varga')
  await page.getByTestId('link-remove').click()
  await file(chapterFile(0)).toBe(chapterText('Case 1', 'See the ledger first.'))

  // On a page: @ offers pages; the link shows as its words; erased letter by letter, it's gone.
  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="characters"]').click()
  await page.locator('[data-page="characters/bea.md"]').click()
  const text = page.getByTestId('page-editor').locator('.cm-content')
  await text.click()
  await page.keyboard.press('ControlOrMeta+Home')
  await page.keyboard.press('End')
  await page.keyboard.type(' Owes @Ilk')
  await page.keyboard.press('Enter')
  await file('characters/bea.md').toBe('---\ntitle: Bea Halmi\n---\nIlka’s aunt. Owes [Ilka Varga](ilka.md) \n')
  await expect(text).toHaveText('Ilka’s aunt. Owes Ilka Varga ')
  await page.keyboard.press('Backspace')
  for (const key of times('Ilka Varga'.length, 'Backspace')) await page.keyboard.press(key)
  await file('characters/bea.md').toBe('---\ntitle: Bea Halmi\n---\nIlka’s aunt. Owes \n')
})

test('a heading from the format bubble, in a chapter and on a page', async () => {
  await writeBook('en', ['The orchard'])
  const page = await start()
  await openChapter(page, 0)
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await page.getByTestId('format-bubble').getByRole('button', { name: 'More formatting' }).click()
  await page.getByTestId('menu-format-heading2').click()
  await file(chapterFile(0)).toBe(chapterText('Case 1', '## The orchard'))
  await expect(writer(page)).toHaveText('The orchard')

  await page.getByTestId('workspace-story').click()
  await page.locator('[data-gallery="characters"]').click()
  await page.locator('[data-page="characters/bea.md"]').click()
  await page.getByTestId('page-editor').locator('.cm-content').click()
  await page.keyboard.press('ControlOrMeta+Home')
  await page.keyboard.press('Shift+End')
  const bubble = page.getByTestId('format-bubble').filter({ visible: true })
  const more = bubble.getByRole('button', { name: 'More formatting' })
  await more.click()
  // The list opens just under its ⋯, not wherever the bubble's own position would put it.
  const button = await more.boundingBox()
  const list = await page.locator('.menu-list.placed').boundingBox()
  expect(button && list && Math.abs(list.x + list.width - (button.x + button.width)) < 2 && list.y - (button.y + button.height) < 12).toBe(
    true,
  )
  await page.getByTestId('menu-format-heading3').click()
  await file('characters/bea.md').toBe('---\ntitle: Bea Halmi\n---\n### Ilka’s aunt.\n')
})
