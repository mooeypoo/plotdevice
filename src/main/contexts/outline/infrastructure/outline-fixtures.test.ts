import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  composeMarkdownFile,
  splitMarkdownFile
} from '../../../infrastructure/markdown/markdown-file'
import { addBeat } from '../domain/add-beat'
import { captureBeat } from '../domain/capture-beat'
import { editNotes } from '../domain/edit-notes'
import { moveBeat } from '../domain/move-beat'
import { moveColumn } from '../domain/move-column'
import { splitOutlineLines } from '../domain/outline-lines'
import { readOutlineStructure, type OutlineStructure } from '../domain/outline-structure'
import { retitleBeat } from '../domain/retitle-beat'
import type { OutlineItemRef } from '../domain/splice-lines'

const sample = fileURLToPath(new URL('../../../../../fixtures/sample-novel/', import.meta.url))

const FIXTURE_OUTLINES = [
  'Working plan.md',
  'outlines/Revision plan.md',
  'outlines/Loose plan.md',
  'outlines/תוכנית.md',
  'outlines/Not a board.md'
]

function fixtureParts(path: string): {
  bytes: Buffer
  parts: Parameters<typeof composeMarkdownFile>[0]
} {
  const bytes = readFileSync(sample + path)
  const split = splitMarkdownFile(bytes)
  if (split.kind !== 'parts') throw new Error(`${path} is not a readable markdown file`)
  return { bytes, parts: split.parts }
}

/** The body of a fixture outline, exactly as written (line endings included). */
function fixtureBody(path: string): string {
  return fixtureParts(path).parts.body
}

function value(result: { ok: true; value: string } | { ok: false }): string {
  if (!result.ok) throw new Error('expected the edit to succeed')
  return result.value
}

/**
 * Every non-blank line that wasn't edited is still there, in order, with the same text and line
 * break. A last line without a break may gain one when something now follows it. `added` are the
 * new lines' texts, left out of the result before comparing.
 */
function expectOthersKept(
  before: string,
  after: string,
  edited: readonly string[],
  added: readonly string[] = []
): void {
  const kept = (body: string, extra: readonly string[]): { text: string; ending: string }[] =>
    splitOutlineLines(body).filter(
      (line) => line.text.trim() !== '' && !edited.includes(line.text) && !extra.includes(line.text)
    )
  const was = kept(before, [])
  const now = kept(after, added)
  expect(now.map((line) => line.text)).toEqual(was.map((line) => line.text))
  for (const [index, line] of was.entries()) {
    if (line.ending !== '') expect(now[index]?.ending).toBe(line.ending)
  }
}

const refOf = (item: { line: number; title: string }): OutlineItemRef => ({
  line: item.line,
  title: item.title
})

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

describe.each(FIXTURE_OUTLINES)('planners on %s', (path) => {
  const body = fixtureBody(path)
  const structure = readOutlineStructure(body)
  const { lines } = structure
  const beats = structure.columns.flatMap((column) =>
    column.beats.map((beat) => ({ column, beat }))
  )
  const beatCount = beats.length

  it('only ever changes the body: frontmatter, comments and BOM stay byte for byte', () => {
    const { bytes, parts } = fixtureParts(path)
    expect(Buffer.from(composeMarkdownFile(parts)).equals(bytes)).toBe(true)
    const capture = value(captureBeat(body, { write: 'Inbox', recognize: ['Inbox'] }, 'X'))
    const head = Buffer.from(composeMarkdownFile({ ...parts, body: '' }))
    expect(
      Buffer.from(composeMarkdownFile({ ...parts, body: capture })).subarray(0, head.length)
    ).toEqual(head)
  })

  it('moves every beat to every place, changing no other line, and back again', () => {
    for (const { column: from, beat } of beats) {
      const block = lines.slice(beat.lines.start, beat.lines.end).map((line) => line.text)
      for (const to of structure.columns) {
        for (const placement of ['end' as const, ...to.beats.map((b) => ({ before: refOf(b) }))]) {
          const moved = value(moveBeat(body, refOf(beat), refOf(to), placement))
          expect(splitOutlineLines(moved)).toHaveLength(lines.length)
          expectOthersKept(body, moved, block)
          const after = readOutlineStructure(moved)
          expect(after.columns.flatMap((column) => column.beats)).toHaveLength(beatCount)
          expect(
            after.columns.find((c) => c.title === to.title)?.beats.map((b) => b.title)
          ).toContain(beat.title)
        }
      }
      // Back where it was: before the beat that followed it, or at the end of its column.
      const next = from.beats[from.beats.indexOf(beat) + 1]
      const other = structure.columns.find((column) => column !== from)
      if (other === undefined || lines.at(-1)?.ending === '') continue
      const away = value(moveBeat(body, refOf(beat), refOf(other), 'end'))
      const reread = readOutlineStructure(away)
      const moved = reread.columns.flatMap((c) => c.beats).find((b) => b.title === beat.title)
      const home = reread.columns.find((c) => c.title === from.title)
      if (moved === undefined || home === undefined) throw new Error('beat or column lost')
      const placement =
        next === undefined
          ? ('end' as const)
          : { before: refOf(home.beats.find((b) => b.title === next.title) ?? next) }
      const atEnd = next === undefined && beat.lines.end !== nextContentLine(structure, from)
      if (atEnd) continue
      expect(value(moveBeat(away, refOf(moved), refOf(home), placement))).toBe(body)
    }
  })

  it('moves every column to every place, keeping every line, and back again', () => {
    for (const [index, column] of structure.columns.entries()) {
      const others = structure.columns.filter((other) => other !== column)
      for (const placement of ['end' as const, ...others.map((o) => ({ before: refOf(o) }))]) {
        const moved = value(moveColumn(body, refOf(column), placement))
        expect(splitOutlineLines(moved)).toHaveLength(lines.length)
        expectOthersKept(
          body,
          moved,
          lines.slice(column.lines.start, column.lines.end).map((l) => l.text)
        )
        expect(
          readOutlineStructure(moved)
            .columns.map((c) => c.title)
            .sort()
        ).toEqual(structure.columns.map((c) => c.title).sort())
      }
      const firstColumn = structure.columns[0]
      if (lines.at(-1)?.ending === '' || index === 0 || firstColumn === undefined) continue
      const first = value(moveColumn(body, refOf(column), { before: refOf(firstColumn) }))
      const reread = readOutlineStructure(first)
      const movedColumn = reread.columns[0]
      if (movedColumn === undefined) throw new Error('column lost')
      const next = structure.columns[index + 1]
      const back =
        next === undefined
          ? ('end' as const)
          : { before: refOf(reread.columns.find((c) => c.title === next.title) ?? next) }
      expect(value(moveColumn(first, refOf(movedColumn), back))).toBe(body)
    }
  })

  it('adds, retitles and re-notes every beat, changing only its own lines', () => {
    for (const { column, beat } of beats) {
      const block = lines.slice(beat.lines.start, beat.lines.end).map((line) => line.text)
      const marker = column.beats[0]?.marker ?? '-'
      expectOthersKept(
        body,
        value(addBeat(body, refOf(column), 'Added', { before: refOf(beat) })),
        [],
        ['- Added', '* Added', '+ Added', `${marker} Added`]
      )
      expectOthersKept(body, value(retitleBeat(body, refOf(beat), 'Renamed')), block, [
        `${beat.marker} Renamed`
      ])
      const noted = value(editNotes(body, refOf(beat), 'A note\n  - nested'))
      const notes = lines.slice(beat.notes.start, beat.notes.end).map((line) => line.text)
      expectOthersKept(
        body,
        noted,
        notes,
        noted.split(/\r?\n/u).filter((t) => t.includes('note') || t.includes('nested'))
      )
      expect(splitOutlineLines(noted)).toHaveLength(
        lines.length - (beat.notes.end - beat.notes.start) + 2
      )
    }
  })

  it('captures into the inbox, or adds one, without touching another line', () => {
    const inbox = { write: 'Inbox', recognize: ['Inbox', 'רעיונות'] }
    const hasInbox = structure.columns.some((c) => inbox.recognize.includes(c.title))
    const captured = value(captureBeat(body, inbox, 'Captured'))
    const added = ['- Captured', '* Captured', '+ Captured', ...(hasInbox ? [] : ['## Inbox'])]
    expectOthersKept(body, captured, [], added)
    const columns = readOutlineStructure(captured).columns
    expect(columns.flatMap((c) => c.beats)).toHaveLength(beatCount + 1)
    expect(columns.length - structure.columns.length).toBe(hasInbox ? 0 : 1)
  })
})

/** The line after a column's last non-blank line. */
function nextContentLine(
  structure: OutlineStructure,
  column: OutlineStructure['columns'][number]
): number {
  let end = column.lines.end
  while (end > column.line + 1 && (structure.lines[end - 1]?.text.trim() ?? '') === '') end -= 1
  return end
}
