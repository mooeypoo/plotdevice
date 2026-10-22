import { languageDirection } from '../shared-kernel/language-tag'
export { isLanguageTag, languageDirection } from '../shared-kernel/language-tag'
import en from './words/en.json'
import he from './words/he.json'

/** The words the app writes into a book: a new novel.md, new entries' titles and headings. */
export type BookSeeds = typeof en.seeds

/** Names of the words the app recognizes in files (file-format.md, "Words the app writes and recognizes"). */
export type RecognizedWordName = keyof typeof en.recognized

/** A recognized word: the spelling the app writes, and every spelling it accepts when reading. */
export interface RecognizedWord {
  readonly write: string
  readonly recognize: readonly string[]
}

/** Everything the app needs to know about a book's language, resolved once for the open project. */
export interface BookWords {
  /** The `language` tag as written in novel.md, or `null` when the book doesn't declare one. */
  readonly declared: string | null
  /** The language the words come from: the declared one if the app has its words, else English. */
  readonly language: string
  /** The declared language's writing direction; `null` when no language is declared. */
  readonly direction: 'ltr' | 'rtl' | null
  readonly seeds: BookSeeds
  readonly recognized: Readonly<Record<RecognizedWordName, RecognizedWord>>
}

/** Languages the app has words for, so initialization can offer them. */
export const BOOK_LANGUAGES = ['en', 'he'] as const
/** A language the app has words for. */
export type BookLanguage = (typeof BOOK_LANGUAGES)[number]

const CATALOGS: Readonly<Record<BookLanguage, typeof en>> = { en, he }

/**
 * Words a release used to recognize, kept so books written with them still work (ADR 0019). A
 * changed default moves here instead of disappearing.
 */
export const RETIRED_ALIASES: Readonly<Record<RecognizedWordName, readonly string[]>> = {
  outline_inbox: []
}

function primary(tag: string): string {
  return tag.split('-')[0]?.toLowerCase() ?? ''
}

/** The supported language a tag uses words from, or `undefined`. */
function catalogLanguage(tag: string): BookLanguage | undefined {
  const language = primary(tag)
  return (BOOK_LANGUAGES as readonly string[]).includes(language)
    ? (language as BookLanguage)
    : undefined
}

/**
 * Resolves a book's words from its declared `language` and its `settings.vocabulary` overrides.
 * Recognized words resolve in order: the writer's override, the book language's word, English,
 * then every other language's word and retired aliases. The app writes the first of these.
 */
export function resolveBookWords(
  declared: string | null,
  overrides: Readonly<Record<string, string>> = {}
): BookWords {
  const language = declared === null ? 'en' : (catalogLanguage(declared) ?? 'en')
  const catalog = CATALOGS[language]
  const recognized: Partial<Record<RecognizedWordName, RecognizedWord>> = {}
  for (const name of Object.keys(en.recognized) as RecognizedWordName[]) {
    const override = overrides[name]?.trim()
    const ordered = [
      ...(override === undefined || override === '' ? [] : [override]),
      catalog.recognized[name],
      en.recognized[name],
      ...BOOK_LANGUAGES.map((other) => CATALOGS[other].recognized[name]),
      ...RETIRED_ALIASES[name]
    ]
    const recognize = [...new Set(ordered)]
    recognized[name] = { write: recognize[0] ?? en.recognized[name], recognize }
  }
  return {
    declared,
    language,
    direction: declared === null ? null : languageDirection(declared),
    seeds: catalog.seeds,
    recognized: recognized as Record<RecognizedWordName, RecognizedWord>
  }
}
