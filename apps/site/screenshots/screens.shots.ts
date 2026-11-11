import { test, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { copyFile, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings } from '../../desktop/e2e/launch'

// Every screenshot the site shows, from the real app on the demo novels, in each language and theme.
// A new language needs only an entry in LANGUAGES: its book, and the chapter and words each scene uses.
const SITE = join(import.meta.dirname, '..')
const SAMPLES = join(SITE, '../../samples')
const OUT = join(SITE, 'src/assets/screens')

interface Language {
  /** The demo novel written in this language, and its chapter "The Crossing". */
  book: string
  crossing: string
  /** A phrase in that chapter to select, and a character to look up on the shelf. */
  phrase: string
  /** A link's words in that chapter, to show the link popup (Milestone 16). */
  linkWords: string
  character: string
  /** That character's page, for the World screens. */
  characterPage: string
  /** A new item being typed, linking a character with @. */
  linkTyping: string
  /** Tags to choose above the characters, grouping them (Milestone 12). */
  tags: string[]
  /** The start of a tag, typed in "+ Tag" to show suggestions; a tag to choose on the shelf while writing The Crossing. */
  tagTyping: string
  shelfTag: string
  /** A page with a misspelled tag, added to a copy of the book for the "Tidy tags" screens; the samples stay clean. */
  typo: { file: string; text: string }
  /** A book in another language, for "the interface in your language, the book in its own". */
  otherBook: string
  otherCrossing: string
  /** A kind of the book's own, with a page, then renamed (Milestone 18). */
  kind: { one: string; many: string; folder: string; page: string; newOne: string; newMany: string }
  /** A new book from each template, for the front page's "many kinds of writing" (Milestone 27). */
  templates: { novel: string; shortStory: string; story: string[]; poetry: string; campaign: string }
}

/**
 * Invented poems (Milestone 27; also tests/fixtures/chapters/poem-*.md): stanzas of lines. Never a real
 * poet's work. The Hebrew one is pointed, and shows the niqqud picker on the כ of כָּל.
 */
const POEMS = {
  en: {
    title: 'Evening in the Orchard',
    stanzas: [
      ['The evening settles on the orchard', 'and salt lies quiet on the leaves', 'I count the trees'],
      ['The wind says nothing', 'and the sea remembers', 'everything we forgot'],
    ],
  },
  he: {
    title: 'עֶרֶב בַּפַּרְדֵּס',
    stanzas: [
      ['הָעֶרֶב יוֹרֵד עַל הַפַּרְדֵּס', 'וְהַמֶּלַח נָח עַל הֶעָלִים', 'אֲנִי סוֹפֶרֶת אֶת הָעֵצִים'],
      ['הָרוּחַ שׁוֹתֶקֶת', 'וְהַיָּם זוֹכֵר', 'אֶת כָּל מָה שֶׁשָּׁכַחְנוּ'],
    ],
  },
}
/** Where the niqqud picker opens in the Hebrew poem: just after this, on the כּ of כָּל, with its qamats and dagesh. */
const NIQQUD_AFTER = 'אֶת כָּ'
const NIQQUD_LINE = 'כָּל'

const LANGUAGES: Record<string, Language> = {
  en: {
    book: 'the-salt-orchard',
    crossing: 'manuscript/the-crossing.md',
    phrase: 'a woman in a green coat',
    linkWords: 'Aunt Bea',
    character: 'Bea',
    characterPage: 'characters/bea.md',
    linkTyping: 'Must meet @be',
    tags: ['Main', 'Part Two – main'],
    tagTyping: 'par',
    shelfTag: 'Part One – main',
    typo: { file: 'characters/josef.md', text: '---\ntitle: Josef Varga\ntags: [Varga famliy]\n---\nIlka’s brother, who never came.\n' },
    otherBook: 'מטע-המלח',
    otherCrossing: 'manuscript/המעבר.md',
    kind: { one: 'Faction', many: 'Factions', folder: 'factions', page: 'The Ferrymen', newOne: 'Guild', newMany: 'Guilds' },
    templates: {
      novel: 'The Salt Orchard',
      shortStory: 'Low Tide',
      story: ['Mira found the boat at low tide, its name washed off the side.', 'She told no one. Not that night, and not in the morning.'],
      poetry: 'Salt Hours',
      campaign: 'The Drowned Coast',
    },
  },
  he: {
    book: 'מטע-המלח',
    crossing: 'manuscript/המעבר.md',
    phrase: 'אישה במעיל ירוק',
    linkWords: 'דודה בּיה',
    character: 'בּיה',
    characterPage: 'characters/ביה.md',
    linkTyping: 'פוגשת את @בּ',
    tags: ['ראשית', 'חלק שני – ראשית'],
    tagTyping: 'חלק',
    shelfTag: 'חלק ראשון – ראשית',
    typo: { file: 'characters/יוסף.md', text: '---\ntitle: יוסף ורגה\ntags: [משפחת ורגא]\n---\nהאח של אילקה, שלא הגיע אף פעם.\n' },
    otherBook: 'the-salt-orchard',
    otherCrossing: 'manuscript/the-crossing.md',
    kind: { one: 'פלג', many: 'פלגים', folder: 'פלגים', page: 'המעבורתנים', newOne: 'גילדה', newMany: 'גילדות' },
    templates: {
      novel: 'מטע המלח',
      shortStory: 'שפל',
      story: ['מירה מצאה את הסירה בשפל, והשם שלה נשטף מהדופן.', 'היא לא סיפרה לאף אחד. לא באותו לילה, וגם לא בבוקר.'],
      poetry: 'שעות מלח',
      campaign: 'החוף הטבוע',
    },
  },
}
const THEMES = ['light', 'dark'] as const

let work = ''
test.beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), 'plotdevice-site-shots-'))
})
test.afterAll(async () => {
  await rm(work, { recursive: true, force: true })
})

/** The window as the person sees it, at twice the pixels for sharp images on any screen. */
async function snap(page: Page, lang: string, name: string, theme: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400)) // transitions and fonts settle
  await mkdir(join(OUT, lang), { recursive: true })
  await page.screenshot({ path: join(OUT, lang, `${name}-${theme}.png`), caret: 'hide', timeout: 20_000 })
}

/** A close-up for a guide page: the part of the window around `targets`, with room around it. */
async function snapAround(page: Page, lang: string, name: string, theme: string, targets: Locator[], room = 28): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const boxes = (await Promise.all(targets.map((target) => target.boundingBox()))).filter((box) => box !== null)
  if (boxes.length === 0) throw new Error(`Nothing to show for "${name}"`)
  const left = Math.max(0, Math.min(...boxes.map((box) => box.x)) - room)
  const top = Math.max(0, Math.min(...boxes.map((box) => box.y)) - room)
  const right = Math.min(1440, Math.max(...boxes.map((box) => box.x + box.width)) + room)
  const bottom = Math.min(900, Math.max(...boxes.map((box) => box.y + box.height)) + room)
  await mkdir(join(OUT, lang), { recursive: true })
  // Positions are in the 1440 × 900 layout; the picture is twice that.
  await page.screenshot({
    path: join(OUT, lang, `${name}-${theme}.png`),
    clip: { x: left * 2, y: top * 2, width: (right - left) * 2, height: (bottom - top) * 2 },
    caret: 'hide',
    timeout: 20_000,
  })
}

/**
 * Opens a fresh copy of `book` (or, without one, the welcome screen) in `lang` and `theme`, at the size
 * the site shows. `extra` adds a file to the copy first, as `[path in the book, text]`.
 */
async function open(
  lang: string,
  theme: string,
  book?: string,
  extra?: { file: string; text: string },
  newBooksIn = '/home/ines/Documents',
): Promise<{ app: ElectronApplication; page: Page }> {
  const copy = join(work, `${lang}-${theme}-${Date.now()}`)
  if (book) await cp(join(SAMPLES, book), join(copy, book), { recursive: true })
  if (book && extra) await writeFile(join(copy, book, extra.file), extra.text)
  // The outline guide, shown once to a new author, would sit above every outline in the shots.
  await mkdir(join(copy, 'user-data'), { recursive: true })
  await writeFile(join(copy, 'user-data', 'preferences.json'), JSON.stringify({ outlineGuideSeen: true }))
  // A Word manuscript for "From a Word file…" (Milestone 23), named as an author would name it.
  // Kept beside this script (word/README.md): the site reads nothing from the app's code but its words and colours.
  const wordFile = join(copy, lang === 'he' ? 'מטע המלח.docx' : 'The Salt Orchard.docx')
  await copyFile(join(import.meta.dirname, 'word', `${lang === 'he' ? 'he' : 'en'}.docx`), wordFile)
  // "Where to keep it" on the new project screen shows this, not the folder of whoever takes the shots;
  // a shot that makes a book gives a real folder instead.
  const running = await launch(
    join(copy, 'user-data'),
    { PLOTDEVICE_TEST_CHOOSE_FOLDER: newBooksIn, PLOTDEVICE_TEST_WORD_FILE: wordFile },
    book ? [join(copy, book)] : [],
  )
  const { app, page } = running
  // A 1440 × 900 window drawn with twice the pixels: 2880 × 1800, zoomed to 200%.
  await page.setViewportSize({ width: 2880, height: 1800 })
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.webContents.setZoomFactor(2))
  await openSettings(page)
  await page.getByTestId('language').selectOption(lang)
  await page.getByTestId('theme').selectOption(theme)
  await closeSettings(page)
  return running
}

/**
 * Opens a chapter as it reads: the cursor rests on a blank line between paragraphs, away from any
 * link (whose popup would show), and the keyboard leaves the page, so no cursor shows.
 */
async function showChapter(page: Page, file: string): Promise<void> {
  await page.locator(`[data-chapter="${file}"]`).first().click()
  await restCursor(page)
}

async function restCursor(page: Page): Promise<void> {
  await page.locator('.cm-content').click()
  await page.evaluate(() => {
    const lines = document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelectorAll('.cm-line') ?? []
    const blank = [...lines].find((line) => line.textContent === '')
    if (blank) document.getSelection()?.setBaseAndExtent(blank, 0, blank, 0)
  })
  await page.locator('.chapter-title').click()
}

/** Puts the cursor in the middle of `phrase`, as a click there would. */
async function caretIn(page: Page, phrase: string): Promise<void> {
  await page.locator('.cm-content').click()
  await page.evaluate((wanted) => {
    const content = document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelector('.cm-content')
    const walker = content && document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
    for (let node = walker?.nextNode(); node; node = walker?.nextNode()) {
      const at = node.textContent?.indexOf(wanted) ?? -1
      const middle = at + Math.floor(wanted.length / 2)
      if (at >= 0) return document.getSelection()?.setBaseAndExtent(node, middle, node, middle)
    }
    throw new Error(`"${wanted}" isn't on the page`)
  }, phrase)
}

/** Selects `phrase` in the editor, as a person would by dragging over it. */
async function select(page: Page, phrase: string): Promise<void> {
  await page.locator('.cm-content').click()
  await page.evaluate((wanted) => {
    const content = document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelector('.cm-content')
    const walker = content && document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
    for (let node = walker?.nextNode(); node; node = walker?.nextNode()) {
      const at = node.textContent?.indexOf(wanted) ?? -1
      if (at >= 0) return document.getSelection()?.setBaseAndExtent(node, at, node, at + wanted.length)
    }
    throw new Error(`"${wanted}" isn't on the page`)
  }, phrase)
}

/** Puts the cursor just after `phrase`, as a click there would. */
async function caretAfter(page: Page, phrase: string): Promise<void> {
  await page.locator('.cm-content').click()
  await page.evaluate((wanted) => {
    const content = document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelector('.cm-content')
    const walker = content && document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
    for (let node = walker?.nextNode(); node; node = walker?.nextNode()) {
      const at = node.textContent?.indexOf(wanted) ?? -1
      if (at >= 0) return document.getSelection()?.setBaseAndExtent(node, at + wanted.length, node, at + wanted.length)
    }
    throw new Error(`"${wanted}" isn't on the page`)
  }, phrase)
}

/** Makes a new book from `template`, in the language `lang`, and waits for it to open. */
async function newBook(page: Page, lang: string, template: string, title: string): Promise<void> {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-language').selectOption(lang)
  await page.getByTestId(`template-${template}`).click()
  await page.getByTestId('new-project-title').fill(title)
  await page.getByTestId('new-project-create').click()
  await page.locator('.project-title').waitFor()
}

/** Types a poem as a poet would: Enter for a new line, Enter twice for a new stanza. */
async function typePoem(page: Page, stanzas: string[][]): Promise<void> {
  await page.locator('.cm-content').click()
  for (const [s, stanza] of stanzas.entries()) {
    if (s > 0) for (let i = 0; i < 2; i++) await page.keyboard.press('Enter')
    for (const [l, line] of stanza.entries()) {
      if (l > 0) await page.keyboard.press('Enter')
      await page.keyboard.insertText(line)
    }
  }
}

for (const [lang, language] of Object.entries(LANGUAGES)) {
  for (const theme of THEMES) {
    test(`${lang}, ${theme}`, async () => {
      const { app, page } = await open(lang, theme, language.book)
      await showChapter(page, language.crossing)
      await snap(page, lang, 'desk', theme)

      const menu = page.getByRole('menu')
      await page.getByTestId('book-menu').click()
      await snapAround(page, lang, 'book-menu', theme, [page.getByTestId('book-menu'), menu])
      await page.keyboard.press('Escape')

      await page.getByTestId('appearance').click()
      await snapAround(page, lang, 'appearance', theme, [page.getByTestId('appearance'), page.locator('.popover')])
      await page.keyboard.press('Escape')

      await page.getByTestId('format-menu').click()
      await snapAround(page, lang, 'format-menu', theme, [page.getByTestId('format-menu'), menu])
      await page.keyboard.press('Escape')

      const row = page.locator(`.chapter-row:has([data-chapter="${language.crossing}"])`).first()
      await row.hover()
      await row.locator('.menu-button').click()
      await snapAround(page, lang, 'chapter-menu', theme, [row, menu])
      await page.keyboard.press('Escape')
      await restCursor(page)

      await select(page, language.phrase)
      await snap(page, lang, 'formatting', theme)

      // A link: its words on the page, and the popup that changes or removes it (Milestone 16).
      await caretIn(page, language.linkWords)
      const linkBubble = page.getByTestId('link-bubble')
      await linkBubble.waitFor()
      await snapAround(page, lang, 'link-bubble', theme, [
        page.getByTestId('editor').locator('.cm-line', { hasText: language.linkWords }),
        linkBubble,
      ])

      // Plain text: the same chapter with every mark showing.
      await page.getByTestId('format-menu').click()
      await page.getByTestId('menu-plain-text-edit').click()
      await page.getByTestId('plain-text-banner').waitFor()
      await restCursor(page)
      await snap(page, lang, 'plain-text', theme)
      await page.getByTestId('plain-text-back').click()
      await restCursor(page)

      await page.getByTestId('toggle-shelf').click()
      await page.getByTestId('shelf-search').fill(language.character)
      await page.getByTestId('shelf-search').press('Enter')
      const card = page.locator('.shelf-card').first()
      await card.getByTestId('shelf-pin').click()
      await card.getByTestId('shelf-part').first().click()
      await restCursor(page)
      await snap(page, lang, 'references', theme)

      // While writing The Crossing (Part One), the shelf grouped by that part's tag.
      const shelf = page.getByTestId('shelf')
      await shelf.getByTestId('shelf-search').focus()
      await shelf.getByTestId('tag-filter').getByRole('button', { name: language.shelfTag, exact: true }).click()
      await shelf.locator('[data-group^="tag:"] li').first().waitFor()
      await snapAround(page, lang, 'shelf-tags', theme, [shelf.locator('.shelf-find')])
      await shelf.getByTestId('tag-filter').getByRole('button', { name: language.shelfTag, exact: true }).click()
      await restCursor(page)

      await page.getByTestId('workspace-story').click()
      await page.locator('[data-testid="column"]').first().waitFor()
      await snap(page, lang, 'story', theme)

      const outlineCard = page.locator('[data-testid="board"] .outline-card').first()
      await outlineCard.locator('.menu-button').click()
      await snapAround(page, lang, 'card-menu', theme, [outlineCard, menu])
      await page.getByTestId('menu-link-to').click()
      await snapAround(page, lang, 'link-picker', theme, [page.locator('.link-picker')], 0)
      await page.keyboard.press('Escape')

      await page.getByTestId('view-outline').click()
      await page.locator('[data-item="0/0"]').hover()
      await snap(page, lang, 'story-list', theme)
      await page.getByTestId('add-card').first().click()
      await page.getByTestId('editable-text').waitFor()
      await page.keyboard.type(language.linkTyping)
      await page.getByTestId('item-suggestions').waitFor()
      await snapAround(page, lang, 'item-link', theme, [page.locator('.item-field'), page.getByTestId('item-suggestions')])
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await page.getByTestId('view-board').click()

      // The timeline (Milestone 21): the storylines side by side, a section's line-up menu, and the
      // question before an outline is deleted, answered with Cancel.
      await page.getByTestId('show-timeline').click()
      await page.locator('.timeline-row').nth(2).waitFor()
      await snap(page, lang, 'timeline', theme)
      // Bea's path's second section: lined up, so its menu offers Unpin and the moments it could move to.
      const loose = page.locator('.timeline-row').nth(1).locator('.timeline-cell.lined-up').first()
      await loose.hover()
      await loose.locator('.cell-head .menu-button').click()
      await snapAround(page, lang, 'timeline-line-up', theme, [loose, menu])
      await page.keyboard.press('Escape')
      const lastRow = page.locator('.timeline-row').last()
      await lastRow.locator('.storyline-name').hover()
      await lastRow.locator('.storyline-name .menu-button').click()
      await page.getByTestId('menu-outline-delete').click()
      await snapAround(page, lang, 'outline-delete', theme, [page.getByTestId('confirm')], 0)
      await page.getByTestId('confirm').getByRole('button').first().click()

      await page.locator('[data-gallery="characters"]').click()
      await snap(page, lang, 'world-gallery', theme)
      const tagRow = page.locator('.world-gallery').getByTestId('tag-filter')
      for (const tag of language.tags) await tagRow.getByRole('button', { name: tag, exact: true }).click()
      await snap(page, lang, 'world-tags', theme)
      await tagRow.locator('.tag-choice').first().click({ button: 'right' })
      await snapAround(page, lang, 'tag-menu', theme, [tagRow, menu])
      await page.keyboard.press('Escape')
      for (const tag of language.tags) await tagRow.getByRole('button', { name: tag, exact: true }).click()
      await page.locator(`[data-page="${language.characterPage}"]`).click()
      await page.getByTestId('linked-from').locator('.linked-entry').first().waitFor()
      await snap(page, lang, 'page-connections', theme)
      await page.getByTestId('tag-add').click()
      await page.getByTestId('tag-input').fill(language.tagTyping)
      await page.locator('.tag-options').waitFor()
      await snapAround(page, lang, 'tag-add', theme, [
        page.locator('.reference-page .item-header'),
        page.getByTestId('page-tags'),
        page.locator('.tag-options'),
      ])
      await page.getByTestId('tag-input').press('Escape')
      await page.getByTestId('show-on-board').first().click()
      await page.getByTestId('showing-about').waitFor()
      await snap(page, lang, 'show-on-board', theme)
      await app.close()

      // Kinds of pages (Milestone 18): one of the book's own, its gallery, then matching its folder.
      const kinds = await open(lang, theme, language.book)
      const kp = kinds.page
      const kind = language.kind
      await kp.getByTestId('book-menu').click()
      await kp.getByTestId('menu-kinds').click()
      await kp.getByTestId('kind-add').click()
      await kp.getByTestId('kind-one').fill(kind.one)
      await kp.getByTestId('kind-many').fill(kind.many)
      await kp.getByTestId('kind-save').click()
      await kp.locator(`.kinds-dialog [data-kind="${kind.folder}"]`).waitFor()
      await snapAround(kp, lang, 'kinds-dialog', theme, [kp.getByTestId('kinds-dialog')], 0)
      await kp.getByTestId('kinds-close').click()
      await kp.getByTestId('workspace-story').click()
      await kp.locator(`[data-gallery="${kind.folder}"]`).click()
      await kp.getByTestId(`new-${kind.folder}`).click()
      await kp.getByTestId('prompt-input').fill(kind.page)
      await kp.getByTestId('prompt-input').press('Enter')
      await kp.getByTestId('reference-page').waitFor()
      await kp.locator(`[data-gallery="${kind.folder}"]`).click()
      await snap(kp, lang, 'world-own-kind', theme)
      await kp.getByTestId('book-menu').click()
      await kp.getByTestId('menu-kinds').click()
      await kp.locator(`.kinds-dialog [data-kind="${kind.folder}"] .menu-button`).click()
      await kp.getByTestId('menu-kind-rename').click()
      await kp.getByTestId('kind-one').fill(kind.newOne)
      await kp.getByTestId('kind-many').fill(kind.newMany)
      await kp.getByTestId('kind-save').click()
      await kp.getByTestId('match-folders').click()
      await kp.getByTestId('match-links').waitFor()
      await snapAround(kp, lang, 'match-folders', theme, [kp.getByTestId('match-folders-dialog')], 0)
      // Close "Match folder names", then "Kinds of pages" beneath it.
      await kp.keyboard.press('Escape')
      await kp.getByTestId('kinds-close').click()
      // Backups (Milestone 20), before a folder is chosen: what they do, and that nothing is deleted.
      await kp.getByTestId('book-menu').click()
      await kp.getByTestId('menu-backups').click()
      await kp.getByTestId('backups-off-note').waitFor()
      await snapAround(kp, lang, 'backups-dialog', theme, [kp.getByTestId('backups-dialog')], 0)
      await kp.getByTestId('backups-close').click()
      // The Export window (Milestone 22), as it first opens: Word, with a title page.
      await kp.getByTestId('book-menu').click()
      await kp.getByTestId('menu-export-book').click()
      await kp.getByTestId('export-go').waitFor()
      await snapAround(kp, lang, 'export-dialog', theme, [kp.getByTestId('export-dialog')], 0)
      await kinds.app.close()

      const welcome = await open(lang, theme)
      await welcome.page.getByTestId('new-project').click()
      await welcome.page.getByTestId('new-project-title').fill(lang === 'he' ? 'מטע המלח' : 'The Salt Orchard')
      await welcome.page.getByTestId('new-project-title').blur()
      await welcome.page.mouse.move(0, 0)
      await snap(welcome.page, lang, 'new-project', theme)
      // Bringing in a Word file (Milestone 23): the preview of its chapters.
      await welcome.page.getByTestId('from-word-file').click()
      await welcome.page.getByTestId('import-next').waitFor()
      await welcome.page.mouse.move(0, 0)
      await snapAround(welcome.page, lang, 'import-dialog', theme, [welcome.page.getByTestId('import-dialog')], 0)
      await welcome.app.close()

      // A misspelled tag: the notice when the book opens, then "Tidy tags".
      const typo = await open(lang, theme, language.book, language.typo)
      const notice = typo.page.locator('.notice-toast')
      await notice.waitFor()
      await snapAround(typo.page, lang, 'tidy-notice', theme, [notice])
      await typo.page.getByTestId('notice-action').click()
      await typo.page.getByTestId('tidy-pair').first().waitFor()
      await snapAround(typo.page, lang, 'tidy-tags', theme, [typo.page.getByTestId('tidy-tags')], 0)
      await typo.app.close()

      const other = await open(lang, theme, language.otherBook)
      await showChapter(other.page, language.otherCrossing)
      await snap(other.page, lang, 'bilingual', theme)
      await other.app.close()
    })

    // One app, many kinds of writing (Milestone 27): a new book from each template, as it first opens
    // (a word or two typed in; the poetry collection's is the poem), and the niqqud picker on a Hebrew poem.
    test(`${lang}, ${theme}: kinds of writing`, async () => {
      const books = language.templates
      const make = async (template: string, title: string) => {
        const folder = await mkdtemp(join(work, 'books-'))
        const running = await open(lang, theme, undefined, undefined, folder)
        await newBook(running.page, lang, template, title)
        return running
      }

      const novel = await make('novel', books.novel)
      await novel.page.locator('[data-testid="column"]').first().waitFor()
      await novel.page.mouse.move(0, 0)
      await snap(novel.page, lang, 'kind-novel', theme)
      await novel.app.close()

      const story = await make('short-story', books.shortStory)
      await story.page.locator('.cm-content').click()
      for (const [p, paragraph] of books.story.entries()) {
        if (p > 0) await story.page.keyboard.press('Enter')
        await story.page.keyboard.insertText(paragraph)
      }
      await story.page.locator('.chapter-title').click()
      await snap(story.page, lang, 'kind-short-story', theme)
      await story.app.close()

      const campaign = await make('campaign', books.campaign)
      await campaign.page.locator('[data-testid="column"]').first().waitFor()
      await campaign.page.mouse.move(0, 0)
      await snap(campaign.page, lang, 'kind-campaign', theme)
      await campaign.app.close()

      // A poetry collection opens on its one untitled poem. Give it a title, then write it.
      const poetry = await make('poetry', books.poetry)
      const pp = poetry.page
      const poem = POEMS[lang as keyof typeof POEMS]
      const row = pp.getByTestId('navigator').locator('.chapter-row').first()
      await row.hover()
      await row.locator('.menu-button').click()
      await pp.getByTestId('menu-rename').click()
      await pp.getByTestId('prompt-input').fill(poem.title)
      await pp.getByTestId('prompt-input').press('Enter')
      await pp.locator('.chapter-title', { hasText: poem.title }).waitFor()
      await typePoem(pp, poem.stanzas)
      await restCursor(pp)
      await snap(pp, lang, 'poem', theme)

      // The niqqud picker, on a Hebrew poem: in a Hebrew book its own; in an English one, a second poem.
      if (lang !== 'he') {
        await pp.getByTestId('new-chapter').click()
        await pp.getByTestId('prompt-input').fill(POEMS.he.title)
        await pp.getByTestId('prompt-input').press('Enter')
        await pp.locator('.chapter-title', { hasText: POEMS.he.title }).waitFor()
        await typePoem(pp, POEMS.he.stanzas)
      }
      await caretAfter(pp, NIQQUD_AFTER)
      await pp.keyboard.press('Control+Shift+N')
      const panel = pp.getByTestId('niqqud-panel')
      await panel.waitFor()
      await snapAround(pp, lang, 'niqqud', theme, [pp.getByTestId('editor').locator('.cm-line', { hasText: NIQQUD_LINE }), panel])
      await poetry.app.close()
    })
  }
}
