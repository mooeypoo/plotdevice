import type {
  BoardColumnDto,
  OutlineItemRefDto,
  OutlinePlacementDto
} from '../../../../contract/dtos'
import type { BoardPosition } from './board-keys'

/** A beat move the board asks the main process for. */
export interface BeatMove {
  readonly beat: OutlineItemRefDto
  readonly column: OutlineItemRefDto
  readonly placement: OutlinePlacementDto
}

/** A column move the board asks the main process for. */
export interface ColumnMove {
  readonly column: OutlineItemRefDto
  readonly placement: OutlinePlacementDto
}

const refOf = (item: { readonly line: number; readonly title: string }): OutlineItemRefDto => ({
  line: item.line,
  title: item.title
})

/**
 * The move for dropping the beat at `from` into gap `slot` of shown column `column` (0 is before
 * its first beat). A drop back where the beat already is asks for nothing.
 */
export function beatDrop(
  shown: readonly BoardColumnDto[],
  from: BoardPosition,
  column: number,
  slot: number
): BeatMove | undefined {
  const source = shown[from.column]?.beats[from.beat]
  const target = shown[column]
  if (source === undefined || target === undefined) return undefined
  if (column === from.column && (slot === from.beat || slot === from.beat + 1)) return undefined
  const before = target.beats[slot]
  return {
    beat: refOf(source),
    column: refOf(target),
    placement: before === undefined ? 'end' : { before: refOf(before) }
  }
}

/**
 * The move for dropping the column at shown index `from` into gap `slot` among the columns that
 * can move: every column but the Inbox, which the board always shows last. The file keeps the
 * Inbox where it is, so the placement is worked out against the file's order (`inFile`).
 */
export function columnDrop(
  inFile: readonly BoardColumnDto[],
  from: number,
  slot: number
): ColumnMove | undefined {
  const movable = inFile.filter((column) => !column.inbox)
  const moved = movable[from]
  if (moved === undefined || slot < 0 || slot > movable.length) return undefined
  if (slot === from || slot === from + 1) return undefined
  const order = movable.filter((column) => column !== moved)
  const at = slot > from ? slot - 1 : slot
  const next = order[at]
  if (next !== undefined) return { column: refOf(moved), placement: { before: refOf(next) } }
  // Last of the movable columns: right after the one that was last, wherever the Inbox is.
  const others = inFile.filter((column) => column !== moved)
  const last = order.at(-1)
  const following = last === undefined ? undefined : others[others.indexOf(last) + 1]
  return {
    column: refOf(moved),
    placement: following === undefined ? 'end' : { before: refOf(following) }
  }
}

/** Which way a horizontal arrow goes in the board's visual order. */
function step(key: string, direction: 'ltr' | 'rtl'): 1 | -1 {
  return (key === 'ArrowRight') === (direction === 'ltr') ? 1 : -1
}

/**
 * Alt+arrow on a card: up or down within its column, or to the end of the column beside it on
 * that side of the screen. Returns the move and where the card lands, or `undefined`.
 */
export function beatKeyMove(
  shown: readonly BoardColumnDto[],
  from: BoardPosition,
  key: string,
  direction: 'ltr' | 'rtl'
): { readonly move: BeatMove; readonly to: BoardPosition } | undefined {
  const count = shown[from.column]?.beats.length ?? 0
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const to = from.beat + (key === 'ArrowUp' ? -1 : 1)
    if (to < 0 || to >= count) return undefined
    const move = beatDrop(shown, from, from.column, key === 'ArrowUp' ? to : to + 1)
    return move === undefined ? undefined : { move, to: { column: from.column, beat: to } }
  }
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return undefined
  const column = from.column + step(key, direction)
  const target = shown[column]
  if (target === undefined) return undefined
  const move = beatDrop(shown, from, column, target.beats.length)
  return move === undefined ? undefined : { move, to: { column, beat: target.beats.length } }
}

/**
 * Alt+Left/Right on a column heading: one place earlier or later on screen, among the columns
 * that can move. Returns the move and the column's new shown index, or `undefined`.
 */
export function columnKeyMove(
  inFile: readonly BoardColumnDto[],
  from: number,
  key: string,
  direction: 'ltr' | 'rtl'
): { readonly move: ColumnMove; readonly to: number } | undefined {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return undefined
  const to = from + step(key, direction)
  const move = columnDrop(inFile, from, to > from ? to + 1 : to)
  return move === undefined ? undefined : { move, to }
}
