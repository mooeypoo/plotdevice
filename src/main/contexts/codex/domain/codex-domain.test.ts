import { describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { codexWrites } from './codex-changes'
import { readCodexEntry } from './codex-entry'
import { readCodexProperties } from './codex-properties'
import { newCodexText } from './codex-templates'

const ilka = 'characters/Ilka Szabó.md' as ProjectPath

describe('readCodexEntry', () => {
  it('reads title, aliases, and role, falling back to the file name', () => {
    expect(
      readCodexEntry(ilka, 'character', {
        title: 'Ilka Szabó',
        aliases: ['Ilk'],
        role: 'protagonist'
      })
    ).toEqual({
      path: ilka,
      kind: 'character',
      title: 'Ilka Szabó',
      aliases: ['Ilk'],
      role: 'protagonist'
    })
    expect(readCodexEntry(ilka, 'location', { aliases: 'Ilk', role: 'x' })).toEqual({
      path: ilka,
      kind: 'location',
      title: 'Ilka Szabó',
      aliases: ['Ilk']
    })
  })
})

describe('readCodexProperties', () => {
  it('separates the keys the app edits from the rest, shown as written', () => {
    const properties = readCodexProperties(ilka, 'character', {
      type: 'character',
      title: 'Ilka Szabó',
      born: 1931,
      relationships: [
        { with: '[[Aunt Bea]]', kind: 'mentor', note: 'Taught her to graft.' },
        { kind: 'no target' }
      ],
      eye_color: 'grey',
      languages: ['Hungarian', 'English'],
      nested: { a: 1 }
    })
    expect(properties).toEqual({
      path: ilka,
      kind: 'character',
      title: 'Ilka Szabó',
      aliases: [],
      born: '1931',
      relationships: [{ with: '[[Aunt Bea]]', kind: 'mentor', note: 'Taught her to graft.' }],
      otherKeys: [
        { key: 'eye_color', value: 'grey' },
        { key: 'languages', value: 'Hungarian, English' },
        { key: 'nested', value: '{"a":1}' }
      ]
    })
  })

  it('shows a location’s or note’s other keys, including role', () => {
    expect(readCodexProperties(ilka, 'note', { type: 'note', role: 'x' }).otherKeys).toEqual([
      { key: 'role', value: 'x' }
    ])
  })
})

describe('codexWrites', () => {
  it('trims, removes empty values, and writes whole-number years as numbers', () => {
    expect(codexWrites({ title: ' Ilka ', aliases: ['Ilk', ' '], role: '', born: '1931' })).toEqual(
      [
        { key: 'title', value: 'Ilka' },
        { key: 'aliases', value: ['Ilk'] },
        { key: 'role', value: undefined },
        { key: 'born', value: 1931 }
      ]
    )
    expect(codexWrites({ aliases: [], born: '1931-04, 1932' })).toEqual([
      { key: 'aliases', value: undefined },
      { key: 'born', value: ['1931-04', 1932] }
    ])
  })
})

describe('newCodexText', () => {
  it('starts a character with the template headings, and a note empty', () => {
    expect(newCodexText('character', 'Marta Kovač')).toBe(
      '---\ntype: character\ntitle: "Marta Kovač"\n---\n## Description\n\n## History\n\n## Arc\n'
    )
    expect(newCodexText('note', 'Ideas')).toBe('---\ntype: note\ntitle: "Ideas"\n---\n')
  })
})
