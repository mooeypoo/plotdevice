import Banana from 'banana-i18n'
import type { UiLocale } from '../contract/dtos'
import en from './en.json'
import he from './he.json'

/** Stable catalog keys, excluding translator metadata. */
export type MessageKey = Exclude<keyof typeof en, '@metadata'>
type MessageArguments<Key extends MessageKey> = Key extends 'about-detail' ? [version: string] : []

/** Typed, escaped-text presentation messages. Callers isolate dynamic user content. */
export interface Translator {
  readonly t: <Key extends MessageKey>(key: Key, ...parameters: MessageArguments<Key>) => string
  readonly setLocale: (locale: UiLocale) => void
}

/** Creates an isolated offline formatter, shared by main and renderer presentation. */
export function createTranslator(locale: UiLocale): Translator {
  const banana = new Banana(locale, { finalFallback: 'en', wikilinks: false })
  banana.load(en, 'en')
  banana.load(he, 'he')
  return {
    t: (key, ...parameters) => banana.i18n(key, ...parameters),
    setLocale: (next) => {
      banana.setLocale(next)
    }
  }
}
