import { test, type ElectronApplication, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
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
  character: string
  /** A book in another language, for "the interface in your language, the book in its own". */
  otherBook: string
  otherCrossing: string
}

const LANGUAGES: Record<string, Language> = {
  en: {
    book: 'the-salt-orchard',
    crossing: 'manuscript/the-crossing.md',
    phrase: 'a woman in a green coat',
    character: 'Bea',
    otherBook: 'מטע-המלח',
    otherCrossing: 'manuscript/המעבר.md',
  },
  he: {
    book: 'מטע-המלח',
    crossing: 'manuscript/המעבר.md',
    phrase: 'אישה במעיל ירוק',
    character: 'בּיה',
    otherBook: 'the-salt-orchard',
    otherCrossing: 'manuscript/the-crossing.md',
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

/** Opens a fresh copy of `book` in `lang` and `theme`, at the size the site shows. */
async function open(lang: string, theme: string, book: string): Promise<{ app: ElectronApplication; page: Page }> {
  const copy = join(work, `${lang}-${theme}-${Date.now()}`)
  await cp(join(SAMPLES, book), join(copy, book), { recursive: true })
  const running = await launch(join(copy, 'user-data'), {}, [join(copy, book)])
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
 * Opens a chapter as it reads: the cursor rests on a blank line between paragraphs (the editor shows
 * a paragraph's Markdown where the cursor is), and the keyboard leaves the page, so no cursor shows.
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

for (const [lang, language] of Object.entries(LANGUAGES)) {
  for (const theme of THEMES) {
    test(`${lang}, ${theme}`, async () => {
      const { app, page } = await open(lang, theme, language.book)
      await showChapter(page, language.crossing)
      await snap(page, lang, 'desk', theme)

      await select(page, language.phrase)
      await snap(page, lang, 'formatting', theme)

      await page.getByTestId('toggle-shelf').click()
      await page.getByTestId('shelf-search').fill(language.character)
      await page.getByTestId('shelf-search').press('Enter')
      const card = page.locator('.shelf-card').first()
      await card.getByTestId('shelf-pin').click()
      await card.locator('summary').click()
      await restCursor(page)
      await snap(page, lang, 'references', theme)

      await page.getByTestId('workspace-story').click()
      await page.locator('[data-testid="column"]').first().waitFor()
      await snap(page, lang, 'story', theme)
      await app.close()

      const other = await open(lang, theme, language.otherBook)
      await showChapter(other.page, language.otherCrossing)
      await snap(other.page, lang, 'bilingual', theme)
      await other.app.close()
    })
  }
}
