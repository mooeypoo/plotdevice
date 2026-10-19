import type {
  ListChapterReferences,
  ReferenceKey
} from '../contexts/manuscript/application/queries/list-chapter-references'
import type { ProjectPath } from '../shared-kernel/project-path'

/** A chapter a codex entry appears in, and through which keys (`pov`, `characters`, `location`). */
export interface Appearance {
  readonly path: ProjectPath
  readonly title: string
  readonly keys: readonly ReferenceKey[]
}

/**
 * The chapters whose story keys point to a character or location, in manuscript order (see
 * "Derived data" in docs/file-format.md).
 */
export type GetAppearsIn = (path: ProjectPath) => Promise<readonly Appearance[]>

/** Builds the `GetAppearsIn` query from the manuscript's chapter references. */
export function createGetAppearsIn(ports: {
  readonly listChapterReferences: ListChapterReferences
}): GetAppearsIn {
  return async (path) => {
    const chapters = await ports.listChapterReferences()
    return chapters.flatMap((chapter) => {
      const keys = [
        ...new Set(
          chapter.references
            .filter((reference) => reference.path === path)
            .map((reference) => reference.key)
        )
      ]
      return keys.length === 0 ? [] : [{ path: chapter.path, title: chapter.title, keys }]
    })
  }
}
