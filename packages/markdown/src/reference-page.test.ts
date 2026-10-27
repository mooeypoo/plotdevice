import { describe, expect, it } from 'vitest'
import looseIdeas from '../../../tests/fixtures/projects/salt-orchard/notes/loose-ideas.md?raw'
import { findLinks, newReferencePage, readReferencePage } from './index'

describe('reading a character, place or note page', () => {
  it('reads the title and other names from frontmatter, the first paragraph as the description, and the rest as details', () => {
    const page = readReferencePage(
      "---\ntitle: Ilka Varga\naka: [Ilka, Ili]\n---\nInherits the orchard;\ndistrusts everyone.\n\n## Family\nDaughter of Bea's sister.\n",
      'ilka',
    )
    expect(page).toEqual({
      title: 'Ilka Varga',
      aka: ['Ilka', 'Ili'],
      tags: [],
      description: 'Inherits the orchard;\ndistrusts everyone.',
      details: "## Family\nDaughter of Bea's sister.\n",
      invalidDetails: false,
    })
  })

  it('uses a # heading when there is no title, and leaves it out of the description', () => {
    const page = readReferencePage(looseIdeas, 'loose-ideas')
    expect(page.title).toBe('Loose ideas')
    expect(page.description).toMatch(/^Maybe open \[The Crossing\]/)
  })

  it('falls back to the file name, and reads a single other name', () => {
    expect(readReferencePage('---\naka: Marrow town\n---\n', 'marrow')).toEqual({
      title: 'marrow',
      aka: ['Marrow town'],
      tags: [],
      description: null,
      details: '',
      invalidDetails: false,
    })
  })

  it('reads a Hebrew page', () => {
    const page = readReferencePage('---\ntitle: יעל\n---\nאחותה של בּאה.\n', 'yael')
    expect([page.title, page.description]).toEqual(['יעל', 'אחותה של בּאה.'])
  })

  it('still reads a page whose frontmatter is invalid, and says so', () => {
    const page = readReferencePage('---\ntitle: [unclosed\n---\n# Bea\nThe aunt.\n', 'bea')
    expect(page).toMatchObject({ title: 'Bea', description: 'The aunt.', invalidDetails: true })
  })

  it('reads tags: a list, a single tag, Hebrew, and entries YAML reads as something else', () => {
    const tagsOf = (yaml: string): string[] => readReferencePage(`---\n${yaml}\n---\n`, 'x').tags
    expect(tagsOf('tags: [Part Two – main, Varga family]')).toEqual(['Part Two – main', 'Varga family'])
    expect(tagsOf('tags: Marrow folk')).toEqual(['Marrow folk'])
    expect(tagsOf('tags:\n  - משפחת ורגה\n  - " "\n  - 1912')).toEqual(['משפחת ורגה', '1912'])
    // Written by hand without quotes, YAML reads these as a one-key map; the author meant one tag.
    expect(tagsOf('tags:\n  - Part Two: main')).toEqual(['Part Two: main'])
    expect(tagsOf('tags:')).toEqual([])
  })

  it('writes a new page as just its title', () => {
    expect(newReferencePage('Ilka Varga')).toBe('---\ntitle: Ilka Varga\n---\n')
    expect(newReferencePage('Marrow: the town')).toBe('---\ntitle: "Marrow: the town"\n---\n')
  })
})

describe('finding the links in a text', () => {
  it('finds inline, reference-style and wiki links, resolved from the file’s folder', () => {
    expect(findLinks(looseIdeas, 'notes')).toEqual([
      { kind: 'path', target: 'manuscript/the-crossing.md', text: 'The Crossing' },
      { kind: 'wiki', name: 'the-crossing', text: null },
      { kind: 'wiki', name: 'the-crossing', text: 'the first chapter' },
      { kind: 'wiki', name: 'the-crossing', text: null },
      { kind: 'path', target: 'notes/crossing-notes.md', text: 'crossing notes' },
      { kind: 'path', target: 'manuscript/the-crossing.md', text: null }, // the definition of [crossing][c]
    ])
  })

  it('ignores links in code, images, web links and paths outside the project', () => {
    const text = 'See `[x](a.md)`, ![map](map.png), [site](https://example.com), [out](../../outside.md) and [Bea](bea.md).\n'
    expect(findLinks(text, 'characters')).toEqual([{ kind: 'path', target: 'characters/bea.md', text: 'Bea' }])
  })

  it('reads angle-bracket and encoded paths, and Hebrew', () => {
    expect(findLinks('[יעל](<../characters/יעל אחת.md>) and [Bea](../characters/bea%20b.md#family)\n', 'outlines')).toEqual([
      { kind: 'path', target: 'characters/יעל אחת.md', text: 'יעל' },
      { kind: 'path', target: 'characters/bea b.md', text: 'Bea' },
    ])
  })
})
