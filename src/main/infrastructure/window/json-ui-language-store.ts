import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { ApiResult } from '../../../contract/dtos'
import type { UiLanguageStore } from '../../ui-language'
import type { UiThemeStore } from '../../ui-theme'
import { writeTextFileAtomically } from '../fs/write-text-file-atomically'

const schema = z.object({
  version: z.literal(1),
  locale: z.enum(['en', 'he']).optional(),
  theme: z.enum(['system', 'dark', 'light']).optional()
})
type Preferences = z.infer<typeof schema>

/**
 * Interface preferences (language and theme) in one validated file under Electron userData,
 * written atomically. Saving one keeps the other; writes run one at a time.
 */
export function createJsonUiPreferences(settingsFolder: string): {
  readonly language: UiLanguageStore
  readonly theme: UiThemeStore
} {
  const filePath = join(settingsFolder, 'ui-preferences.json')
  let writing: Promise<unknown> = Promise.resolve()

  async function read(): Promise<ApiResult<Preferences | undefined>> {
    let text: string
    try {
      text = await readFile(filePath, 'utf8')
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')
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
      ? { ok: true, value: parsed.data }
      : { ok: false, error: { code: 'ui-language-invalid', message: parsed.error.message } }
  }

  function save(change: Partial<Preferences>): Promise<ApiResult<void>> {
    const saving = writing.then(async (): Promise<ApiResult<void>> => {
      const current = await read()
      const parsed = schema.safeParse({
        ...(current.ok ? current.value : undefined),
        ...change,
        version: 1
      })
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
    })
    writing = saving
    return saving
  }

  return {
    language: {
      load: async () => {
        const loaded = await read()
        return loaded.ok ? { ok: true, value: loaded.value?.locale } : loaded
      },
      save: (locale) => save({ locale })
    },
    theme: {
      load: async () => {
        const loaded = await read()
        return loaded.ok ? { ok: true, value: loaded.value?.theme } : loaded
      },
      save: (theme) => save({ theme })
    }
  }
}

/** The language half of {@link createJsonUiPreferences}. */
export function createJsonUiLanguageStore(settingsFolder: string): UiLanguageStore {
  return createJsonUiPreferences(settingsFolder).language
}
