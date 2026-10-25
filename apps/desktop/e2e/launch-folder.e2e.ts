import { expect, test } from '@playwright/test'
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { launch, launchAgain, type Launched } from './launch'

const FIXTURE = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')

let base = ''
let running: Launched | undefined

test.beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-launch-'))
})
test.afterEach(async () => {
  await running?.app.close()
  running = undefined
  await rm(base, { recursive: true, force: true })
})

test('a folder given at launch opens straight away ("Open with Plot Device")', async () => {
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  running = await launch(join(base, 'user-data'), {}, [pathToFileURL(root).href])
  await expect(running.page.locator('.project-title')).toHaveText('The Salt Orchard')
  await expect(running.page.locator('.cm-content')).toContainText('Before the orchard')
})

test('a folder that is not a project is explained, not opened', async () => {
  const empty = join(base, 'Just a folder')
  await mkdir(empty)
  running = await launch(join(base, 'user-data'), {}, [empty])
  await expect(running.page.getByRole('alert')).toContainText("isn't a Plot Device project")
  await expect(running.page.getByTestId('open-project')).toBeVisible()
})

test('a second launch hands its folder to the running app, and exits', async () => {
  const first = join(base, 'First')
  const second = join(base, 'The Salt Orchard')
  await mkdir(first)
  await cp(FIXTURE, second, { recursive: true })
  const userData = join(base, 'user-data')
  running = await launch(userData)
  expect(await launchAgain(userData, [second])).toBe(0)
  await expect(running.page.locator('.project-title')).toHaveText('The Salt Orchard')
})
