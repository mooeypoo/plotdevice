import type { InteractingCharacterDto, InteractionsDto } from '../../../../contract/dtos'

/** How the characters are ordered: by name, or most appearances first. */
export type CharacterOrder = 'name' | 'appearances'

/** One cell of the matrix: the chapters two characters share. */
export interface PairCell {
  /** Chapter indexes both are in, in reading order. On the diagonal, the character's own. */
  readonly chapters: readonly number[]
  /** How many of those each of the two is the point of view in. */
  readonly povOfRow: number
  readonly povOfColumn: number
}

/** The characters in order, and a cell for every pair. */
export interface InteractionMatrix {
  readonly characters: readonly InteractingCharacterDto[]
  /** `cells[row][column]`; symmetric. */
  readonly cells: readonly (readonly PairCell[])[]
  /** The largest count off the diagonal, for shading. */
  readonly maxShared: number
}

/** Builds the co-appearance matrix (see "Interactions" in docs/file-format.md). */
export function interactionMatrix(
  interactions: InteractionsDto,
  order: CharacterOrder
): InteractionMatrix {
  const characters = [...interactions.characters].sort((a, b) =>
    order === 'appearances' ? b.chapters.length - a.chapters.length || 0 : 0
  )
  let maxShared = 0
  const cells = characters.map((row, rowIndex) =>
    characters.map((column, columnIndex): PairCell => {
      const columnChapters = new Set(column.chapters)
      const chapters = row.chapters.filter((chapter) => columnChapters.has(chapter))
      if (rowIndex !== columnIndex) maxShared = Math.max(maxShared, chapters.length)
      return {
        chapters,
        povOfRow: chapters.filter((chapter) => row.povChapters.includes(chapter)).length,
        povOfColumn: chapters.filter((chapter) => column.povChapters.includes(chapter)).length
      }
    })
  )
  return { characters, cells, maxShared }
}

/** How strongly to shade a cell: 0 for none shared, up to 1 for the busiest pair. */
export function shade(count: number, max: number): number {
  if (count === 0 || max === 0) return 0
  return 0.2 + 0.8 * (count / max)
}
