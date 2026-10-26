import basic from '../../../tests/fixtures/contents/basic.md?raw'
import bom from '../../../tests/fixtures/contents/bom-no-final-newline.md?raw'
import empty from '../../../tests/fixtures/contents/empty.md?raw'
import extra from '../../../tests/fixtures/contents/extra-content.md?raw'
import fourSpace from '../../../tests/fixtures/contents/four-space-indent.md?raw'
import hebrew from '../../../tests/fixtures/contents/hebrew.md?raw'
import nestedTooDeep from '../../../tests/fixtures/contents/nested-too-deep.md?raw'
import partsCrlf from '../../../tests/fixtures/contents/parts-crlf.md?raw'
import parts from '../../../tests/fixtures/contents/parts.md?raw'
import spaces from '../../../tests/fixtures/contents/spaces-and-encoding.md?raw'
import { describe, expect, it } from 'vitest'
import { editContents, parseContents, type ContentsEdit, type ContentsPlacement, type ParsedContents } from './contents'

const withoutBom = (text: string): string => text.replace(/^﻿/, '')

/** The structure an edit must produce, independent of bytes. */
type Shape = (
  { kind: 'chapter'; target: string; linkText: string } | { kind: 'part'; name: string; chapters: { target: string; linkText: string }[] }
)[]
const shape = (parsed: ParsedContents): Shape =>
  parsed.entries.map((e) =>
    e.kind === 'chapter'
      ? { kind: 'chapter', target: e.target, linkText: e.linkText }
      : { kind: 'part', name: e.name, chapters: e.chapters.map((c) => ({ target: c.target, linkText: c.linkText })) },
  )

const fixtures: [string, string][] = [
  ['basic', basic],
  ['parts', parts],
  ['parts-crlf', partsCrlf],
  ['bom-no-final-newline', withoutBom(bom)],
  ['hebrew', hebrew],
  ['spaces-and-encoding', spaces],
  ['extra-content', extra],
  ['four-space-indent', fourSpace],
  ['empty', empty],
  ['nested-too-deep', nestedTooDeep],
]

describe('parseContents', () => {
  it('reads chapters and parts in order', () => {
    expect(shape(parseContents(parts))).toEqual([
      { kind: 'chapter', target: 'manuscript/prologue.md', linkText: 'Prologue' },
      {
        kind: 'part',
        name: 'Part One: Arrival',
        chapters: [
          { target: 'manuscript/the-crossing.md', linkText: 'The Crossing' },
          { target: 'manuscript/the-orchard-gate.md', linkText: 'The Orchard Gate' },
        ],
      },
      { kind: 'part', name: 'Part Two: Salt', chapters: [{ target: 'manuscript/frost.md', linkText: 'Frost' }] },
      { kind: 'chapter', target: 'manuscript/epilogue.md', linkText: 'Epilogue' },
    ])
    expect(parseContents(parts).warnings).toEqual([])
  })

  it('reads CRLF files the same way', () => {
    expect(shape(parseContents(partsCrlf))).toEqual(shape(parseContents(parts)))
  })

  it('reads Hebrew titles and paths, with and without angle brackets', () => {
    expect(shape(parseContents(hebrew))).toEqual([
      {
        kind: 'part',
        name: 'חלק ראשון: הגעה',
        chapters: [
          { target: 'manuscript/המעבר.md', linkText: 'המעבר' },
          { target: 'manuscript/שער המטע.md', linkText: 'השער' },
        ],
      },
      { kind: 'chapter', target: 'manuscript/epilogue.md', linkText: 'The Epilogue' },
    ])
  })

  it('decodes paths with spaces, written either way', () => {
    expect(parseContents(spaces).entries.map((e) => (e.kind === 'chapter' ? e.target : ''))).toEqual([
      'manuscript/the crossing.md',
      'manuscript/the orchard gate.md',
    ])
  })

  it('reads any bullet style and indentation', () => {
    expect(shape(parseContents(fourSpace))).toEqual([
      {
        kind: 'part',
        name: 'Part One',
        chapters: [
          { target: 'manuscript/the-crossing.md', linkText: 'The Crossing' },
          { target: 'manuscript/frost.md', linkText: 'Frost' },
        ],
      },
      { kind: 'chapter', target: 'manuscript/epilogue.md', linkText: 'Epilogue' },
    ])
  })

  it('keeps everything else, ignores it for ordering, and says so', () => {
    const parsed = parseContents(extra)
    expect(shape(parsed)).toEqual([
      { kind: 'chapter', target: 'manuscript/the-crossing.md', linkText: 'The Crossing' },
      { kind: 'part', name: 'Part One', chapters: [{ target: 'manuscript/frost.md', linkText: 'Frost' }] },
    ])
    expect(parsed.warnings.map((w) => [w.code, w.line])).toEqual([
      ['ignored-content', 3],
      ['not-a-chapter', 8],
      ['not-a-chapter', 9],
      ['ignored-content', 11],
      ['ignored-content', 13],
    ])
  })

  it('warns about sub-items under a chapter', () => {
    expect(parseContents(nestedTooDeep).warnings.map((w) => w.code)).toEqual(['chapter-has-sub-items'])
  })

  it('reads a contents file with only a title as an empty book', () => {
    expect(parseContents(empty)).toMatchObject({ entries: [], warnings: [] })
  })
})

const p = (part: number | null, index: number): ContentsPlacement => ({ part, index })
const unwrap = (result: { ok: true; value: string } | { ok: false; error: string }): string => {
  if (!result.ok) throw new Error(`refused: ${result.error}`)
  return result.value
}

describe('editContents: examples (exact output)', () => {
  it('moves a chapter within a part', () => {
    expect(unwrap(editContents(parts, { kind: 'move-chapter', file: 'manuscript/the-orchard-gate.md', placement: p(1, 0) }))).toBe(
      parts.replace(
        '  - [The Crossing](manuscript/the-crossing.md)\n  - [The Orchard Gate](manuscript/the-orchard-gate.md)\n',
        '  - [The Orchard Gate](manuscript/the-orchard-gate.md)\n  - [The Crossing](manuscript/the-crossing.md)\n',
      ),
    )
  })

  it('moves a chapter out of a part to the end of the book, re-indenting it', () => {
    expect(unwrap(editContents(parts, { kind: 'move-chapter', file: 'manuscript/frost.md', placement: p(null, 4) }))).toBe(
      parts
        .replace('  - [Frost](manuscript/frost.md)\n', '')
        .replace('- [Epilogue](manuscript/epilogue.md)\n', '- [Epilogue](manuscript/epilogue.md)\n- [Frost](manuscript/frost.md)\n'),
    )
  })

  it('moves a chapter into an empty part, indented like the other parts', () => {
    const emptied = unwrap(editContents(parts, { kind: 'move-chapter', file: 'manuscript/frost.md', placement: p(null, 0) }))
    expect(emptied).toContain('- Part Two: Salt\n- [Epilogue]')
    expect(unwrap(editContents(emptied, { kind: 'move-chapter', file: 'manuscript/frost.md', placement: p(3, 0) }))).toBe(parts)
  })

  it('adds a chapter, a part, and a chapter into an empty book', () => {
    expect(unwrap(editContents(basic, { kind: 'add-chapter', file: 'manuscript/thaw.md', linkText: 'Thaw', placement: p(null, 3) }))).toBe(
      `${basic}- [Thaw](manuscript/thaw.md)\n`,
    )
    expect(unwrap(editContents(parts, { kind: 'add-part', name: 'Part Three: Sale', index: 3 }))).toContain(
      '  - [Frost](manuscript/frost.md)\n- Part Three: Sale\n- [Epilogue]',
    )
    expect(
      unwrap(
        editContents(empty, { kind: 'add-chapter', file: 'manuscript/the-crossing.md', linkText: 'The Crossing', placement: p(null, 0) }),
      ),
    ).toBe('# The Salt Orchard\n\n- [The Crossing](manuscript/the-crossing.md)\n')
  })

  it('writes link text and paths safely', () => {
    const renamed = unwrap(editContents(basic, { kind: 'set-link-text', file: 'manuscript/frost.md', linkText: 'Frost [and] *Salt*' }))
    expect(renamed).toContain('- [Frost \\[and\\] \\*Salt\\*](manuscript/frost.md)\n')
    expect(shape(parseContents(renamed))[2]).toEqual({ kind: 'chapter', target: 'manuscript/frost.md', linkText: 'Frost [and] *Salt*' })
    const moved = unwrap(editContents(basic, { kind: 'set-target', file: 'manuscript/frost.md', newFile: 'manuscript/hard frost.md' }))
    expect(moved).toContain('- [Frost](<manuscript/hard frost.md>)\n')
    expect(unwrap(editContents(hebrew, { kind: 'set-target', file: 'manuscript/שער המטע.md', newFile: 'manuscript/השער.md' }))).toContain(
      '  - [השער](<manuscript/השער.md>)\n',
    )
  })

  it('escapes a part name that would otherwise become Markdown structure', () => {
    expect(unwrap(editContents(parts, { kind: 'rename-part', part: 1, name: '1. Arrival' }))).toContain('- 1\\. Arrival\n')
  })

  it('removes a chapter line and nothing else', () => {
    expect(unwrap(editContents(basic, { kind: 'remove-chapter', file: 'manuscript/the-orchard-gate.md' }))).toBe(
      basic.replace('- [The Orchard Gate](manuscript/the-orchard-gate.md)\n', ''),
    )
  })

  it('keeps CRLF, and the missing final newline', () => {
    const crlf = unwrap(editContents(partsCrlf, { kind: 'move-chapter', file: 'manuscript/epilogue.md', placement: p(null, 0) }))
    expect(crlf.split('\n').length - 1).toBe(crlf.split('\r\n').length - 1)
    const noFinal = withoutBom(bom)
    expect(
      unwrap(editContents(noFinal, { kind: 'move-chapter', file: 'manuscript/frost.md', placement: p(null, 0) })).endsWith(
        'the-crossing.md)',
      ),
    ).toBe(true)
  })

  it('refuses edits that do not make sense', () => {
    expect(editContents(basic, { kind: 'move-chapter', file: 'manuscript/nope.md', placement: p(null, 0) })).toEqual({
      ok: false,
      error: 'not-in-contents',
    })
    expect(editContents(basic, { kind: 'add-chapter', file: 'manuscript/Frost.md', linkText: 'x', placement: p(null, 0) })).toEqual({
      ok: false,
      error: 'already-in-contents',
    })
    expect(editContents(parts, { kind: 'move-chapter', file: 'manuscript/frost.md', placement: p(0, 0) })).toEqual({
      ok: false,
      error: 'not-a-part',
    })
    expect(editContents(basic, { kind: 'move-chapter', file: 'manuscript/frost.md', placement: p(null, 7) })).toEqual({
      ok: false,
      error: 'no-such-position',
    })
  })
})

/** The reference implementation of a move, on the shape (same placement rules as the domain). */
function moveInShape(before: Shape, target: string, placement: ContentsPlacement): Shape {
  const copy = JSON.parse(JSON.stringify(before)) as Shape
  const destination = placement.part === null ? null : copy[placement.part]
  let moved: { target: string; linkText: string } | undefined
  const top = copy.findIndex((e) => e.kind === 'chapter' && e.target === target)
  if (top !== -1) moved = copy.splice(top, 1)[0] as { target: string; linkText: string }
  for (const entry of copy) {
    if (entry.kind !== 'part') continue
    const i = entry.chapters.findIndex((c) => c.target === target)
    if (i !== -1) moved = entry.chapters.splice(i, 1)[0]
  }
  if (!moved) throw new Error('not found')
  const chapter = { kind: 'chapter' as const, ...moved }
  if (destination && destination.kind === 'part')
    destination.chapters.splice(placement.index, 0, { target: chapter.target, linkText: chapter.linkText })
  else copy.splice(placement.index, 0, chapter)
  return copy
}

const nonBlankLines = (text: string): string[] => text.split('\n').filter((line) => line.trim() !== '')

describe.each(fixtures)('every move in %s', (_name, text) => {
  const before = parseContents(text)

  it('commutes with the model, keeps every other line, and moving to the same place changes nothing', () => {
    const chapters = before.entries.flatMap((e) => (e.kind === 'chapter' ? [e.target] : e.chapters.map((c) => c.target)))
    const containers: (number | null)[] = [null, ...before.entries.flatMap((e, i) => (e.kind === 'part' ? [i] : []))]
    let moves = 0
    for (const target of chapters) {
      for (const part of containers) {
        const size = part === null ? before.entries.length : (before.entries[part] as { chapters: unknown[] }).chapters.length
        const fromHere =
          part === null
            ? before.entries.some((e) => e.kind === 'chapter' && e.target === target)
            : (before.entries[part] as { chapters: { target: string }[] }).chapters.some((c) => c.target === target)
        for (let index = 0; index <= size - (fromHere ? 1 : 0); index++) {
          const edit: ContentsEdit = { kind: 'move-chapter', file: target, placement: p(part, index) }
          const after = unwrap(editContents(text, edit))
          expect(shape(parseContents(after))).toEqual(moveInShape(shape(before), target, p(part, index)))
          // Locality: the same lines remain, ignoring indentation (the moved line may change depth).
          expect(
            nonBlankLines(after)
              .map((l) => l.trim())
              .sort(),
          ).toEqual(
            nonBlankLines(text)
              .map((l) => l.trim())
              .sort(),
          )
          moves++
        }
      }
    }
    // Not vacuous: every chapter was moved to at least its other positions.
    expect(moves).toBeGreaterThanOrEqual(chapters.length)
  })

  it('reads and writes back unchanged when nothing changes', () => {
    const first = before.entries[0]
    if (!first) return
    const target = first.kind === 'chapter' ? first.target : first.chapters[0]?.target
    if (!target) return
    expect(editContents(text, { kind: 'move-chapter', file: target, placement: first.kind === 'chapter' ? p(null, 0) : p(0, 0) })).toEqual({
      ok: true,
      value: text,
    })
  })
})
