import type { UiLocale } from '../contract/dtos'

/** Bundled language autonyms and explicit interface direction. */
export const UI_LANGUAGES = [
  { locale: 'en', name: 'English', direction: 'ltr' },
  { locale: 'he', name: 'עברית', direction: 'rtl' }
] as const

/** Narrows untrusted preferences and IPC arguments to a bundled locale. */
export function isUiLocale(value: unknown): value is UiLocale {
  return value === 'en' || value === 'he'
}

/** Selects the first supported system language, including legacy Hebrew tags. */
export function systemUiLocale(languages: readonly string[]): UiLocale {
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/u)[0]
    if (base === 'he' || base === 'iw') return 'he'
    if (base === 'en') return 'en'
  }
  return 'en'
}

/** Interface direction is independent from manuscript text direction. */
export function uiDirection(locale: UiLocale): 'ltr' | 'rtl' {
  return locale === 'he' ? 'rtl' : 'ltr'
}
