import { expect, test, type Page } from '@playwright/test'
import { appendFile, cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, type Launched } from './launch'

const DEMO = join(import.meta.dirname, '../../../samples/the-salt-orchard')

let base = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-scroll-'))
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

async function start(folder: string): Promise<Page> {
  running = await launch(join(base, 'user-data'), { PLOTDEVICE_TEST_CHOOSE_FOLDER: folder })
  return running.page
}

/** The demo novel, with "The Crossing" made long enough to scroll: sixty numbered paragraphs of several lines each. */
async function longDemo(): Promise<string> {
  const root = join(base, 'The Salt Orchard')
  await cp(DEMO, root, { recursive: true })
  const sentence = 'The river was wide and brown and slow, and the ferry took its time crossing it. '
  const paragraphs = Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}. ${sentence.repeat(4).trim()}`)
  await appendFile(join(root, 'manuscript/the-crossing.md'), `\n${paragraphs.join('\n\n')}\n`)
  return root
}

async function openChapter(page: Page, file: string): Promise<void> {
  await page.locator(`[data-chapter="${file}"]`).first().click()
  await expect(page.locator('[aria-current="page"]')).toHaveAttribute('data-chapter', file)
}

/**
 * Scrolls the page so the paragraph starting with `start` is at the top, as reading down would. The
 * editor draws only the paragraphs near the screen, so it scrolls a screen at a time until it's drawn.
 */
async function scrollTo(page: Page, start: string): Promise<void> {
  await page.evaluate(async (text) => {
    const paper = document.querySelector('.paper')
    const root = document.querySelector('[data-testid="editor"]')?.shadowRoot
    for (let screens = 0; paper && screens < 100; screens++) {
      const line = [...(root?.querySelectorAll('.cm-line') ?? [])].find((element) => element.textContent?.startsWith(text))
      if (line) return line.scrollIntoView({ block: 'start' })
      paper.scrollTop += paper.clientHeight
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }
    throw new Error(`"${text}" is not in the chapter`)
  }, start)
}

/** The first paragraph whose text shows below the top of the page (the empty lines between paragraphs don't count). */
async function topParagraph(page: Page): Promise<string> {
  return page.evaluate(() => {
    const top = document.querySelector('.paper')?.getBoundingClientRect().top ?? 0
    const root = document.querySelector('[data-testid="editor"]')?.shadowRoot
    const line = [...(root?.querySelectorAll('.cm-line') ?? [])].find(
      (element) => element.textContent?.trim() && element.getBoundingClientRect().bottom > top + 8,
    )
    return line?.textContent?.split('.')[0] ?? ''
  })
}

test('Write returns each chapter to the paragraph that was at the top: across chapters, workspaces and restarts', async () => {
  const root = await longDemo()
  let page = await start(root)
  await page.getByTestId('open-project').click()
  await openChapter(page, 'manuscript/the-crossing.md')
  await scrollTo(page, 'Paragraph 30.')
  await expect.poll(() => topParagraph(page)).toBe('Paragraph 30')

  // Another chapter starts at its own top, and coming back returns to paragraph 30.
  await openChapter(page, 'manuscript/frost.md')
  await expect.poll(() => topParagraph(page)).toBe('The frost came early that year')
  await openChapter(page, 'manuscript/the-crossing.md')
  await expect.poll(() => topParagraph(page)).toBe('Paragraph 30')

  // Story hides Write; coming back finds the page where it was.
  await page.getByTestId('workspace-story').click()
  await page.getByTestId('workspace-write').click()
  await expect.poll(() => topParagraph(page)).toBe('Paragraph 30')

  // A different place, then quit: reopening the app returns there.
  await scrollTo(page, 'Paragraph 45.')
  await running?.app.close()
  page = await start(root)
  await expect(page.locator('[aria-current="page"]')).toHaveAttribute('data-chapter', 'manuscript/the-crossing.md')
  await expect.poll(() => topParagraph(page)).toBe('Paragraph 45')
})

test('reopening the app in Story, then going to Write, finds the page where it was', async () => {
  const root = await longDemo()
  let page = await start(root)
  await page.getByTestId('open-project').click()
  await openChapter(page, 'manuscript/the-crossing.md')
  await scrollTo(page, 'Paragraph 20.')
  await expect.poll(() => topParagraph(page)).toBe('Paragraph 20')
  await page.getByTestId('workspace-story').click()
  await running?.app.close()

  // Write loads the chapter while hidden behind Story, where nothing can be scrolled.
  page = await start(root)
  await expect(page.getByTestId('workspace-story')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('workspace-write').click()
  await expect(page.locator('[aria-current="page"]')).toHaveAttribute('data-chapter', 'manuscript/the-crossing.md')
  await expect.poll(() => topParagraph(page)).toBe('Paragraph 20')
})
