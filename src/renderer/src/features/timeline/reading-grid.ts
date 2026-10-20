import type { TimelineChapterDto, TimelineDto } from '../../../../contract/dtos'
import { romanNumeral } from '../../shared/roman-numeral'

/** What the rows are: the project's threads, or its characters. */
export type RowMode = 'threads' | 'characters'

/** Whether a row's thread or character is in a chapter, and how. */
export type Cell = 'out' | 'in' | 'pov'

/** One row of the reading-order grid. */
export interface GridRow {
  readonly key: string
  readonly name: string
  readonly color?: string
  /** One cell per chapter, in reading order. */
  readonly cells: readonly Cell[]
  /** Runs of chapters (inclusive indexes) the row is missing from, at least as long as asked. */
  readonly gaps: readonly { readonly from: number; readonly to: number }[]
}

/** The rows of the grid, with gaps of at least `minGap` chapters after the row first appears. */
export function readingRows(timeline: TimelineDto, mode: RowMode, minGap: number): GridRow[] {
  const rows = mode === 'threads' ? timeline.threads : timeline.characters
  return rows.map((row) => {
    const cells = timeline.chapters.map((chapter): Cell => cellOf(chapter, mode, row.key))
    return { ...row, cells, gaps: gapsIn(cells, minGap) }
  })
}

function cellOf(chapter: TimelineChapterDto, mode: RowMode, key: string): Cell {
  if (mode === 'threads') return chapter.threads.includes(key) ? 'in' : 'out'
  const character = chapter.characters.find((candidate) => candidate.path === key)
  return character === undefined ? 'out' : character.pov ? 'pov' : 'in'
}

/** Runs of `out` cells after the first appearance, of at least `minGap` chapters. */
export function gapsIn(cells: readonly Cell[], minGap: number): { from: number; to: number }[] {
  const gaps: { from: number; to: number }[] = []
  const first = cells.findIndex((cell) => cell !== 'out')
  if (first === -1 || minGap < 1) return gaps
  let runStart: number | undefined
  for (let index = first + 1; index <= cells.length; index += 1) {
    const out = index < cells.length && cells[index] === 'out'
    if (out && runStart === undefined) runStart = index
    if (!out && runStart !== undefined) {
      if (index - runStart >= minGap) gaps.push({ from: runStart, to: index - 1 })
      runStart = undefined
    }
  }
  return gaps
}

/**
 * For each chapter, whether it certainly happens before the dated chapter just before it: it ends
 * before that one starts. A vague date ("1952") that could include the earlier day isn't flagged.
 */
export function goesBackInTime(chapters: readonly TimelineChapterDto[]): boolean[] {
  let previousStart: number | undefined
  return chapters.map((chapter) => {
    if (chapter.date.kind !== 'dated') return false
    const earlier = previousStart !== undefined && chapter.date.end < previousStart
    previousStart = chapter.date.start
    return earlier
  })
}

/** A short label for a chapter's place: "I·2" in a part, "2" in a book without parts. */
export function chapterLabel(chapter: TimelineChapterDto): string {
  const number = chapter.number === undefined ? '' : String(chapter.number)
  return chapter.partNumber === undefined ? number : `${romanNumeral(chapter.partNumber)}·${number}`
}
