import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const executable =
  process.env.PLOTDEVICE_PACKAGED ??
  join(import.meta.dirname, '..', 'dist', process.platform === 'win32' ? 'win-unpacked/plotdevice.exe' : 'linux-unpacked/plotdevice')

function sandboxBlocked(): boolean {
  if (process.platform !== 'linux') return false
  try {
    return readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim() === '1'
  } catch {
    return false
  }
}

let base = ''
let app: ElectronApplication | undefined
let messages: string[] = []

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-packaged-'))
  messages = []
})
test.afterEach(async () => {
  await app?.close()
  app = undefined
  await rm(base, { recursive: true, force: true })
})

/** Starts the installed app as an author would, with its settings in `userData` unless told otherwise. */
async function start(args: string[], userData: string | null = join(base, 'user-data')): Promise<Page> {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[0] !== 'ELECTRON_RUN_AS_NODE' && entry[1] !== undefined),
  )
  app = await electron.launch({
    executablePath: executable,
    args: [...(userData ? [`--user-data-dir=${userData}`] : []), ...(sandboxBlocked() ? ['--no-sandbox'] : []), ...args],
    env,
  })
  const page = await app.firstWindow()
  page.on('console', (message) => messages.push(message.text()))
  await page.locator('.shell').waitFor()
  return page
}

async function sampleNovel(): Promise<string> {
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  return root
}

test('the installed app opens a novel, and saves what the author writes', async () => {
  const root = await sampleNovel()
  const page = await start([root])
  await expect(page.locator('.project-title')).toHaveText('The Salt Orchard')
  await page.locator('[data-chapter="manuscript/frost.md"]').first().click()
  await page.locator('.cm-line', { hasText: 'Ilka asked' }).click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Written in the installed app.')
  await expect(page.getByTestId('save-status')).toHaveText('Saved')
  await expect.poll(() => readFile(join(root, 'manuscript/frost.md'), 'utf8')).toContain('Written in the installed app.')
  expect(messages.filter((message) => /Content.Security.Policy/i.test(message))).toEqual([])
})

test('it knows its name and version, and shows the licence and credits it ships with', async () => {
  const page = await start([])
  // Electron's own name is the package's (`plotdevice`, matching the desktop entry); authors see the title.
  expect(await app?.evaluate(({ app: electronApp }) => electronApp.getVersion())).toBe('0.2.0')
  expect(await page.title()).toBe('Plot Device')
  await page.locator('.settings-menu summary').click()
  await page.getByTestId('open-about').click()
  await page.getByText(/Open-source components/).click()
  await expect(page.getByTestId('credits')).toContainText('electron')
  await page.getByText('The full licence').click()
  await expect(page.locator('.license')).toContainText('GNU GENERAL PUBLIC LICENSE')
})

test('settings go to the plotdevice folder (checked in CI only, never on a developer machine)', async () => {
  test.skip(!process.env.CI, 'would write into the real Plot Device settings folder')
  await start([], null)
  const folder = await app?.evaluate(({ app: electronApp }) => electronApp.getPath('userData'))
  expect(folder?.split(/[\\/]/).at(-1)).toBe('plotdevice')
})

test('upgrading over the old app: its settings files are left as they were, and new ones are added', async () => {
  const userData = join(base, 'user-data')
  await mkdir(userData)
  const old = {
    'ui-preferences.json': '{"locale":"he","theme":"dark"}\n',
    'window-state.json': '{"width":1200,"height":800}\n',
    'recent-projects.json': '{"version":1,"projects":[{"root":"/home/ines/old","title":"Old"}]}\n',
  }
  for (const [name, text] of Object.entries(old)) await writeFile(join(userData, name), text)
  const page = await start([], userData)
  await page.locator('.settings-menu summary').click()
  await page.getByTestId('theme').selectOption('dark')
  await expect.poll(() => readFile(join(userData, 'preferences.json'), 'utf8').catch(() => '')).toContain('"theme": "dark"')
  for (const [name, text] of Object.entries(old)) expect(await readFile(join(userData, name), 'utf8')).toBe(text)
})
