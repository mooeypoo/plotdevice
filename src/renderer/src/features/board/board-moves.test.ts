import { describe, expect, it } from 'vitest'
import type { BoardColumnDto } from '../../../../contract/dtos'
import { beatDrop, beatKeyMove, columnDrop, columnKeyMove, newColumnPlacement } from './board-moves'

const beat = (line: number, title: string): BoardColumnDto['beats'][number] => ({
  line,
  title,
  notes: '',
  tags: [],
  threads: []
})
const column = (line: number, title: string, beats: string[], inbox = false): BoardColumnDto => ({
  line,
  title,
  inbox,
  beats: beats.map((text, index) => beat(line + 1 + index, text))
})

const one = column(0, 'One', ['A', 'B', 'C'])
const two = column(5, 'Two', ['D'])
const inbox = column(8, 'Inbox', ['Idea'], true)
const shown = [one, two, inbox]

describe('beatDrop', () => {
  it('asks to move before the beat at the gap, or to the end', () => {
    expect(beatDrop(shown, { column: 0, beat: 0 }, 1, 0)).toEqual({
      beat: { line: 1, title: 'A' },
      column: { line: 5, title: 'Two' },
      placement: { before: { line: 6, title: 'D' } }
    })
    expect(beatDrop(shown, { column: 2, beat: 0 }, 1, 1)).toMatchObject({ placement: 'end' })
    expect(beatDrop(shown, { column: 0, beat: 0 }, 0, 3)).toMatchObject({ placement: 'end' })
  })

  it('asks for nothing when the drop is where the beat already is', () => {
    expect(beatDrop(shown, { column: 0, beat: 1 }, 0, 1)).toBeUndefined()
    expect(beatDrop(shown, { column: 0, beat: 1 }, 0, 2)).toBeUndefined()
  })
})

describe('columnDrop', () => {
  it('moves among the columns that can move, before the next one', () => {
    expect(columnDrop([one, two, inbox], 1, 0)).toEqual({
      column: { line: 5, title: 'Two' },
      placement: { before: { line: 0, title: 'One' } }
    })
    expect(columnDrop([one, two, inbox], 0, 1)).toBeUndefined()
  })

  it('puts the last movable column after the one that was last, wherever the Inbox is', () => {
    expect(columnDrop([one, two, inbox], 0, 2)).toMatchObject({
      placement: { before: { title: 'Inbox' } }
    })
    expect(columnDrop([inbox, one, two], 0, 2)).toMatchObject({ placement: 'end' })
  })
})

describe('newColumnPlacement', () => {
  it('goes after the last column and before the Inbox, wherever the Inbox is in the file', () => {
    expect(newColumnPlacement([one, two, inbox])).toEqual({ before: { line: 8, title: 'Inbox' } })
    expect(newColumnPlacement([inbox, one, two])).toBe('end')
    expect(newColumnPlacement([inbox])).toEqual({ before: { line: 8, title: 'Inbox' } })
    expect(newColumnPlacement([])).toBe('end')
  })
})

describe('keyboard moves', () => {
  it('moves a card up and down, and to the end of the column beside it', () => {
    expect(beatKeyMove(shown, { column: 0, beat: 1 }, 'ArrowUp', 'ltr')).toEqual({
      move: {
        beat: { line: 2, title: 'B' },
        column: { line: 0, title: 'One' },
        placement: { before: { line: 1, title: 'A' } }
      },
      to: { column: 0, beat: 0 }
    })
    expect(beatKeyMove(shown, { column: 0, beat: 1 }, 'ArrowDown', 'ltr')).toMatchObject({
      move: { placement: 'end' },
      to: { column: 0, beat: 2 }
    })
    expect(beatKeyMove(shown, { column: 0, beat: 2 }, 'ArrowDown', 'ltr')).toBeUndefined()
    expect(beatKeyMove(shown, { column: 0, beat: 0 }, 'ArrowRight', 'ltr')).toMatchObject({
      move: { column: { title: 'Two' }, placement: 'end' },
      to: { column: 1, beat: 1 }
    })
    expect(beatKeyMove(shown, { column: 0, beat: 0 }, 'ArrowLeft', 'rtl')).toMatchObject({
      to: { column: 1 }
    })
    expect(beatKeyMove(shown, { column: 0, beat: 0 }, 'ArrowLeft', 'ltr')).toBeUndefined()
  })

  it('moves a column one place on screen, never past the Inbox', () => {
    expect(columnKeyMove([one, two, inbox], 0, 'ArrowRight', 'ltr')).toMatchObject({
      move: { column: { title: 'One' }, placement: { before: { title: 'Inbox' } } },
      to: 1
    })
    expect(columnKeyMove([one, two, inbox], 1, 'ArrowRight', 'ltr')).toBeUndefined()
    expect(columnKeyMove([one, two, inbox], 1, 'ArrowRight', 'rtl')).toMatchObject({
      move: { column: { title: 'Two' }, placement: { before: { title: 'One' } } },
      to: 0
    })
  })
})
