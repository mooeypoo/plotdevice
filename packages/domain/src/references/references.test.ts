import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { kindOfFile, referenceFileFor, resolveWikiLink, searchReferences, type ReferenceSummary } from './references'

const p = (path: string) => path as ProjectPath
const ref = (file: string, title: string, aka: string[] = [], description: string | null = null): ReferenceSummary => ({
  file: p(file),
  kind: kindOfFile(p(file)) ?? 'note',
  title,
  aka,
  description,
})

const library = [
  ref('characters/ilka.md', 'Ilka Varga', ['Ili'], 'Inherits the orchard.'),
  ref('characters/bea.md', 'Bea', [], 'Ilka’s aunt; refuses to sign.'),
  ref('characters/yael.md', 'יַעֵל', [], 'אחותה של בּאה.'),
  ref('places/marrow.md', 'Marrow', ['the town'], 'Where the orchard is.'),
  ref('notes/salt.md', 'Salt in pear trees', [], null),
  ref('characters/noel.md', 'Noël', [], null),
]

describe('reference kinds', () => {
  it('come from the folder', () => {
    expect([kindOfFile(p('characters/ilka.md')), kindOfFile(p('places/a/b.md')), kindOfFile(p('notes/x.md')), kindOfFile(p('manuscript/x.md'))]).toEqual(['character', 'place', 'note', null])
  })

  it('name new pages from their titles, in their folder', () => {
    expect(referenceFileFor('character', 'Ilka Varga', [])).toBe('characters/ilka-varga.md')
    expect(referenceFileFor('place', 'מרו', [p('places/מרו.md')])).toBe('places/מרו-2.md')
    expect(referenceFileFor('note', '???', [])).toBe('notes/note.md')
  })
})

describe('searching references', () => {
  const titles = (query: string) => searchReferences(library, query).map((r) => r.title)

  it('ranks names before descriptions, and exact names first', () => {
    expect(titles('bea')).toEqual(['Bea'])
    expect(titles('ilka')).toEqual(['Ilka Varga', 'Bea'])
    expect(titles('orchard')).toEqual(['Ilka Varga', 'Marrow'])
  })

  it('finds other names, ignoring case, accents and niqqud', () => {
    expect(titles('ILI')).toEqual(['Ilka Varga'])
    expect(titles('town')).toEqual(['Marrow'])
    expect(titles('noel')).toEqual(['Noël'])
    expect(titles('יעל')).toEqual(['יַעֵל'])
  })

  it('finds nothing for an empty query', () => {
    expect(titles('  ')).toEqual([])
  })
})

describe('wikilinks', () => {
  const files = [p('characters/ilka.md'), p('notes/ilka.md'), p('places/marrow.md')]

  it('resolve by name only when exactly one file has it', () => {
    expect(resolveWikiLink('marrow', files)).toBe('places/marrow.md')
    expect(resolveWikiLink('Marrow', files)).toBe('places/marrow.md')
    expect(resolveWikiLink('ilka', files)).toBeNull()
    expect(resolveWikiLink('characters/ilka', files)).toBe('characters/ilka.md')
  })
})
