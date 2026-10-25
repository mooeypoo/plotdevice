import { expect, test } from '@playwright/test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { palettes } from '../../../packages/ui-vue/src/theme/tokens'
import { launch, openSettings, type Launched } from './launch'

let userData = ''
let running: Launched | undefined

test.beforeEach(async () => {
  userData = await mkdtemp(join(tmpdir(), 'plotdevice-e2e-'))
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(userData, { recursive: true, force: true })
})

/** A colour as the browser reports it, e.g. `rgb(25, 30, 39)`. */
const rgb = (hex: string): string => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`

test('the page is isolated: no Node, no require, only the typed bridge', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  const exposed = await running.page.evaluate(() => {
    const scope = globalThis as unknown as Record<string, unknown>
    return {
      process: typeof scope.process,
      require: typeof scope.require,
      bridge: Object.keys((window as unknown as { plotDevice: object }).plotDevice).sort(),
    }
  })
  // Listed in full, so widening the bridge is always a deliberate change.
  const bridge = [
    'cardsAbout',
    'changeContents',
    'createOutline',
    'createProject',
    'createReference',
    'editOutline',
    'flushed',
    'forgetRecentProject',
    'getAppInfo',
    'getOpenProject',
    'getPreferences',
    'getRecentProjects',
    'getShelf',
    'leftOff',
    'listOutlines',
    'listReferences',
    'onEvent',
    'openChapter',
    'openOutline',
    'openProject',
    'readReference',
    'rememberPlace',
    'renameChapter',
    'renameChapterFile',
    'renameReference',
    'resolveConflict',
    'saveChapter',
    'setPreferences',
    'setShelf',
    'undoOutline',
  ]
  expect(exposed).toEqual({ process: 'undefined', require: 'undefined', bridge })
})

test('switching to Hebrew flips the interface to right-to-left without reloading the page', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  const { page } = running
  await page.evaluate(() => ((window as unknown as { marker: string }).marker = 'still here'))
  await page.getByTestId('language').selectOption('he')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  await expect(page.getByText('מקום שקט לכתוב בו את הרומן שלך.')).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('still here')
})

test('switching to the dark theme changes colours without reloading the page', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  const { page } = running
  await page.evaluate(() => ((window as unknown as { marker: string }).marker = 'still here'))
  await page.getByTestId('theme').selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(palettes.dark.app))
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('still here')
})

test('regression: two quick changes both stick (language, then theme, without waiting)', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  await running.page.getByTestId('language').selectOption('he')
  await running.page.getByTestId('theme').selectOption('dark')
  await expect(running.page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(running.page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await running.app.close()
  running = await launch(userData)
  await openSettings(running.page)
  await expect(running.page.getByTestId('language')).toHaveValue('he')
  await expect(running.page.getByTestId('theme')).toHaveValue('dark')
})

test('regression: closing the app right after a change still saves it (Windows saves are slower)', async () => {
  running = await launch(userData, { PLOTDEVICE_TEST_SAVE_DELAY_MS: '1500' })
  await openSettings(running.page)
  await running.page.getByTestId('theme').selectOption('dark')
  await running.page.getByTestId('language').selectOption('he')
  await running.app.close() // immediately, while both saves are still running
  running = await launch(userData)
  await openSettings(running.page)
  await expect(running.page.getByTestId('theme')).toHaveValue('dark')
  await expect(running.page.getByTestId('language')).toHaveValue('he')
})

test('regression: the footer shows the app version, not Electron\'s', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  const { version } = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { version: string }
  await expect(running.page.getByText(`Version ${version}`)).toBeVisible()
})

test('language and theme are remembered after a restart', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  await running.page.getByTestId('language').selectOption('he')
  await running.page.getByTestId('theme').selectOption('dark')
  await expect(running.page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await running.app.close()

  running = await launch(userData)
  await openSettings(running.page)
  await expect(running.page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(running.page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(running.page.getByTestId('theme')).toHaveValue('dark')
})

test('the strict Content-Security-Policy is in force and nothing violates it', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  const { page } = running
  const messages: string[] = []
  page.on('console', (message) => messages.push(message.text()))
  await page.reload() // capture everything from a fresh load
  await openSettings(page)
  await page.getByTestId('theme').selectOption('dark')
  await page.getByTestId('language').selectOption('he')
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(policy).toContain("style-src 'self';")
  expect(policy).not.toContain('unsafe-inline')
  expect(messages.filter((text) => /Content Security Policy|Refused to/i.test(text))).toEqual([])
})

test('the host refuses invalid settings from the page and keeps the current ones', async () => {
  running = await launch(userData)
  await openSettings(running.page)
  const outcome = await running.page.evaluate(() =>
    (window as unknown as { plotDevice: { setPreferences(p: unknown): Promise<unknown> } }).plotDevice.setPreferences({ theme: 'neon' }).then(
      () => 'accepted',
      (error: Error) => error.message,
    ),
  )
  expect(outcome).toContain('invalid-payload')
  await expect(running.page.getByTestId('theme')).toHaveValue('system')
})

test('an unreadable settings file falls back to defaults and is kept, not deleted', async () => {
  await writeFile(join(userData, 'preferences.json'), '{{ this is not json')
  running = await launch(userData)
  await openSettings(running.page)
  await expect(running.page.getByTestId('theme')).toHaveValue('system')
  const files = await readdir(userData)
  expect(files.filter((name) => name.startsWith('preferences.unreadable-'))).toHaveLength(1)
})
