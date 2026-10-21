import Banana from 'banana-i18n'
import type { UiLocale } from '../contract/dtos'
import en from './en.json'
import he from './he.json'

/** Stable catalog keys, excluding translator metadata. */
export type MessageKey = Exclude<keyof typeof en, '@metadata'>
type ParameterizedMessages = {
  'reference-not-listed': [path: string]
  'error-workspace-folder-missing': [path: string]
  'error-workspace-not-project': [path: string]
  'error-workspace-already-project': [path: string]
  'error-workspace-inside-project': [path: string]
  'error-workspace-contains-project': [path: string]
  'error-link-needs-no-folder': [name: string]
  'error-key-needs-no-quotes': [key: string]
  'error-file-move-failed': [path: string]
  'structure-renumber-failed': [count: number]
  'structure-rename-skipped': [count: number, paths: string]
  'error-manuscript-type-unreadable': [path: string]
  'error-codex-type-unreadable': [path: string]
  'relationships-cannot-edit': [detail: string]
  'recovery-missing-description': [kind: string]
  'error-file-outside-project': [path: string]
  'error-file-missing': [path: string]
  'error-file-unreadable': [path: string]
  'error-file-changed': [path: string]
  'error-file-exists': [path: string]
  'error-file-unsafe-read': [path: string, problem: string]
  'error-file-unsafe-write': [path: string, problem: string]
  'error-file-write-failed': [path: string, detail: string]
  'error-file-create-failed': [path: string, detail: string]
  'error-recovery-write-failed': [detail: string]
  'error-recovery-create-failed': [detail: string]
  'error-frontmatter-unsupported': [key: string]
  'about-detail': [version: string]
  'date-year-bce': [year: string]
  'date-day-count': [day: string]
  'date-month-year': [month: string, year: string]
  'date-full': [day: string, month: string, year: string]
  'date-range': [from: string, to: string]
  'date-error-not-day-number': [value: string]
  'date-error-too-large': [value: string]
  'date-error-not-date': [value: string]
  'date-error-invalid-month': [value: string, month: string]
  'date-error-invalid-day': [value: string]
  'warnings-open': [path: string]
  'warnings-means': [target: string]
  'problem-unknown-type': [type: string]
  'warning-format-invalid': [value: string]
  'warning-format-newer': [version: string]
  'warning-setting-file-name-sync': [key: string, value: string]
  'warning-setting-boolean': [key: string, value: string]
  'warning-setting-folder-mapping': [key: string, value: string]
  'warning-setting-visible-folder': [key: string, value: string]
  'warning-duplicate-chapter-order': [order: string, titles: string]
  'warning-duplicate-part-order': [order: string, titles: string]
  'warning-part-without-order': [titles: string]
  'warning-ambiguous-body': [title: string, link: string, choices: string, example: string]
  'warning-ambiguous-key': [
    title: string,
    link: string,
    key: string,
    choices: string,
    example: string
  ]
  'warning-unquoted-link': [title: string, source: string, example: string]
  'warning-not-link': [title: string, key: string, value: string]
  'warning-not-integer': [title: string, key: string, value: string]
  'warning-list': [list: string, next: string]
  'warning-alternatives': [list: string, next: string]
  'warning-quoted-title': [title: string]
}
type MessageArguments<Key extends MessageKey> = Key extends keyof ParameterizedMessages
  ? ParameterizedMessages[Key]
  : []

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
