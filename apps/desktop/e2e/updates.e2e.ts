import { expect, test, type Page } from '@playwright/test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSettings, launch, openSettings, type Launched } from './launch'

// Update notices (Milestone 15), against a local server standing in for GitHub's latest.json.
const { version: CURRENT } = JSON.parse(await readFile(join(import.meta.dirname, '../package.json'), 'utf8')) as { version: string }

const release = (version: string) => ({
  format: 1,
  version,
  date: '2026-11-20',
  notes: `https://github.com/mooeypoo/plotdevice/releases/tag/v${version}`,
  download: { en: 'https://mooeypoo.github.io/plotdevice/start/install/', he: 'https://mooeypoo.github.io/plotdevice/he/start/install/' },
})

let userData = ''
let running: Launched | undefined
let server: Server | undefined
let served: unknown = release('9.0.0')
let requests = 0
let url = ''

test.beforeEach(async () => {
  userData = await mkdtemp(join(tmpdir(), 'plotdevice-updates-'))
  served = release('9.0.0')
  requests = 0
  server = createServer((_request, response) => {
    requests++
    if (served === 'offline') response.destroy()
    else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(served))
  })
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/latest.json`
})

test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  server?.closeAllConnections()
  await new Promise((resolve) => server?.close(resolve))
  await rm(userData, { recursive: true, force: true })
})

const start = async (): Promise<Page> => (running = await launch(userData, { PLOTDEVICE_TEST_UPDATE_URL: url })).page

async function openAbout(page: Page): Promise<void> {
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-about').click()
  await page.getByTestId('about').waitFor()
}

test('a newer version is mentioned quietly in the top bar, with links in the interface’s language', async () => {
  const page = await start()
  const notice = page.getByTestId('update-available')
  await expect(notice).toHaveText('Update available')
  await notice.click()
  await expect(page.getByText('Plot Device 9.0.0 is out.')).toBeVisible()
  await expect(page.getByTestId('update-notes')).toBeFocused()
  await expect(page.getByTestId('update-notes')).toHaveAttribute('href', 'https://github.com/mooeypoo/plotdevice/releases/tag/v9.0.0')
  await expect(page.getByTestId('update-download')).toHaveAttribute('href', 'https://mooeypoo.github.io/plotdevice/start/install/')
  await page.keyboard.press('Escape')

  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  await closeSettings(page)
  await notice.click()
  await expect(page.getByTestId('update-download')).toHaveAttribute('href', 'https://mooeypoo.github.io/plotdevice/he/start/install/')
  await expect(page.getByText('יצאה גרסה 9.0.0 של Plot Device.')).toBeVisible()
})

test('“Not now” stops mentioning that version, after a restart too, but a later version is mentioned', async () => {
  let page = await start()
  await page.getByTestId('update-available').click()
  await page.getByTestId('update-not-now').click()
  await expect(page.getByTestId('update-available')).toBeHidden()
  // The page tells the app in the background; quitting waits for saves the app has started, not for messages on the way.
  await expect.poll(() => readFile(join(userData, 'updates.json'), 'utf8').catch(() => '')).toContain('"dismissed": "9.0.0"')
  await running?.app.close()

  page = await start()
  await expect(page.getByTestId('app-menu')).toBeVisible()
  await expect.poll(() => requests).toBe(1) // answered today already: not asked again
  await expect(page.getByTestId('update-available')).toBeHidden()
  await running?.app.close()

  // A day later, a newer version is out.
  const state = JSON.parse(await readFile(join(userData, 'updates.json'), 'utf8')) as { checkedAt: number }
  await writeFile(join(userData, 'updates.json'), JSON.stringify({ ...state, checkedAt: state.checkedAt - 25 * 60 * 60 * 1000 }))
  served = release('9.1.0')
  page = await start()
  await expect(page.getByTestId('update-available')).toBeVisible()
  await page.getByTestId('update-available').click()
  await expect(page.getByText('Plot Device 9.1.0 is out.')).toBeVisible()
})

test('nothing is mentioned for the version already running, or when offline', async () => {
  served = release(CURRENT)
  let page = await start()
  await expect.poll(() => requests).toBe(1)
  await expect(page.getByTestId('update-available')).toBeHidden()
  await running?.app.close()

  await rm(join(userData, 'updates.json'))
  served = 'offline'
  page = await start()
  await expect.poll(() => requests).toBe(2)
  await expect(page.getByTestId('update-available')).toBeHidden()
})

test('turning checks off in Settings stops them; “Check for updates” in About still asks', async () => {
  served = release(CURRENT)
  let page = await start()
  await expect.poll(() => requests).toBe(1)
  await openSettings(page)
  const setting = page.getByTestId('check-for-updates-setting')
  await expect(setting).toBeChecked()
  await expect(page.getByText('Nothing about you or your writing is sent.')).toBeVisible()
  await setting.uncheck()
  await closeSettings(page)
  await expect.poll(() => readFile(join(userData, 'preferences.json'), 'utf8').catch(() => '')).toContain('"checkForUpdates": false')
  await running?.app.close()

  await rm(join(userData, 'updates.json'))
  served = release('9.0.0')
  page = await start()
  await openAbout(page)
  await page.getByTestId('check-for-updates').click()
  await expect(page.getByTestId('about-update')).toContainText('Plot Device 9.0.0 is out.')
  // Only this check asked: the automatic one, due at startup, didn't.
  expect(requests).toBe(2)
  await expect(page.getByTestId('update-available')).toBeHidden()

  served = release(CURRENT)
  await page.getByTestId('check-for-updates').click()
  await expect(page.getByTestId('about-update')).toContainText('You have the newest version.')

  served = 'offline'
  await page.getByTestId('check-for-updates').click()
  await expect(page.getByTestId('about-update')).toContainText("Couldn't check for updates")
})

test('the menu reports a problem with the version and system filled in, and suggests an idea', async () => {
  const page = await start()
  await page.evaluate(() => {
    const opened: string[] = []
    Object.assign(window, { opened })
    window.open = (address) => (opened.push(String(address)), null)
  })
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-report-problem').click()
  await page.getByTestId('app-menu').click()
  await page.getByTestId('menu-suggest-idea').click()
  const opened = await page.evaluate(() => (window as unknown as { opened: string[] }).opened)
  const problem = new URL(opened[0] ?? '')
  expect(`${problem.origin}${problem.pathname}`).toBe('https://github.com/mooeypoo/plotdevice/issues/new')
  expect(Object.fromEntries(problem.searchParams)).toEqual({
    template: 'problem.yml',
    version: CURRENT,
    system: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
  })
  expect(opened[1]).toBe('https://github.com/mooeypoo/plotdevice/issues/new?template=idea.yml')
})

test('About asks for a coffee, with the link inside the sentence in each language', async () => {
  const page = await start()
  await openAbout(page)
  const coffee = page.getByTestId('about-coffee')
  await expect(coffee).toHaveText(
    "Plot twist: this app runs on coffee. ☕ If Plot Device helps you write, you can buy me one. I'll put it toward the next chapter… of the code.",
  )
  await expect(coffee.getByRole('link', { name: 'buy me one' })).toHaveAttribute('href', 'https://buymeacoffee.com/mooeypoo')
  await page.keyboard.press('Escape')
  await openSettings(page)
  await page.getByTestId('language').selectOption('he')
  await closeSettings(page)
  await openAbout(page)
  await expect(coffee).toContainText('אפשר לקנות לי כוס קפה, והיא תלך לפרק הבא… של הקוד.')
  await expect(coffee.getByRole('link', { name: 'לקנות לי כוס קפה' })).toHaveAttribute('href', 'https://buymeacoffee.com/mooeypoo')
})
