import { describe, expect, it } from 'vitest'
import { codexSections, entryDetail } from './codex-sections'

describe('codexSections', () => {
  it('keeps all three sections, in order, even when empty', () => {
    const sections = codexSections({
      entries: [
        { path: 'b.md', kind: 'location', title: 'Marrow', aliases: [] },
        { path: 'a.md', kind: 'character', title: 'Ilka', aliases: [] }
      ],
      untyped: []
    })
    expect(sections.map((section) => [section.heading, section.entries.length])).toEqual([
      ['Characters', 1],
      ['Locations', 1],
      ['Notes', 0]
    ])
  })
})

describe('entryDetail', () => {
  it('shows the role, else the aliases', () => {
    expect(
      entryDetail({ path: 'a', kind: 'character', title: 'Ilka', aliases: ['Ilk'], role: 'lead' })
    ).toBe('lead')
    expect(
      entryDetail({ path: 'a', kind: 'location', title: 'Marrow', aliases: ['the town'] })
    ).toBe('also the town')
    expect(entryDetail({ path: 'a', kind: 'note', title: 'x', aliases: [] })).toBeUndefined()
  })
})
