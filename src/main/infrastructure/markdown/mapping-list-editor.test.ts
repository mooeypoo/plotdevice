import { describe, expect, it } from 'vitest'
import type { MarkdownFileParts } from './markdown-file'
import { editMappingList, type MappingItem } from './mapping-list-editor'

const parts = (yaml: string): MarkdownFileParts => ({
  hasBom: false,
  head: `---\n${yaml}---\n`,
  body: 'Body.\n'
})
const headOf = (result: ReturnType<typeof editMappingList>): string => {
  if (!result.ok) throw new Error(result.error.message)
  return result.value.head.slice(4, -4)
}

const ILKA = [
  'type: character',
  'relationships:   # who she trusts',
  '  - with: "[[Aunt Bea]]"',
  '    kind: mentor   # since 1940',
  '    note: Taught her to graft pear trees.',
  '  - with: "[[יעל]]"',
  '    kind: friend',
  'role: protagonist',
  ''
].join('\n')

const bea: MappingItem = [
  ['with', '[[Aunt Bea]]'],
  ['kind', 'mentor'],
  ['note', 'Taught her to graft pear trees.']
]
const yael: MappingItem = [
  ['with', '[[יעל]]'],
  ['kind', 'friend']
]

describe('editMappingList', () => {
  it('changes one field’s value only, keeping comments', () => {
    const changed: MappingItem = [bea[0], ['kind', 'teacher'], bea[2]] as MappingItem
    expect(headOf(editMappingList(parts(ILKA), 'relationships', [changed, yael]))).toBe(
      ILKA.replace('kind: mentor   # since 1940', 'kind: teacher   # since 1940')
    )
  })

  it('adds a field to an item, and removes one', () => {
    const withNote: MappingItem = [...yael, ['note', 'Met at the cannery.']]
    const withoutNote: MappingItem = [bea[0], bea[1]] as MappingItem
    expect(headOf(editMappingList(parts(ILKA), 'relationships', [withoutNote, withNote]))).toBe(
      ILKA.replace('    note: Taught her to graft pear trees.\n', '').replace(
        '    kind: friend\n',
        '    kind: friend\n    note: Met at the cannery.\n'
      )
    )
  })

  it('appends a new item and removes an old one', () => {
    const noel: MappingItem = [
      ['with', '[[Noël]]'],
      ['kind', 'rival']
    ]
    expect(headOf(editMappingList(parts(ILKA), 'relationships', [bea, yael, noel]))).toBe(
      ILKA.replace(
        '    kind: friend\n',
        '    kind: friend\n  - with: "[[Noël]]"\n    kind: rival\n'
      )
    )
    expect(headOf(editMappingList(parts(ILKA), 'relationships', [bea]))).toBe(
      ILKA.replace('  - with: "[[יעל]]"\n    kind: friend\n', '')
    )
  })

  it('adds the key when it is missing, and removes it when the list empties', () => {
    expect(headOf(editMappingList(parts('type: character\n'), 'relationships', [yael]))).toBe(
      'type: character\nrelationships:\n  - with: "[[יעל]]"\n    kind: friend\n'
    )
    expect(headOf(editMappingList(parts(ILKA), 'relationships', []))).toBe(
      'type: character\nrole: protagonist\n'
    )
  })

  it('keeps CRLF line endings', () => {
    const crlf = ILKA.replace(/\n/gu, '\r\n')
    const result = editMappingList(
      { hasBom: false, head: `---\r\n${crlf}---\r\n`, body: '' },
      'relationships',
      [bea, yael, [['with', '[[Noël]]']]]
    )
    expect(result.ok && result.value.head).toBe(
      `---\r\n${crlf.replace('    kind: friend\r\n', '    kind: friend\r\n  - with: "[[Noël]]"\r\n')}---\r\n`
    )
  })

  it('refuses shapes it can’t edit safely, writing nothing', () => {
    const flow = 'relationships: [{with: "[[Aunt Bea]]", kind: mentor}]\n'
    expect(editMappingList(parts(flow), 'relationships', [yael])).toMatchObject({
      ok: false,
      error: { code: 'unsupported-value' }
    })
    const nested = 'relationships:\n  - with: "[[Aunt Bea]]"\n    since:\n      year: 1940\n'
    expect(editMappingList(parts(nested), 'relationships', [yael])).toMatchObject({
      ok: false,
      error: { code: 'unsupported-value' }
    })
  })
})
