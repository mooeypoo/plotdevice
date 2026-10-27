import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { kindOfFile, referenceFileFor, relationshipHeadingFor, resolveWikiLink, unresolvedLink } from './references'

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

describe('links that point at nothing', () => {
  const files = [p('characters/ilka.md'), p('notes/ilka.md'), p('places/marrow.md'), p('places/מטע המלח.md')]

  it('are paths to a Markdown file the project doesn’t have', () => {
    expect(unresolvedLink({ kind: 'path', target: 'places/marrow.md' }, files)).toBeNull()
    expect(unresolvedLink({ kind: 'path', target: 'places/מטע המלח.md' }, files)).toBeNull()
    expect(unresolvedLink({ kind: 'path', target: 'places/mill.md' }, files)).toBe('missing')
    // The app follows a path exactly, so a different case is a different file.
    expect(unresolvedLink({ kind: 'path', target: 'places/Marrow.md' }, files)).toBe('missing')
  })

  it('leave other files alone, since only Markdown files are known', () => {
    expect(unresolvedLink({ kind: 'path', target: 'assets/map.png' }, files)).toBeNull()
    expect(unresolvedLink({ kind: 'path', target: 'places' }, files)).toBeNull()
  })

  it('are wikilinks no file has, or that more than one file has', () => {
    expect(unresolvedLink({ kind: 'wiki', name: 'Marrow' }, files)).toBeNull()
    expect(unresolvedLink({ kind: 'wiki', name: 'characters/ilka' }, files)).toBeNull()
    expect(unresolvedLink({ kind: 'wiki', name: 'Oren' }, files)).toBe('missing')
    expect(unresolvedLink({ kind: 'wiki', name: 'ilka' }, files)).toBe('ambiguous')
  })
})

describe('the relationships heading', () => {
  it('is named in the project’s language, falling back to English', () => {
    expect(['he', 'he-IL', 'en-GB', 'fr'].map(relationshipHeadingFor)).toEqual(['קשרים', 'קשרים', 'Relationships', 'Relationships'])
  })
})
