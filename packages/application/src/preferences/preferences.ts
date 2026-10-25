import type { Locale, Preferences, PreferencesPatch, ThemePreference } from '@plotdevice/contracts'
import { err, ok, type Result } from '@plotdevice/shared'
import type { PreferencesStore, PreferencesWriteFailure } from './preferences-store'

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark']
const LOCALES: readonly Locale[] = ['en', 'he']

/** First-run settings: follow the system theme, and use Hebrew if the system is in Hebrew. */
export function defaultPreferences(systemLocale: string): Preferences {
  return { theme: 'system', locale: systemLocale.toLowerCase().startsWith('he') ? 'he' : 'en' }
}

/**
 * Reads saved settings, keeping every value that is still valid. Only text that isn't a JSON object
 * counts as unreadable; a single bad value just falls back to its default.
 */
export function parsePreferences(text: string, defaults: Preferences): Result<Preferences, 'unreadable'> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return err('unreadable')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return err('unreadable')
  const record = data as Record<string, unknown>
  return ok({
    theme: THEMES.find((t) => t === record.theme) ?? defaults.theme,
    locale: LOCALES.find((l) => l === record.locale) ?? defaults.locale,
  })
}

export interface LoadedPreferences {
  preferences: Preferences
  /** Set when an unreadable file was set aside and defaults were used instead. */
  notice?: 'reset-unreadable'
}

export async function loadPreferences(store: PreferencesStore, systemLocale: string): Promise<LoadedPreferences> {
  const defaults = defaultPreferences(systemLocale)
  const text = await store.read()
  if (text === null) return { preferences: defaults }
  const parsed = parsePreferences(text, defaults)
  if (parsed.ok) return { preferences: parsed.value }
  await store.setAside()
  return { preferences: defaults, notice: 'reset-unreadable' }
}

export interface PreferencesSession {
  current(): Preferences
  /** Queued: each change applies to the settings left by the previous one, never to a stale copy. */
  update(patch: PreferencesPatch): Promise<Result<Preferences, PreferencesWriteFailure>>
  /** Resolves once every queued change has been saved (or has failed). The app waits for this before quitting. */
  idle(): Promise<void>
}

/**
 * The settings in effect while the app runs. Updates are serialized: two quick changes (language,
 * then theme) must not both start from the old settings, or the second save would undo the first.
 */
export function createPreferencesSession(store: PreferencesStore, initial: Preferences): PreferencesSession {
  let current = initial
  let queue: Promise<unknown> = Promise.resolve()
  return {
    current: () => current,
    update(patch) {
      const run = queue.then(async () => {
        const saved = await updatePreferences(store, current, patch)
        if (saved.ok) current = saved.value
        return saved
      })
      queue = run.catch(() => undefined)
      return run
    },
    idle: async () => {
      // Changes may be queued while waiting, so wait until the queue stops growing.
      let seen: Promise<unknown> | undefined
      while (seen !== queue) {
        seen = queue
        await queue
      }
    },
  }
}

/** Applies a change and saves it. On failure, the settings in effect stay as they were. */
export async function updatePreferences(
  store: PreferencesStore,
  current: Preferences,
  patch: PreferencesPatch,
): Promise<Result<Preferences, PreferencesWriteFailure>> {
  // Field by field: a patch may carry `undefined`, which must not erase a setting.
  const next: Preferences = { theme: patch.theme ?? current.theme, locale: patch.locale ?? current.locale }
  const written = await store.write(`${JSON.stringify(next, null, 2)}\n`)
  return written.ok ? ok(next) : written
}
