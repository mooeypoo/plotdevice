import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import type { PreferencesStore } from '@plotdevice/application'
import { err, ok } from '@plotdevice/shared'
import { AtomicWriteError, writeAtomically } from './atomic-write'

const FILE = 'preferences.json'

/** Personal settings as `preferences.json` in the app-data folder, written atomically. */
export function createPreferencesFileStore(directory: string): PreferencesStore {
  const path = join(directory, FILE)
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
      await rename(path, join(directory, `preferences.unreadable-${stamp}.json`)).catch(() => undefined)
    },
  }
}
