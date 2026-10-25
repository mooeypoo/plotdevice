import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppDataFile, PreferencesStore } from '@plotdevice/application'
import { err, ok } from '@plotdevice/shared'
import { AtomicWriteError, writeAtomically } from './atomic-write'

/** `<name>.json` in the app-data folder, written atomically. */
export function createAppDataFile(directory: string, name: string): AppDataFile {
  const path = join(directory, `${name}.json`)
  return {
    async read() {
      try {
        return await readFile(path, 'utf8')
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw cause
      }
    },
    async write(text) {
      try {
        await writeAtomically(path, new TextEncoder().encode(text))
        return ok(undefined)
      } catch (cause) {
        if (cause instanceof AtomicWriteError) return err(cause.code)
        throw cause
      }
    },
    async setAside() {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      await rename(path, join(directory, `${name}.unreadable-${stamp}.json`)).catch(() => undefined)
    },
  }
}

/** Personal settings as `preferences.json` in the app-data folder. */
export function createPreferencesFileStore(directory: string): PreferencesStore {
  return createAppDataFile(directory, 'preferences')
}
