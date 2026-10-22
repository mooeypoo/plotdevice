import { describe, expect, it } from 'vitest'
import { moveOnBoard } from './board-keys'

const shape = [2, 0, 3]

describe('moveOnBoard', () => {
  it('moves within a column, stopping at its ends', () => {
    expect(moveOnBoard({ column: 0, beat: 0 }, 'ArrowDown', 'ltr', shape)).toEqual({
      column: 0,
      beat: 1
    })
    expect(moveOnBoard({ column: 0, beat: 1 }, 'ArrowDown', 'ltr', shape)).toBeUndefined()
    expect(moveOnBoard({ column: 0, beat: 0 }, 'ArrowUp', 'ltr', shape)).toBeUndefined()
  })

  it('follows visual direction between columns, skipping empty ones', () => {
    expect(moveOnBoard({ column: 0, beat: 1 }, 'ArrowRight', 'ltr', shape)).toEqual({
      column: 2,
      beat: 1
    })
    expect(moveOnBoard({ column: 0, beat: 1 }, 'ArrowLeft', 'rtl', shape)).toEqual({
      column: 2,
      beat: 1
    })
    expect(moveOnBoard({ column: 2, beat: 2 }, 'ArrowRight', 'rtl', shape)).toEqual({
      column: 0,
      beat: 1
    })
    expect(moveOnBoard({ column: 0, beat: 0 }, 'ArrowLeft', 'ltr', shape)).toBeUndefined()
    expect(moveOnBoard({ column: 0, beat: 0 }, 'Enter', 'ltr', shape)).toBeUndefined()
  })
})
