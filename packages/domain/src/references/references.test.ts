import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { kindOfFile, referenceFileFor, resolveWikiLink } from './references'

const p = (path: string) => path as ProjectPath
describe('reference kinds', () => {
  it('come from the folder', () => {
    expect([
      kindOfFile(p('characters/ilka.md')),
      kindOfFile(p('places/a/b.md')),
      kindOfFile(p('notes/x.md')),
      kindOfFile(p('manuscript/x.md')),
    ]).toEqual(['character', 'place', 'note', null])
  })

  it('name new pages from their titles, in their folder', () => {
    expect(referenceFileFor('character', 'Ilka Varga', [])).toBe('characters/ilka-varga.md')
    expect(referenceFileFor('place', 'מרו', [p('places/מרו.md')])).toBe('places/מרו-2.md')
    expect(referenceFileFor('note', '???', [])).toBe('notes/note.md')
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
