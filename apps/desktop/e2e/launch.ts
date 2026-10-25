import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const electronPath = createRequire(import.meta.url)('electron') as string
// The app folder, not the main file: Electron reads the app's name and version from its package.json.
const appFolder = join(import.meta.dirname, '..')

/**
 * Ubuntu 24.04+ blocks the unprivileged user namespaces Chromium's sandbox needs. Locally that means
 * `--no-sandbox`; CI lifts the restriction instead, so the sandbox stays on there.
 */
function chromiumSandboxBlocked(): boolean {
  if (process.platform !== 'linux') return false
  try {
    return readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim() === '1'
  } catch {
    return false
  }
}

export interface Launched {
  app: ElectronApplication
  page: Page
}

/** Starts the built app with its settings in `userData`, and waits for the interface. */
export async function launch(userData: string, extraEnv: Record<string, string> = {}): Promise<Launched> {
  // VS Code's extension host sets ELECTRON_RUN_AS_NODE, which would turn Electron into plain Node.
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[0] !== 'ELECTRON_RUN_AS_NODE' && entry[1] !== undefined))
  const app = await electron.launch({
    executablePath: electronPath,
    args: [appFolder, ...(chromiumSandboxBlocked() ? ['--no-sandbox'] : [])],
    env: { ...env, ...extraEnv, PLOTDEVICE_USER_DATA: userData },
  })
  const page = await app.firstWindow()
  await page.getByTestId('language').waitFor()
  return { app, page }
}
