import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { UiLanguageStore } from '../../ui-language'
import { writeTextFileAtomically } from '../fs/write-text-file-atomically'

const schema = z.object({ version: z.literal(1), locale: z.enum(['en', 'he']) })

/** Stores validated interface preferences atomically under Electron userData. */
export function createJsonUiLanguageStore(settingsFolder: string): UiLanguageStore {
  const filePath = join(settingsFolder, 'ui-preferences.json')
  return {
    async load() {
      let text: string
      try {
        text = await readFile(filePath, 'utf8')
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return { ok: true, value: undefined }
        return { ok: false, error: { code: 'ui-language-read', message: String(error) } }
      }
      let value: unknown
      try {
        value = JSON.parse(text) as unknown
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error
        return { ok: false, error: { code: 'ui-language-invalid', message: String(error) } }
      }
      const parsed = schema.safeParse(value)
      return parsed.success
        ? { ok: true, value: parsed.data.locale }
        : { ok: false, error: { code: 'ui-language-invalid', message: parsed.error.message } }
    },
    async save(locale) {
      const parsed = schema.safeParse({ version: 1, locale })
      if (!parsed.success)
        return {
          ok: false,
          error: { code: 'ui-language-invalid-request', message: parsed.error.message }
        }
      try {
        await mkdir(settingsFolder, { recursive: true })
        await writeTextFileAtomically(filePath, `${JSON.stringify(parsed.data, null, 2)}\n`)
        return { ok: true, value: undefined }
      } catch (error) {
        return { ok: false, error: { code: 'ui-language-write', message: String(error) } }
      }
    }
  }
}
