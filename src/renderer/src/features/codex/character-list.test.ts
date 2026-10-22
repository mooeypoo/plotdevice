import { describe, expect, it } from 'vitest'
import type { CodexEntryDto } from '../../../../contract/dtos'
import { characterGroupNames, characterSections, visibleCharacters } from './character-list'

const entries: readonly CodexEntryDto[] = [
  {
    path: 'Ilka.md',
    kind: 'character',
    title: 'Ilka',
    aliases: ['Ilk'],
    groups: ['Main', 'Part 2']
  },
  { path: 'Bea.md', kind: 'character', title: 'Bea', aliases: [], groups: ['main'] },
  { path: 'Yael.md', kind: 'character', title: 'יעל', aliases: ['Yael'] },
  { path: 'Note.md', kind: 'note', title: 'Notes', aliases: [], groups: ['Main'] }
]

describe('character list', () => {
  it('discovers normalized names and treats casing and canonical Unicode as the same group', () => {
    expect(characterGroupNames(['Main', 'main', 'Cafe\u0301', 'Café', ' '])).toEqual([
      'Café',
      'Main'
    ])
  })
  it('sorts display names using the selected locale', () => {
    const names = ['שירה', 'Ari', 'דוד', 'Bea']
    expect(characterGroupNames(names, new Intl.Collator('en').compare)).toEqual([
      'Ari',
      'Bea',
      'דוד',
      'שירה'
    ])
    expect(characterGroupNames(names, new Intl.Collator('he').compare)).toEqual([
      'דוד',
      'שירה',
      'Ari',
      'Bea'
    ])
  })
  it('unions selected groups without duplicate files and searches names and aliases', () => {
    expect(visibleCharacters(entries, '', ['MAIN', 'Part 2']).map((entry) => entry.path)).toEqual([
      'Ilka.md',
      'Bea.md'
    ])
    expect(visibleCharacters(entries, 'ilk', []).map((entry) => entry.path)).toEqual(['Ilka.md'])
    expect(visibleCharacters(entries, 'yael', []).map((entry) => entry.path)).toEqual(['Yael.md'])
    expect(visibleCharacters(entries, 'יעל', []).map((entry) => entry.path)).toEqual(['Yael.md'])
    expect(visibleCharacters(entries, 'Yael', ['Main'])).toEqual([])
  })
  it('places each file in all its groups and keeps ungrouped characters visible', () => {
    const sections = characterSections(visibleCharacters(entries, '', []), ['Main', 'Part 2'])
    expect(
      sections.map((section) => [section.name, section.entries.map((entry) => entry.path)])
    ).toEqual([
      ['Main', ['Ilka.md', 'Bea.md']],
      ['Part 2', ['Ilka.md']],
      [null, ['Yael.md']]
    ])
  })
})
