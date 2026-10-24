import type { ApiError, ApiResult, UiTheme } from '../contract/dtos'

/** Per-user theme persistence, beside the interface language and outside every novel folder. */
export interface UiThemeStore {
  load: () => Promise<ApiResult<UiTheme | undefined>>
  save: (theme: UiTheme) => Promise<ApiResult<void>>
}

/** The app's theme: following the system, or always dark or light. */
export interface UiThemeService {
  current(): UiTheme
  set(theme: unknown): Promise<ApiResult<UiTheme>>
}

const THEMES: readonly UiTheme[] = ['system', 'dark', 'light']
const isUiTheme = (value: unknown): value is UiTheme => THEMES.some((theme) => theme === value)

/**
 * Restores the theme before the window opens and applies it (Electron's `nativeTheme`, which the
 * renderer's `prefers-color-scheme` and the native menus follow). A failed save keeps the old one.
 */
export async function createUiThemeService(
  store: UiThemeStore,
  apply: (theme: UiTheme) => void,
  report: (error: ApiError) => void
): Promise<UiThemeService> {
  const loaded = await store.load()
  if (!loaded.ok) report(loaded.error)
  let current: UiTheme = loaded.ok ? (loaded.value ?? 'system') : 'system'
  apply(current)
  let pending = Promise.resolve()
  return {
    current: () => current,
    set(theme) {
      if (!isUiTheme(theme)) {
        const error = { code: 'ui-theme-invalid-request', message: 'Unsupported theme.' }
        report(error)
        return Promise.resolve({ ok: false, error })
      }
      const changing = pending.then(async (): Promise<ApiResult<UiTheme>> => {
        const saved = await store.save(theme)
        if (!saved.ok) {
          report(saved.error)
          return saved
        }
        current = theme
        apply(theme)
        return { ok: true, value: theme }
      })
      pending = changing.then(() => undefined)
      return changing
    }
  }
}
