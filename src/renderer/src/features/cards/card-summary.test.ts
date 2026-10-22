import { describe, expect, it } from 'vitest'
import type { CodexPropertiesDto, EntryPropertiesDto } from '../../../../contract/dtos'
import {
  cardFieldValues,
  chosenFields,
  firstSection,
  isCardKind,
  linkText,
  type CardProperties
} from './card-summary'

const join = (items: readonly string[]): string => items.join(', ')

const ilka: CodexPropertiesDto = {
  path: 'characters/Ilka Szabó.md',
  kind: 'character',
  title: 'Ilka Szabó',
  aliases: ['Ilk', 'אילקה'],
  role: 'protagonist',
  groups: ['Main cast'],
  relationships: [],
  relationshipsEditable: true,
  otherKeys: []
}
const ferry: EntryPropertiesDto = {
  path: 'manuscript/Part One/The Ferry.md',
  kind: 'chapter',
  title: 'The Ferry',
  status: 'draft',
  pov: ['[[Ilka Szabó]]'],
  characters: ['[[Ilka Szabó]]', '[[Aunt Bea|Bea]]'],
  location: ['[[Marrow]]'],
  threads: ['main'],
  synopsis: 'Ilka crosses to Marrow.'
}

describe('chosenFields', () => {
  it('uses the defaults until the writer chooses, and keeps only fields the kind has', () => {
    expect(chosenFields('character', undefined)).toEqual(['role', 'aliases', 'groups'])
    expect(chosenFields('chapter', ['synopsis', 'role', 'pov'])).toEqual(['pov', 'synopsis'])
    expect(chosenFields('note', undefined)).toEqual([])
  })

  it('knows which kinds get cards', () => {
    expect(isCardKind('character')).toBe(true)
    expect(isCardKind('template')).toBe(false)
  })
})

describe('cardFieldValues', () => {
  it('shows authored values in field order and skips empty fields', () => {
    const codex: CardProperties = { kind: 'codex', value: ilka }
    expect(cardFieldValues(codex, ['role', 'aliases', 'born'], join)).toEqual([
      { id: 'role', label: 'codex-inspector-role', value: 'protagonist' },
      { id: 'aliases', label: 'codex-inspector-aliases', value: 'Ilk, אילקה' }
    ])
  })

  it('shows links by their shown text', () => {
    const chapter: CardProperties = { kind: 'manuscript', value: ferry }
    expect(cardFieldValues(chapter, ['pov', 'characters', 'location'], join)).toEqual([
      { id: 'pov', label: 'inspector-pov', value: 'Ilka Szabó' },
      { id: 'characters', label: 'inspector-characters', value: 'Ilka Szabó, Bea' },
      { id: 'location', label: 'inspector-location', value: 'Marrow' }
    ])
    expect(linkText('[[locations/Marrow#Mill|the mill]]')).toBe('the mill')
    expect(linkText('plain text')).toBe('plain text')
  })
})

describe('firstSection', () => {
  it('keeps the first section up to the next heading', () => {
    expect(firstSection('## Description\nTall, quiet.\n\n## History\nBorn in Marrow.')).toBe(
      '## Description\nTall, quiet.'
    )
  })

  it('keeps text before the first heading', () => {
    expect(firstSection('\n\nשורה ראשונה.\n\n## היסטוריה\nעוד.')).toBe('שורה ראשונה.')
  })

  it('cuts long text at a paragraph boundary', () => {
    const paragraph = 'word '.repeat(80).trim()
    const text = [paragraph, paragraph, paragraph].join('\n\n')
    expect(firstSection(text)).toBe(paragraph)
  })

  it('cuts a single long paragraph without splitting a letter from its niqqud', () => {
    const summary = firstSection('\u05e9\u05c1\u05b8'.repeat(700))
    expect(summary).toBe(`${'\u05e9\u05c1\u05b8'.repeat(600)}…`)
  })

  it('is empty for an empty entry', () => {
    expect(firstSection('\n  \n')).toBe('')
  })
})
