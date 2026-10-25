import type { ProjectView, ReferenceSummaryView } from '@plotdevice/contracts'
import { relativePath, type ProjectPath } from '@plotdevice/shared'

/** Lowercase, without accents or niqqud: "Noël" and "noel", "יַעֵל" and "יעל" match. */
const searchable = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

interface Searchable {
  title: string
  aka?: readonly string[]
  description?: string | null
}

/**
 * The entries matching `query`, best first: an exact name, a name that starts with it, a word in a name
 * that starts with it, a name containing it, then a description containing it. Names include other
 * names. Ties stay in alphabetical order.
 */
export function search<T extends Searchable>(entries: readonly T[], query: string): T[] {
  const wanted = searchable(query.trim())
  if (wanted === '') return []
  const rank = (entry: T): number => {
    const names = [entry.title, ...(entry.aka ?? [])].map(searchable)
    if (names.some((name) => name === wanted)) return 0
    if (names.some((name) => name.startsWith(wanted))) return 1
    if (names.some((name) => name.split(/[\s\-–—'’]+/).some((word) => word.startsWith(wanted)))) return 2
    if (names.some((name) => name.includes(wanted))) return 3
    return entry.description && searchable(entry.description).includes(wanted) ? 4 : Number.POSITIVE_INFINITY
  }
  return entries
    .map((entry) => ({ entry, rank: rank(entry) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank || a.entry.title.localeCompare(b.entry.title))
    .map(({ entry }) => entry)
}

export interface LinkTarget {
  file: ProjectPath
  kind: 'chapter' | 'character' | 'place' | 'note'
  title: string
  aka: string[]
  description: string | null
}

/** Everything a card can link to: the book's chapters (in or out of the book) and every page. */
export function linkTargets(project: ProjectView, references: readonly ReferenceSummaryView[]): LinkTarget[] {
  return [
    ...project.chapters.map((chapter): LinkTarget => ({ file: chapter.file, kind: 'chapter', title: chapter.title ?? chapter.file, aka: [], description: null })),
    ...references.map((reference): LinkTarget => ({ ...reference })),
  ]
}

/** A relative Markdown link from a file in `fromDir` (Milestone 5, decision 2): `[Ilka](../characters/ilka.md)`. */
export function markdownLink(fromDir: string, target: ProjectPath, title: string): string {
  const path = relativePath(fromDir, target)
  const destination = /[\s()<>]/.test(path) ? `<${path}>` : path
  return `[${title.replace(/([[\]\\])/g, '\\$1')}](${destination})`
}
