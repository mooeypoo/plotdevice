import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../../../i18n/translator'
import { codexSections, entryDetail } from './codex-sections'

describe('codexSections', () => {
  it('keeps all three sections, in order, even when empty', () => {
    const sections = codexSections({
      entries: [
        { path: 'b.md', kind: 'location', title: 'Marrow', aliases: [] },
        { path: 'a.md', kind: 'character', title: 'Ilka', aliases: [] }
      ],
      untyped: [],
      templates: [],
      outlines: []
    })
    expect(sections.map((section) => [section.kind, section.entries.length])).toEqual([
      ['character', 1],
      ['location', 1],
      ['note', 0]
    ])
  })
})

describe('entryDetail', () => {
  it('shows the role, else the aliases', () => {
    expect(
      entryDetail(
        { path: 'a', kind: 'character', title: 'Ilka', aliases: ['Ilk'], role: 'lead' },
        createTranslator('en').t
      )
    ).toBe('lead')
    expect(
      entryDetail(
        { path: 'a', kind: 'location', title: 'Marrow', aliases: ['the town'] },
        createTranslator('en').t
      )
    ).toBe('also \u2068the town\u2069')
    expect(
      entryDetail({ path: 'a', kind: 'note', title: 'x', aliases: [] }, createTranslator('en').t)
    ).toBeUndefined()
  })

  it('localizes the alias prefix without translating or exposing user-written aliases', () => {
    const hebrew = createTranslator('he')
    const aliases = ['יעל <img src=x>', 'Ilk']
    const entry = { path: 'a', kind: 'character' as const, title: 'Ilka', aliases }
    const before = JSON.stringify(entry)
    const detail = entryDetail(entry, hebrew.t)

    expect(detail).toBe('מוכר/ת גם בשם \u2068יעל <img src=x>, Ilk\u2069')
    expect(entry.aliases).toEqual(aliases)
    expect(JSON.stringify(entry)).toBe(before)
  })
})
