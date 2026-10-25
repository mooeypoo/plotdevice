import { expect, test, type Page } from '@playwright/test'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, openSettings, type Launched } from './launch'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let userData = ''
let running: Launched | undefined
let pageMessages: string[] = []

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-writing-'))
  userData = join(base, 'user-data')
  pageMessages = []
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

/** Starts the app; every folder dialog "chooses" `folder`. Console messages are kept, to check for CSP violations. */
async function start(folder: string, extraEnv: Record<string, string> = {}): Promise<Page> {
  running = await launch(userData, { PLOTDEVICE_TEST_CHOOSE_FOLDER: folder, ...extraEnv })
  running.page.on('console', (message) => pageMessages.push(message.text()))
  return running.page
}

/** A copy of the sample novel, opened in the app. */
async function openSampleNovel(extraEnv: Record<string, string> = {}): Promise<{ page: Page; root: string }> {
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  const page = await start(root, extraEnv)
  await page.getByTestId('open-project').click()
  await page.locator('.cm-content').waitFor()
  return { page, root }
}

async function openChapter(page: Page, file: string): Promise<void> {
  await page.locator(`[data-chapter="${file}"]`).first().click()
  await expect(page.locator('[aria-current="page"]')).toHaveAttribute('data-chapter', file)
}

/** Puts the caret at the end of the chapter's last paragraph (or in the empty chapter) and types. */
async function typeAtEnd(page: Page, text: string): Promise<void> {
  const lastLine = page.locator('.cm-line').filter({ hasText: /\S/ }).last()
  if ((await lastLine.count()) > 0) {
    await lastLine.click()
    await page.keyboard.press('End')
  } else {
    await page.locator('.cm-content').click()
  }
  await page.keyboard.type(text)
}

/** Selects exactly `phrase` in the editor, as a mouse drag would. */
async function selectInEditor(page: Page, phrase: string): Promise<void> {
  await page.evaluate((target) => {
    const root = document.querySelector('[data-testid="editor"]')?.shadowRoot
    const walker = root ? document.createTreeWalker(root, NodeFilter.SHOW_TEXT) : null
    for (let node = walker?.nextNode(); node; node = walker?.nextNode()) {
      const start = node.textContent?.indexOf(target) ?? -1
      if (start >= 0) {
        document.getSelection()?.setBaseAndExtent(node, start, node, start + target.length)
        return
      }
    }
    throw new Error(`"${target}" not found in the editor`)
  }, phrase)
}

async function createProject(page: Page, title: string, language: 'en' | 'he'): Promise<void> {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-title').fill(title)
  await page.getByTestId('new-project-language').selectOption(language)
  await page.getByTestId('new-project-create').click()
  await page.getByTestId('navigator').waitFor()
}

async function newChapter(page: Page, title: string): Promise<void> {
  await page.getByTestId('new-chapter').click()
  await page.getByTestId('prompt-input').fill(title)
  await page.getByTestId('prompt-input').press('Enter')
  await expect(page.locator('[aria-current="page"]')).toContainText(title)
}

const read = (root: string, path: string): Promise<string> => readFile(join(root, path), 'utf8')
const cspViolations = (): string[] => pageMessages.filter((message) => /Content.Security.Policy/i.test(message))

test('scenario A: create a project, write the first chapter, quit, and find it all after reopening', async () => {
  let page = await start(base)
  await createProject(page, 'The Salt Orchard', 'en')
  await newChapter(page, 'Chapter One')
  await typeAtEnd(page, 'Before the orchard, there was the river.')
  await expect(page.getByTestId('save-status')).toHaveText('Saved')
  await running?.app.close()

  const root = join(base, 'The Salt Orchard')
  expect(await read(root, 'manuscript/chapter-one.md')).toMatch(/^---\ntitle: Chapter One\nid: ch-[0-9a-z]{6}\n---\nBefore the orchard, there was the river\.$/)
  expect(await read(root, 'CONTENTS.md')).toContain('[Chapter One](manuscript/chapter-one.md)')

  // Reopening returns to the same project and chapter (PRD G2).
  page = await start(base)
  await expect(page.locator('.cm-content')).toHaveText('Before the orchard, there was the river.')
  await expect(page.locator('.project-title')).toHaveText('The Salt Orchard')
  expect(cspViolations()).toEqual([])
})

test('scenario F: Hebrew prose with an English phrase, in a Hebrew interface, saved and reopened intact', async () => {
  let page = await start(base)
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  await page.locator('.settings-menu summary').click()
  await createProject(page, 'מטע המלח', 'he')
  await newChapter(page, 'פרק ראשון')
  await typeAtEnd(page, 'נואל ענה: It was never anyone\'s orchard ושתק.')
  await selectInEditor(page, "It was never anyone's orchard")
  await page.getByTestId('direction-menu').click()
  await page.getByTestId('menu-phrase-ltr').click()
  await expect(page.getByTestId('save-status')).toHaveText('נשמר')
  await expect(page.locator('.cm-content')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('.cm-dir-span')).toHaveAttribute('dir', 'ltr')
  await running?.app.close()

  const root = join(base, 'מטע המלח')
  expect(await read(root, 'manuscript/פרק-ראשון.md')).toMatch(/\nנואל ענה: \[It was never anyone's orchard\]\{dir=ltr\} ושתק\.$/)

  page = await start(base)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  // The marker stays hidden: the author sees only the prose.
  await expect(page.locator('.cm-content')).toHaveText("נואל ענה: It was never anyone's orchard ושתק.")
})

test('scenario G: a chapter changed elsewhere while the author types; "keep both" keeps both', async () => {
  const { page, root } = await openSampleNovel()
  await openChapter(page, 'manuscript/frost.md')
  const theirs = '---\ntitle: Frost\nid: ch-p0n1zz\n---\nChanged in another app.\n'
  await typeAtEnd(page, ' Mine.')
  await writeFile(join(root, 'manuscript/frost.md'), theirs)
  await page.getByTestId('conflict-dialog').waitFor()
  await page.getByTestId('conflict-keep-both').click()

  await expect(page.locator('.cm-content')).toHaveText('Changed in another app.')
  await expect(page.getByTestId('not-in-book')).toContainText('Frost (my version)')
  expect(await read(root, 'manuscript/frost.md')).toBe(theirs)
  expect(await read(root, 'manuscript/frost-my-version.md')).toMatch(/Ilka asked\. Mine\.\n$/)
  expect(cspViolations()).toEqual([])
})

test('scenario G: "use my version" replaces the other version only once chosen', async () => {
  const { page, root } = await openSampleNovel()
  await openChapter(page, 'manuscript/frost.md')
  await typeAtEnd(page, ' Mine.')
  await writeFile(join(root, 'manuscript/frost.md'), '---\ntitle: Frost\nid: ch-p0n1zz\n---\nChanged in another app.\n')
  await page.getByTestId('conflict-dialog').waitFor()
  expect(await read(root, 'manuscript/frost.md')).toContain('Changed in another app.')
  await page.getByTestId('conflict-use-mine').click()
  await expect(page.getByTestId('save-status')).toHaveText('Saved')
  expect(await read(root, 'manuscript/frost.md')).toMatch(/Ilka asked\. Mine\.\n$/)
})

test('a chapter changed elsewhere with no unsaved edits reloads quietly', async () => {
  const { page, root } = await openSampleNovel()
  await openChapter(page, 'manuscript/frost.md')
  await writeFile(join(root, 'manuscript/frost.md'), '---\ntitle: Frost\nid: ch-p0n1zz\n---\nRewritten in another app.\n')
  await expect(page.locator('.cm-content')).toHaveText('Rewritten in another app.')
  await expect(page.getByTestId('conflict-dialog')).toHaveCount(0)
})

test('scenario H: theme, language and focus mode keep the same editor, the cursor and undo history', async () => {
  const { page } = await openSampleNovel()
  await openChapter(page, 'manuscript/frost.md')
  await page.evaluate(() => {
    ;(window as unknown as { editorElement: Element | null }).editorElement = document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelector('.cm-editor') ?? null
  })
  await typeAtEnd(page, ' One')

  await openSettings(page)
  await page.getByTestId('theme').selectOption('dark')
  await page.getByTestId('language').selectOption('he')
  await page.locator('.settings-menu summary').click()
  await page.getByTestId('focus-mode').click()
  await expect(page.getByTestId('navigator')).toHaveCount(0)
  await page.getByTestId('leave-focus').click()

  const sameEditor = await page.evaluate(
    () => (window as unknown as { editorElement: Element | null }).editorElement === document.querySelector('[data-testid="editor"]')?.shadowRoot?.querySelector('.cm-editor'),
  )
  expect(sameEditor).toBe(true)
  await page.keyboard.type(' Two') // the cursor is where it was
  await expect(page.locator('.cm-content')).toContainText('Ilka asked. One Two')
  await page.keyboard.press('Control+z')
  await expect(page.locator('.cm-content')).not.toContainText('One Two')
})

test('the keyboard reorders chapters: Alt+Down moves the focused chapter, which keeps focus', async () => {
  const { page, root } = await openSampleNovel()
  await page.locator('[data-chapter="manuscript/the-crossing.md"]').focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect
    .poll(async () => {
      const contents = await read(root, 'CONTENTS.md')
      return contents.indexOf('the-orchard-gate.md') < contents.indexOf('the-crossing.md')
    })
    .toBe(true)
  await expect(page.locator('[data-chapter="manuscript/the-crossing.md"]')).toBeFocused()
})

test('regression: quitting right after typing still saves the text (slow saves, as on Windows)', async () => {
  const { page, root } = await openSampleNovel({ PLOTDEVICE_TEST_SAVE_DELAY_MS: '1500' })
  await openChapter(page, 'manuscript/frost.md')
  await typeAtEnd(page, ' Typed just before quitting.')
  const closed = running?.app.waitForEvent('close')
  await running?.app.evaluate(({ app }) => app.quit())
  await closed
  running = undefined
  expect(await read(root, 'manuscript/frost.md')).toMatch(/Typed just before quitting\.\n$/)
})

test('regression: closing the window right after typing still saves the text', async () => {
  const { page, root } = await openSampleNovel({ PLOTDEVICE_TEST_SAVE_DELAY_MS: '1500' })
  await openChapter(page, 'manuscript/frost.md')
  await typeAtEnd(page, ' Typed just before closing.')
  const closed = running?.app.waitForEvent('close')
  await running?.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
  await closed
  running = undefined
  expect(await read(root, 'manuscript/frost.md')).toMatch(/Typed just before closing\.\n$/)
})

test('a project folder holds only the novel: no app files are added', async () => {
  const { page, root } = await openSampleNovel()
  await openChapter(page, 'manuscript/frost.md')
  await typeAtEnd(page, ' More.')
  await expect(page.getByTestId('save-status')).toHaveText('Saved')
  const before = (await readdir(FIXTURE, { recursive: true })).sort()
  expect((await readdir(root, { recursive: true })).sort()).toEqual(before)
})

/** Controls on the page without an accessible name, as a screen reader would announce them. */
async function unnamedControls(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, select, input, [role="menuitem"], [contenteditable="true"]')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => {
        const labelled = element.getAttribute('aria-labelledby')
        const name = element.getAttribute('aria-label') ?? (labelled ? document.getElementById(labelled)?.textContent : null) ?? element.closest('label')?.textContent ?? element.textContent
        return !name?.trim()
      })
      .map((element) => element.outerHTML.slice(0, 80)),
  )
}

test('accessibility: every control is named, in English and in Hebrew', async () => {
  const { page } = await openSampleNovel()
  await page.getByTestId('format-menu').click()
  expect(await unnamedControls(page)).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.locator('.cm-content')).toHaveAttribute('aria-label', 'Chapter text')
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  expect(await unnamedControls(page)).toEqual([])
  await expect(page.locator('.cm-content')).toHaveAttribute('aria-label', 'טקסט הפרק')
})

test('accessibility: formatting works from the keyboard alone', async () => {
  const { page, root } = await openSampleNovel()
  await openChapter(page, 'manuscript/prologue.md')
  await expect(page.locator('.cm-content')).toBeFocused()
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home') // select the paragraph's text
  await page.getByTestId('format-menu').focus()
  await page.keyboard.press('ArrowDown') // opens the menu on its first item
  await expect(page.getByTestId('menu-format-bold')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('menu-format-italic')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.cm-content')).toBeFocused()
  await expect(page.getByTestId('save-status')).toHaveText('Saved')
  expect(await read(root, 'manuscript/prologue.md')).toMatch(/\n\*Before the orchard, there was the river\.\*\n$/)
})
