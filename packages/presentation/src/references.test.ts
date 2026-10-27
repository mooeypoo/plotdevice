import type { ProjectView, ReferenceSummaryView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { galleryPages, linkTargets, linkTextOnly, markdownLink, relationshipWords, search, suggestedLinkTargets } from './references'

const p = (path: string) => path as ProjectPath
const page = (
  file: string,
  kind: ReferenceSummaryView['kind'],
  title: string,
  aka: string[] = [],
  description: string | null = null,
  tags: string[] = [],
): ReferenceSummaryView => ({ file: p(file), kind, title, aka, tags, description, invalidDetails: false, relationships: [], links: [] })

const library = [
  page('characters/ilka.md', 'character', 'Ilka Varga', ['Ili'], 'Inherits the orchard.'),
  page('characters/bea.md', 'character', 'Bea', [], 'Ilka’s aunt; refuses to sign.'),
  page('characters/yael.md', 'character', 'יַעֵל', [], 'אחותה של בּאה.'),
  page('places/marrow.md', 'place', 'Marrow', ['the town'], 'Where the orchard is.'),
  page('characters/noel.md', 'character', 'Noël'),
]

describe('searching', () => {
  const titles = (query: string) => search(library, query).map((r) => r.title)

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

describe('linking a card', () => {
  it('can link to chapters and pages alike', () => {
    const project = {
      contents: [],
      chapters: [{ file: p('manuscript/frost.md'), title: 'Frost', status: 'ok', listed: true }],
    } as unknown as ProjectView
    expect(search(linkTargets(project, library), 'fro').map((t) => [t.kind, t.title])).toEqual([['chapter', 'Frost']])
  })

  it('writes a relative Markdown link, safe for any title and path', () => {
    expect(markdownLink('outlines', p('characters/ilka.md'), 'Ilka Varga')).toBe('[Ilka Varga](../characters/ilka.md)')
    expect(markdownLink('outlines', p('places/מרו אחת.md'), 'מרו [העיר]')).toBe('[מרו \\[העיר\\]](<../places/מרו אחת.md>)')
  })
})

describe('what the link picker offers before anything is typed', () => {
  const chapter = (name: string) => ({ file: p(`manuscript/${name}.md`), title: name, status: 'ok', listed: true })
  const project = {
    contents: [
      { kind: 'chapter', file: p('manuscript/prologue.md'), linkText: 'prologue', number: 1 },
      { kind: 'part', name: 'One', chapters: [{ file: p('manuscript/frost.md'), linkText: 'frost', number: 2 }] },
    ],
    // Listed alphabetically, as files are: the picker shows them in reading order instead.
    chapters: [chapter('draft'), chapter('frost'), chapter('prologue')],
  } as unknown as ProjectView
  const characters = ['Zed', 'Ilka', 'Bea', 'Noël', 'Marta', 'Ada', 'Yael'].map((name) => page(`characters/${name}.md`, 'character', name))

  it('shows up to five of each kind, chapters in reading order and pages alphabetically', () => {
    const groups = suggestedLinkTargets(linkTargets(project, [...characters, page('places/marrow.md', 'place', 'Marrow')]))
    expect(groups.map((group) => [group.kind, group.targets.map((target) => target.title)])).toEqual([
      ['chapter', ['prologue', 'frost', 'draft']],
      ['character', ['Ada', 'Bea', 'Ilka', 'Marta', 'Noël']],
      ['place', ['Marrow']],
    ])
  })

  it('leaves out kinds with nothing in them', () => {
    expect(suggestedLinkTargets([]).length).toBe(0)
  })
})

describe('a gallery', () => {
  const pages = [
    page('characters/noel.md', 'character', 'Noël Arany'),
    page('places/marrow.md', 'place', 'Marrow'),
    page('characters/ilka.md', 'character', 'Ilka Varga'),
    page('characters/bea.md', 'character', 'bea Halmi'),
    page('characters/yael.md', 'character', 'יעל'),
    page('characters/2.md', 'character', 'Guard 10'),
    page('characters/1.md', 'character', 'Guard 9'),
  ]

  it('shows one kind of page, A to Z, ignoring case and counting numbers as numbers', () => {
    expect(galleryPages(pages, 'character', 'en').map((entry) => entry.title)).toEqual([
      'bea Halmi',
      'Guard 9',
      'Guard 10',
      'Ilka Varga',
      'Noël Arany',
      'יעל',
    ])
    expect(galleryPages(pages, 'place', 'en').map((entry) => entry.title)).toEqual(['Marrow'])
    expect(galleryPages(pages, 'note', 'he')).toEqual([])
  })
})

describe('relationships as they read', () => {
  it('show links as their text', () => {
    expect(linkTextOnly('Sister of [Bea](bea.md)')).toBe('Sister of Bea')
    expect(linkTextOnly('[Noël](noel.md)’s rival, with [[ilka|Ili]] and [[marrow]]')).toBe('Noël’s rival, with Ili and marrow')
    expect(linkTextOnly('אחות של [בּאה](<my bea.md> "aunt") 🍐')).toBe('אחות של בּאה 🍐')
    expect(linkTextOnly('Rival of [Bea \\[the elder\\]](bea.md)')).toBe('Rival of Bea [the elder]')
  })

  it('can be reworded when written as words, then one link', () => {
    expect(relationshipWords('Sister of [Bea](bea.md)')).toEqual({ words: 'Sister of', link: '[Bea](bea.md)' })
    expect(relationshipWords('אחות של [[bea]] ')).toEqual({ words: 'אחות של', link: '[[bea]]' })
    expect(relationshipWords('[Bea](bea.md)')).toEqual({ words: '', link: '[Bea](bea.md)' })
    expect(relationshipWords('[Noël](noel.md)’s rival')).toBeNull()
    expect(relationshipWords('Between [Bea](bea.md) and [Ilka](ilka.md)')).toBeNull()
  })
})
