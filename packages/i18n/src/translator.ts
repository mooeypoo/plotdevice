import Banana from 'banana-i18n'
import en from './messages/en.json'
import he from './messages/he.json'

/** Keyed messages in banana format: placeholders `$1`, plurals `{{PLURAL:$1|…}}`, gender `{{GENDER:…}}`. */
export type Messages = Record<string, string>

/** The interface's own catalogs. The `@metadata` entries are documentation, not messages. */
export const catalogs: Record<string, Messages> = { en: withoutMetadata(en), he: withoutMetadata(he) }

const FALLBACK = 'en'
const RTL_UI_LOCALES = new Set(['he', 'ar', 'fa'])

export type Translate = (locale: string, key: string, ...params: (string | number)[]) => string

/**
 * The single translation facade (`AGENTS.md`): code asks for a key, never for an English string.
 * Missing messages fall back to English, so a gap in a catalog never shows a raw key.
 */
export function createTranslator(messages: Record<string, Messages>): Translate {
  const banana = new Banana(FALLBACK, { messages, finalFallback: FALLBACK })
  return (locale, key, ...params) => {
    banana.setLocale(locale)
    return banana.i18n(key, ...params)
  }
}

/** The direction of the interface itself, which is independent of the direction of a book's text. */
export function uiDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_UI_LOCALES.has(locale.split('-')[0] ?? '') ? 'rtl' : 'ltr'
}

function withoutMetadata(messages: Record<string, unknown>): Messages {
  return Object.fromEntries(Object.entries(messages).filter((entry): entry is [string, string] => entry[0] !== '@metadata' && typeof entry[1] === 'string'))
}
