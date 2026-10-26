import { describe, expect, it } from 'vitest'
import { editRelationships, readRelationships } from './index'

const HEADINGS = ['Relationships', 'קשרים']
const read = (text: string) => readRelationships(text, 'characters', HEADINGS)
const texts = (text: string) => read(text).relationships.map((relationship) => relationship.text)
const edit = (text: string, change: Parameters<typeof editRelationships>[3]) => editRelationships(text, 'characters', HEADINGS, change)
const edited = (text: string, change: Parameters<typeof editRelationships>[3]): string => {
  const result = edit(text, change)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const ILKA = `---
title: Ilka Varga
aka: [Ilka, Ili]
---
Inherits the orchard; distrusts everyone in Marrow.

## Relationships
- Sister of [Bea](bea.md)
- Owes money to [the Salt Exchange](../places/salt-exchange.md)
  - Since the funeral
- Nobody in Marrow, really

## Family
Daughter of Bea's sister.
`

describe('reading relationships', () => {
  it('reads each top-level bullet with a link, its words and links as written; nested bullets stay with it', () => {
    const { relationships } = read(ILKA)
    expect(relationships.map((relationship) => relationship.text)).toEqual([
      'Sister of [Bea](bea.md)',
      'Owes money to [the Salt Exchange](../places/salt-exchange.md)',
    ])
    expect(relationships[0]?.links).toEqual([{ kind: 'path', target: 'characters/bea.md', text: 'Bea' }])
    expect(relationships[1]?.links).toEqual([{ kind: 'path', target: 'places/salt-exchange.md', text: 'the Salt Exchange' }])
  })

  it('knows where the section is, from its heading to before the next one', () => {
    const { section } = read(ILKA)
    expect(section && ILKA.slice(section.start, section.end)).toBe(
      '## Relationships\n- Sister of [Bea](bea.md)\n- Owes money to [the Salt Exchange](../places/salt-exchange.md)\n  - Since the funeral\n- Nobody in Marrow, really',
    )
  })

  it('finds the heading in Hebrew, at any level and in any case, and reads wikilinks and links in any position', () => {
    const page = '# יעל\n\nאחותה של בּאה.\n\n### קשרים\n\n* אחות של [[bea]] 🍐\n* [Noël](noel.md)’s rival, with [Ilka](ilka.md)\n'
    expect(texts(page)).toEqual(['אחות של [[bea]] 🍐', '[Noël](noel.md)’s rival, with [Ilka](ilka.md)'])
    expect(read(page).relationships[1]?.links.map((link) => link.kind === 'path' && link.target)).toEqual([
      'characters/noel.md',
      'characters/ilka.md',
    ])
    expect(texts('Text.\n\n## RELATIONSHIPS:\n\n- Rival of [Noël](noel.md)\n')).toEqual(['Rival of [Noël](noel.md)'])
  })

  it('ignores a page without the heading, a link in code, and a list under another heading', () => {
    expect(read('---\ntitle: Bea\n---\nSee [Ilka](ilka.md).\n\n## Family\n- Aunt of [Ilka](ilka.md)\n')).toEqual({
      section: null,
      relationships: [],
    })
    expect(texts('## Relationships\n- `[Bea](bea.md)`\n')).toEqual([])
  })

  it('ends the section at a heading of the same or a higher level only', () => {
    expect(texts('## Relationships\n- A [Bea](bea.md)\n### Old ones\n- B [Noël](noel.md)\n## Family\n- C [Ilka](ilka.md)\n')).toEqual([
      'A [Bea](bea.md)',
      'B [Noël](noel.md)',
    ])
  })
})

describe('changing relationships', () => {
  it('adds a bullet after the last one, with the same marker, changing nothing else', () => {
    expect(edited(ILKA, { kind: 'add', text: 'Rival of [Noël](noel.md)', heading: 'Relationships' })).toBe(
      ILKA.replace('- Nobody in Marrow, really\n', '- Nobody in Marrow, really\n- Rival of [Noël](noel.md)\n'),
    )
    expect(edited('## Relationships\n\n* A [Bea](bea.md)', { kind: 'add', text: 'B [Ilka](ilka.md)', heading: 'Relationships' })).toBe(
      '## Relationships\n\n* A [Bea](bea.md)\n* B [Ilka](ilka.md)',
    )
  })

  it('adds the first one under the heading, after the description, in the given language', () => {
    const bea = '---\ntitle: Bea Halmi\n---\nIlka’s aunt.\n\n## Habits\nCounts the trees aloud.\n'
    expect(edited(bea, { kind: 'add', text: 'Aunt of [Ilka](ilka.md)', heading: 'Relationships' })).toBe(
      '---\ntitle: Bea Halmi\n---\nIlka’s aunt.\n\n## Relationships\n\n- Aunt of [Ilka](ilka.md)\n\n## Habits\nCounts the trees aloud.\n',
    )
    expect(edited('# יעל\n\nאחותה של בּאה.', { kind: 'add', text: 'אחות של [בּאה](bea.md)', heading: 'קשרים' })).toBe(
      '# יעל\n\nאחותה של בּאה.\n\n## קשרים\n\n- אחות של [בּאה](bea.md)',
    )
  })

  it('adds the heading at the end of a page without a description, and under an empty heading', () => {
    expect(edited('---\ntitle: Bea\n---\n', { kind: 'add', text: 'Aunt of [Ilka](ilka.md)', heading: 'Relationships' })).toBe(
      '---\ntitle: Bea\n---\n## Relationships\n\n- Aunt of [Ilka](ilka.md)\n',
    )
    expect(edited('## Family\n- Aunt\n', { kind: 'add', text: 'Aunt of [Ilka](ilka.md)', heading: 'Relationships' })).toBe(
      '## Family\n- Aunt\n\n## Relationships\n\n- Aunt of [Ilka](ilka.md)\n',
    )
    expect(edited('A.\n\n## Relationships\nNone yet.\n', { kind: 'add', text: 'Aunt of [Ilka](ilka.md)', heading: 'Relationships' })).toBe(
      'A.\n\n## Relationships\n\n- Aunt of [Ilka](ilka.md)\n\nNone yet.\n',
    )
  })

  it('keeps Windows line endings', () => {
    const page = 'Ilka’s aunt.\r\n\r\n## Habits\r\nCounts.\r\n'
    expect(edited(page, { kind: 'add', text: 'Aunt of [Ilka](ilka.md)', heading: 'Relationships' })).toBe(
      'Ilka’s aunt.\r\n\r\n## Relationships\r\n\r\n- Aunt of [Ilka](ilka.md)\r\n\r\n## Habits\r\nCounts.\r\n',
    )
  })

  it('changes only that bullet’s words, keeping what is nested under it', () => {
    expect(edited(ILKA, { kind: 'change', index: 1, text: 'Owes everything to [the Salt Exchange](../places/salt-exchange.md)' })).toBe(
      ILKA.replace('- Owes money to', '- Owes everything to'),
    )
  })

  it('removes a bullet with everything nested under it, and nothing else', () => {
    expect(edited(ILKA, { kind: 'remove', index: 1 })).toBe(
      ILKA.replace('- Owes money to [the Salt Exchange](../places/salt-exchange.md)\n  - Since the funeral\n', ''),
    )
    expect(edited(ILKA, { kind: 'remove', index: 0 })).toBe(ILKA.replace('- Sister of [Bea](bea.md)\n', ''))
  })

  it('removing the only one leaves the heading and one blank line', () => {
    const bea = 'Ilka’s aunt.\n\n## Relationships\n\n- Aunt of [Ilka](ilka.md)\n\n## Habits\nCounts.\n'
    expect(edited(bea, { kind: 'remove', index: 0 })).toBe('Ilka’s aunt.\n\n## Relationships\n\n## Habits\nCounts.\n')
    expect(edited(bea.replaceAll('\n', '\r\n'), { kind: 'remove', index: 0 })).toBe(
      'Ilka’s aunt.\r\n\r\n## Relationships\r\n\r\n## Habits\r\nCounts.\r\n',
    )
    expect(edited('## Relationships\n\n- Aunt of [Ilka](ilka.md)\n', { kind: 'remove', index: 0 })).toBe('## Relationships\n\n')
  })

  it('refuses empty or multi-line words, and a relationship that is not there', () => {
    expect(edit(ILKA, { kind: 'add', text: '  ', heading: 'Relationships' })).toEqual({ ok: false, error: 'empty-text' })
    expect(edit(ILKA, { kind: 'add', text: 'A\nB', heading: 'Relationships' })).toEqual({ ok: false, error: 'multiline-text' })
    expect(edit(ILKA, { kind: 'remove', index: 2 })).toEqual({ ok: false, error: 'missing' }) // the bullet without a link
    expect(edit('No section.', { kind: 'change', index: 0, text: 'x' })).toEqual({ ok: false, error: 'missing' })
  })
})
