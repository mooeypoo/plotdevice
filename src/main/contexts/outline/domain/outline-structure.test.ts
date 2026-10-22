import { describe, expect, it } from 'vitest'
import { dominantEnding, joinOutlineLines, splitOutlineLines } from './outline-lines'
import { readOutlineStructure, type OutlineStructure } from './outline-structure'

/** Each column's title with its beats' titles, the shape the board shows. */
const board = (structure: OutlineStructure): [string, string[]][] =>
  structure.columns.map((column) => [column.title, column.beats.map((beat) => beat.title)])

const read = (...lines: string[]): OutlineStructure => readOutlineStructure(lines.join('\n') + '\n')

describe('outline lines', () => {
  it.each(['', 'one', 'one\n', 'a\r\nb\nc', 'a\n\n\r\n', 'a\rb\n'])(
    'split and join back to the same text: %j',
    (body) => {
      expect(joinOutlineLines(splitOutlineLines(body))).toBe(body)
    }
  )

  it('keep each line’s ending and find the one most lines use', () => {
    const lines = splitOutlineLines('a\r\nb\r\nc\nd')
    expect(lines.map((line) => line.ending)).toEqual(['\r\n', '\r\n', '\n', ''])
    expect(dominantEnding(lines)).toBe('\r\n')
    expect(dominantEnding(splitOutlineLines('one'))).toBe('\n')
  })
})

describe('readOutlineStructure', () => {
  it('reads columns from ## headings and beats from top-level bullets, after a preamble', () => {
    const structure = read(
      'The plan in one breath.',
      '',
      '## Part One',
      '- [[The Ferry]]: Ilka arrives. #main',
      '* Ilka finds the ledger.',
      '',
      '## Part Two ##',
      '+ Who told the foreman?'
    )
    expect(structure.preamble).toEqual({ start: 0, end: 2 })
    expect(board(structure)).toEqual([
      ['Part One', ['[[The Ferry]]: Ilka arrives. #main', 'Ilka finds the ledger.']],
      ['Part Two', ['Who told the foreman?']]
    ])
    expect(structure.columns.map((column) => column.lines)).toEqual([
      { start: 2, end: 6 },
      { start: 6, end: 8 }
    ])
    expect(structure.columns[1]?.beats[0]?.marker).toBe('+')
  })

  it('takes indented lines, and blank lines between them, as a beat’s notes', () => {
    const structure = read(
      '## One',
      '- First',
      '  - Open on the water.',
      '',
      '    A paragraph of notes.',
      '',
      '- Second',
      'still the second, continued',
      'Plain text after a blank line? No: right after the beat.',
      '',
      'This one is plain.'
    )
    const [first, second] = structure.columns[0]?.beats ?? []
    expect(first?.notes).toEqual({ start: 2, end: 5 })
    expect(second?.lines).toEqual({ start: 6, end: 9 })
    expect(structure.columns[0]?.beats).toHaveLength(2)
  })

  it('treats bullets before the first column, and indented bullets, as plain content', () => {
    const structure = read('- Not a beat', '## One', 'Intro.', '  - indented, no beat above')
    expect(board(structure)).toEqual([['One', []]])
  })

  it('never reads inside fenced code, but keeps a fence inside notes as notes', () => {
    const structure = read(
      '## One',
      '```md',
      '## Not a column',
      '- Not a beat',
      '```',
      '- Beat',
      '  ~~~',
      '  - fenced note',
      '',
      '  ~~~',
      '- Unclosed',
      '  ```',
      '  - fenced',
      '- After'
    )
    expect(board(structure)).toEqual([['One', ['Beat', 'Unclosed', 'After']]])
    expect(structure.columns[0]?.beats[0]?.notes).toEqual({ start: 6, end: 10 })
    expect(structure.columns[0]?.beats[1]?.notes).toEqual({ start: 11, end: 13 })
  })

  it('treats HTML blocks, other headings, ordered lists, breaks and empty bullets as plain', () => {
    const structure = read(
      '## One',
      '<div>',
      '- inside HTML',
      '</div>',
      '',
      '### A subheading',
      '1. ordered',
      '* * *',
      '-',
      '- Beat',
      '---',
      'Setext',
      '======'
    )
    expect(board(structure)).toEqual([['One', ['Beat']]])
    expect(structure.columns[0]?.beats[0]?.lines).toEqual({ start: 9, end: 10 })
  })

  it('reads links and tags from the first line only, skipping code and links', () => {
    const [beat] =
      read(
        '## One',
        '- [[The Ferry|ferry]] meets [Bea](characters/Aunt%20Bea.md#x) #main #קו_ראשי `#code` (#strike)',
        '  #notes [[Not read]]'
      ).columns[0]?.beats ?? []
    expect(beat?.wikiLinks).toEqual([{ target: 'The Ferry', shownText: 'ferry', embed: false }])
    expect(beat?.markdownLinks).toEqual(['[Bea](characters/Aunt%20Bea.md#x)'])
    expect(beat?.tags).toEqual(['main', 'קו_ראשי', 'strike'])
  })

  it('reads Hebrew columns and beats, and a body with no columns', () => {
    expect(board(read('## חלק ראשון', '- אילקה מגיעה למעבורת #main'))).toEqual([
      ['חלק ראשון', ['אילקה מגיעה למעבורת #main']]
    ])
    const plain = readOutlineStructure('Just notes.')
    expect(plain.columns).toEqual([])
    expect(plain.preamble).toEqual({ start: 0, end: 1 })
  })
})
