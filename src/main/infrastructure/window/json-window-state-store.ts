import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { err, ok } from '../../shared-kernel/result'
import { validateWindowState, type WindowStateStore } from '../../window-state'
import { writeTextFileAtomically } from '../fs/write-text-file-atomically'

/** Persists only app-window settings, atomically, in Electron's userData directory. */
export function createJsonWindowStateStore(settingsFolder: string): WindowStateStore {
  const filePath = join(settingsFolder, 'window-state.json')
  return {
    load: async () => {
      let text: string
      try {
        text = await readFile(filePath, 'utf8')
      } catch (error) {
        if (isMissingFile(error)) return ok(undefined)
        return err({ code: 'read-window-state', message: String(error) })
      }
      let value: unknown
      try {
        value = JSON.parse(text) as unknown
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error
        return err({ code: 'invalid-window-state', message: String(error) })
      }
      return validateWindowState(value)
    },
    save: async (state) => {
      const validated = validateWindowState(state)
      if (!validated.ok) return validated
      try {
        await mkdir(settingsFolder, { recursive: true })
        await writeTextFileAtomically(filePath, `${JSON.stringify(validated.value, null, 2)}\n`)
        return ok(undefined)
      } catch (error) {
        return err({ code: 'write-window-state', message: String(error) })
      }
    }
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
