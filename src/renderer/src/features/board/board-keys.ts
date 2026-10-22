/** A card on the board: its column, and its place in that column. */
export interface BoardPosition {
  readonly column: number
  readonly beat: number
}

/**
 * Where an arrow key moves focus on the board. Left and right follow what the eye sees, so in a
 * right-to-left board ArrowLeft goes to the next column; empty columns are skipped. Returns
 * `undefined` when the key doesn't move, or there is nowhere to go.
 */
export function moveOnBoard(
  from: BoardPosition,
  key: string,
  direction: 'ltr' | 'rtl',
  beatsPerColumn: readonly number[]
): BoardPosition | undefined {
  const inColumn = beatsPerColumn[from.column] ?? 0
  switch (key) {
    case 'ArrowUp':
      return from.beat > 0 ? { column: from.column, beat: from.beat - 1 } : undefined
    case 'ArrowDown':
      return from.beat < inColumn - 1 ? { column: from.column, beat: from.beat + 1 } : undefined
    case 'ArrowLeft':
    case 'ArrowRight': {
      const forward = (key === 'ArrowRight') === (direction === 'ltr')
      const step = forward ? 1 : -1
      for (let column = from.column + step; column >= 0; column += step) {
        const count = beatsPerColumn[column]
        if (count === undefined) return undefined
        if (count > 0) return { column, beat: Math.min(from.beat, count - 1) }
      }
      return undefined
    }
    default:
      return undefined
  }
}
