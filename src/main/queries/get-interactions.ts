import type { ListCodex } from '../contexts/codex/application/queries/list-codex'
import type { ListChapterReferences } from '../contexts/manuscript/application/queries/list-chapter-references'
import { nameComparisonKey } from '../shared-kernel/name-comparison-key'
import type { ProjectPath } from '../shared-kernel/project-path'

/** A character who appears in the book, and in which chapters (indexes into `chapters`). */
export interface InteractingCharacter {
  readonly path: ProjectPath
  readonly name: string
  /** Chapter indexes the character is in, by `pov` or `characters`. */
  readonly chapters: readonly number[]
  /** Of those, the chapters where the character is the point of view. */
  readonly povChapters: readonly number[]
}

/** Who appears with whom (see "Derived data" in docs/file-format.md). Never stored. */
export interface Interactions {
  /** The book's chapters in reading order. */
  readonly chapters: readonly { readonly path: ProjectPath; readonly title: string }[]
  /** Characters in at least one chapter, by name. */
  readonly characters: readonly InteractingCharacter[]
  /** Chapters outside the reading order, not counted. */
  readonly outside: number
}

/** Builds the interactions: each character's chapters, from which pairs follow. */
export type GetInteractions = () => Promise<Interactions>

/** Builds the `GetInteractions` query from the manuscript's references and the codex's names. */
export function createGetInteractions(ports: {
  readonly listChapterReferences: ListChapterReferences
  readonly listCodex: ListCodex
}): GetInteractions {
  return async () => {
    const [all, codex] = await Promise.all([ports.listChapterReferences(), ports.listCodex()])
    const inBook = all.filter((chapter) => chapter.inBook)
    const names = new Map(
      codex.entries
        .filter((entry) => entry.kind === 'character')
        .map((entry) => [entry.path, entry.title])
    )
    const appearances = new Map<ProjectPath, { chapters: Set<number>; pov: Set<number> }>()
    for (const [index, chapter] of inBook.entries()) {
      for (const reference of chapter.references) {
        if (reference.key === 'location' || !names.has(reference.path)) continue
        const entry = appearances.get(reference.path) ?? { chapters: new Set(), pov: new Set() }
        entry.chapters.add(index)
        if (reference.key === 'pov') entry.pov.add(index)
        appearances.set(reference.path, entry)
      }
    }
    return {
      chapters: inBook.map((chapter) => ({ path: chapter.path, title: chapter.title })),
      characters: [...appearances]
        .map(([path, entry]) => ({
          path,
          name: names.get(path) ?? path,
          chapters: [...entry.chapters].sort((a, b) => a - b),
          povChapters: [...entry.pov].sort((a, b) => a - b)
        }))
        .sort((a, b) => nameComparisonKey(a.name).localeCompare(nameComparisonKey(b.name))),
      outside: all.length - inBook.length
    }
  }
}
