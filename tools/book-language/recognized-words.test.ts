import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BOOK_LANGUAGES, resolveBookWords } from '../../src/main/book-language/book-words'

const root = fileURLToPath(new URL('../../', import.meta.url))

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sources(path)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

/** Every spelling of every recognized word, in every language, plus retired aliases. */
function recognizedSpellings(): string[] {
  const spellings = BOOK_LANGUAGES.flatMap((language) =>
    Object.values(resolveBookWords(language).recognized).flatMap((word) => word.recognize)
  )
  return [...new Set(spellings)]
}

describe('recognized words', () => {
  // A context that compares against 'Inbox' itself would miss a Hebrew book's רעיונות and every
  // writer's own word: contexts must take recognized words from `words()` (ADR 0019).
  it('never appear as string literals in context code', () => {
    const literals = recognizedSpellings().flatMap((word) =>
      ["'", '"', '`'].map((quote) => `${quote}${word}${quote}`)
    )
    const strays = sources(join(root, 'src/main/contexts')).flatMap((file) => {
      const text = readFileSync(file, 'utf8')
      return literals
        .filter((literal) => text.includes(literal))
        .map((literal) => `${relative(root, file)}: ${literal}`)
    })
    expect(strays).toEqual([])
  })

  it('know at least the outline inbox in English and Hebrew', () => {
    expect(recognizedSpellings()).toEqual(expect.arrayContaining(['Inbox', 'רעיונות']))
  })
})
