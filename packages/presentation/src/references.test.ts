import type { ProjectView, ReferenceSummaryView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { linkTargets, markdownLink, search } from './references'

const p = (path: string) => path as ProjectPath
const page = (file: string, kind: ReferenceSummaryView['kind'], title: string, aka: string[] = [], description: string | null = null): ReferenceSummaryView => ({ file: p(file), kind, title, aka, description })

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
    const project = { chapters: [{ file: p('manuscript/frost.md'), title: 'Frost', status: 'ok', listed: true }] } as unknown as ProjectView
    expect(search(linkTargets(project, library), 'fro').map((t) => [t.kind, t.title])).toEqual([['chapter', 'Frost']])
  })

  it('writes a relative Markdown link, safe for any title and path', () => {
    expect(markdownLink('outlines', p('characters/ilka.md'), 'Ilka Varga')).toBe('[Ilka Varga](../characters/ilka.md)')
    expect(markdownLink('outlines', p('places/מרו אחת.md'), 'מרו [העיר]')).toBe('[מרו \\[העיר\\]](<../places/מרו אחת.md>)')
  })
})
