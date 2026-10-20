import { describe, expect, it } from 'vitest'
import type { InteractionsDto } from '../../../../contract/dtos'
import { interactionMatrix, shade } from './interaction-matrix'

const interactions: InteractionsDto = {
  chapters: [
    { path: 'a.md', title: 'The Ferry' },
    { path: 'b.md', title: 'First frost' },
    { path: 'c.md', title: 'Shapes' }
  ],
  characters: [
    { path: 'bea.md', name: 'Aunt Bea', chapters: [1], povChapters: [] },
    { path: 'ilka.md', name: 'Ilka Szabó', chapters: [0, 1, 2], povChapters: [0, 2] },
    { path: 'yael.md', name: 'יעל', chapters: [0, 2], povChapters: [2] }
  ],
  outside: 0
}

describe('interactionMatrix', () => {
  it('counts the chapters each pair shares, and each character’s own on the diagonal', () => {
    const matrix = interactionMatrix(interactions, 'name')
    const counts = matrix.cells.map((row) => row.map((cell) => cell.chapters.length))
    expect(counts).toEqual([
      [1, 1, 0],
      [1, 3, 2],
      [0, 2, 2]
    ])
    expect(matrix.maxShared).toBe(2)
    expect(matrix.cells[1]?.[2]).toEqual({ chapters: [0, 2], povOfRow: 2, povOfColumn: 1 })
  })

  it('orders by appearances when asked, keeping the matrix symmetric', () => {
    const matrix = interactionMatrix(interactions, 'appearances')
    expect(matrix.characters.map((character) => character.name)).toEqual([
      'Ilka Szabó',
      'יעל',
      'Aunt Bea'
    ])
    expect(matrix.cells[0]?.[1]?.chapters).toEqual(matrix.cells[1]?.[0]?.chapters)
  })
})

describe('shade', () => {
  it('leaves empty pairs blank and scales the rest', () => {
    expect(shade(0, 5)).toBe(0)
    expect(shade(5, 5)).toBe(1)
    expect(shade(1, 5)).toBeCloseTo(0.36)
  })
})
