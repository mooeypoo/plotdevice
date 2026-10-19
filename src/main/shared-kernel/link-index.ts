import type { EntryType } from './entry-type'
import { nameComparisonKey } from './name-comparison-key'
import type { ProjectPath } from './project-path'
import { isPathFormLink, type WikiLink } from './wiki-link'

/** A file a link can point to. */
export interface LinkCandidate {
  readonly path: ProjectPath
  readonly type?: EntryType
}

/** Where a link points. */
export type LinkResolution =
  | { readonly kind: 'resolved'; readonly path: ProjectPath }
  | { readonly kind: 'ambiguous'; readonly paths: readonly ProjectPath[] }
  | { readonly kind: 'unresolved' }

/** Resolves links against a fixed set of project files. */
export interface LinkIndex {
  /** `expectedType` breaks ties, for keys like `part` or `location` (see "Links" in docs/file-format.md). */
  resolve(link: WikiLink, expectedType?: EntryType): LinkResolution
  typeOf(path: ProjectPath): EntryType | undefined
}

const MARKDOWN_EXTENSION = /\.md$/iu

/** Indexes candidates by name so each lookup is cheap. */
export function buildLinkIndex(candidates: readonly LinkCandidate[]): LinkIndex {
  const byName = new Map<string, LinkCandidate[]>()
  const typeByPath = new Map<string, EntryType | undefined>()
  const keyedPaths: { readonly key: string; readonly candidate: LinkCandidate }[] = []

  for (const candidate of candidates) {
    const withoutExtension = candidate.path.replace(MARKDOWN_EXTENSION, '')
    const name = withoutExtension.slice(withoutExtension.lastIndexOf('/') + 1)
    const nameKey = nameComparisonKey(name)
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), candidate])
    keyedPaths.push({ key: nameComparisonKey(withoutExtension), candidate })
    typeByPath.set(candidate.path, candidate.type)
  }

  return {
    resolve(link, expectedType) {
      if (link.target === '') return { kind: 'unresolved' }
      const key = nameComparisonKey(link.target)
      const matches = isPathFormLink(link)
        ? keyedPaths
            .filter((entry) => entry.key === key || entry.key.endsWith(`/${key}`))
            .map((entry) => entry.candidate)
        : (byName.get(key) ?? [])
      return choose(matches, expectedType)
    },
    typeOf: (path) => typeByPath.get(path)
  }
}

function choose(matches: readonly LinkCandidate[], expectedType?: EntryType): LinkResolution {
  const [only] = matches
  if (only === undefined) return { kind: 'unresolved' }
  if (matches.length === 1) return { kind: 'resolved', path: only.path }

  if (expectedType !== undefined) {
    const ofType = matches.filter((candidate) => candidate.type === expectedType)
    const [onlyOfType] = ofType
    if (ofType.length === 1 && onlyOfType !== undefined) {
      return { kind: 'resolved', path: onlyOfType.path }
    }
    if (ofType.length > 1) return { kind: 'ambiguous', paths: sortedPaths(ofType) }
  }
  return { kind: 'ambiguous', paths: sortedPaths(matches) }
}

function sortedPaths(candidates: readonly LinkCandidate[]): ProjectPath[] {
  return candidates.map((candidate) => candidate.path).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}
