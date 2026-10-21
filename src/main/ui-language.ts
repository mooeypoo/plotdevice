import type { ApiError, ApiResult, UiLanguageDto, UiLocale } from '../contract/dtos'
import { isUiLocale, systemUiLocale } from '../i18n/locales'

/** Per-user language persistence, outside every novel folder. */
export interface UiLanguageStore {
  load: () => Promise<ApiResult<UiLocale | undefined>>
  save: (locale: UiLocale) => Promise<ApiResult<void>>
}

/** Serialized app-wide locale changes and post-persistence notifications. */
export interface UiLanguageService {
  current(): UiLanguageDto
  set(locale: unknown): Promise<ApiResult<UiLanguageDto>>
  onChanged(listener: (settings: UiLanguageDto) => void): () => void
}

/** Loads language before the window is shown; failed switches retain the active language. */
export async function createUiLanguageService(
  store: UiLanguageStore,
  systemLanguages: readonly string[],
  report: (error: ApiError) => void
): Promise<UiLanguageService> {
  const loaded = await store.load()
  if (!loaded.ok) report(loaded.error)
  let current: UiLanguageDto = loaded.ok
    ? { locale: loaded.value ?? systemUiLocale(systemLanguages) }
    : {
        locale: systemUiLocale(systemLanguages),
        notice: loaded.error.code === 'ui-language-invalid' ? 'invalid-settings' : 'load-failed'
      }
  const listeners = new Set<(settings: UiLanguageDto) => void>()
  let pending = Promise.resolve()
  return {
    current: () => current,
    set(locale) {
      if (!isUiLocale(locale)) {
        const error = {
          code: 'ui-language-invalid-request',
          message: 'Unsupported interface language.'
        }
        report(error)
        return Promise.resolve({ ok: false, error })
      }
      const changing = pending.then(async (): Promise<ApiResult<UiLanguageDto>> => {
        const saved = await store.save(locale)
        if (!saved.ok) {
          report(saved.error)
          return saved
        }
        current = { locale }
        for (const listener of listeners) listener(current)
        return { ok: true, value: current }
      })
      pending = changing.then(() => undefined)
      return changing
    },
    onChanged(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}
