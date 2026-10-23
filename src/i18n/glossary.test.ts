import { describe, expect, it } from 'vitest'
import en from './en.json'
import he from './he.json'

/**
 * Names the glossary retired (docs/guide/translation.md). Code may keep them in keys and ids;
 * the screen never shows them, so the vocabulary can't drift back one message at a time.
 */
const RETIRED = {
  en: [
    /\bbinder\b/iu,
    /\binspector\b/iu,
    /\bpropert(y|ies)\b/iu,
    /command palette/iu,
    /\bplotting\b/iu,
    /focus mode/iu,
    /return to writing/iu,
    /\bplot board\b/iu
  ],
  he: [/קלסר/u, /מאפיינ/u, /לוח פקודות/u, /מצב מיקוד|יציאה ממיקוד/u, /נעיצ/u, /תיבת הרעיונות/u]
}

function retiredNamesIn(catalog: Record<string, unknown>, patterns: RegExp[]): string[] {
  return Object.entries(catalog).flatMap(([key, message]) =>
    key !== '@metadata' &&
    typeof message === 'string' &&
    patterns.some((pattern) => pattern.test(message))
      ? [`${key}: ${message}`]
      : []
  )
}

describe('glossary', () => {
  it('shows no retired name in English', () => {
    expect(retiredNamesIn(en, RETIRED.en)).toEqual([])
  })

  it('shows no retired name in Hebrew', () => {
    expect(retiredNamesIn(he, RETIRED.he)).toEqual([])
  })
})
