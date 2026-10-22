import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { splitMarkdownFile } from '../../../infrastructure/markdown/markdown-file'
import { readOutlineStructure, type OutlineStructure } from '../domain/outline-structure'

const sample = fileURLToPath(new URL('../../../../../fixtures/sample-novel/', import.meta.url))

/** The body of a fixture outline, exactly as written (line endings included). */
function fixtureBody(path: string): string {
  const split = splitMarkdownFile(readFileSync(sample + path))
  if (split.kind !== 'parts') throw new Error(`${path} is not a readable markdown file`)
  return split.parts.body
}

const board = (structure: OutlineStructure): [string, string[]][] =>
  structure.columns.map((column) => [column.title, column.beats.map((beat) => beat.title)])

describe('the sample’s outlines, as the board reads them', () => {
  it('Working plan: the file-format example', () => {
    const structure = readOutlineStructure(fixtureBody('Working plan.md'))
    expect(board(structure)).toEqual([
      [
        'Part One',
        [
          '[[The Ferry]]: Ilka arrives; Bea is already at the gate. #main',
          'Ilka finds the ledger. Bea lies about it. #strike'
        ]
      ],
      ['Part Two', ['[[The Cannery]]', 'Who told the foreman?']],
      ['Inbox', ['The orchard gate should creak in every chapter it appears.']]
    ])
    const [ferry, ledger] = structure.columns[0]?.beats ?? []
    // "Open on the water, not the town." is the Ferry beat's one line of notes.
    expect(ferry?.notes).toEqual({ start: (ferry?.line ?? 0) + 1, end: (ferry?.line ?? 0) + 2 })
    expect(ferry?.tags).toEqual(['main'])
    expect(ledger?.tags).toEqual(['strike'])
  })

  it('Revision plan: CRLF, a BOM, and * and + markers', () => {
    const structure = readOutlineStructure(fixtureBody('outlines/Revision plan.md'))
    expect(board(structure)).toEqual([
      ['Cut', ['The second ferry crossing #main', "Bea's letter"]],
      [
        'Move',
        [
          '[The Cannery](../manuscript/Part%20Two/The%20Cannery.md) before First frost #strike',
          "Noël's arrival"
        ]
      ],
      ['Inbox', ['Check every date against the harvest.']]
    ])
    expect(structure.columns[1]?.beats[0]?.markdownLinks).toHaveLength(1)
  })

  it('Loose plan: mixed endings, an empty column, the last beat without a line break', () => {
    const structure = readOutlineStructure(fixtureBody('outlines/Loose plan.md'))
    expect(board(structure)).toEqual([
      ['Before', ["Marrow's map"]],
      ['Empty', []],
      ['After', ['The orchard burns? #main', 'Last image: the gate']]
    ])
    expect(structure.lines.at(-1)?.ending).toBe('')
  })

  it('תוכנית: Hebrew, mixed direction, and a Hebrew inbox', () => {
    expect(board(readOutlineStructure(fixtureBody('outlines/תוכנית.md')))).toEqual([
      [
        'חלק ראשון',
        ['[[הנהר]]: יעל חוצה את הנהר #main', 'יעל and Ilka meet at the cannery #שביתה']
      ],
      ['רעיונות', ['השער חורק בכל פרק']]
    ])
  })

  it('Not a board: only the one real beat is read', () => {
    expect(board(readOutlineStructure(fixtureBody('outlines/Not a board.md')))).toEqual([
      ['Shapes', ['The only beat']]
    ])
  })
})
