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
  /** A page's tags, for grouping; chapters have none. */
  tags: string[]
  description: string | null
}

/** Everything a card can link to: the book's chapters, in reading order then the rest, and every page. */
export function linkTargets(project: ProjectView, references: readonly ReferenceSummaryView[]): LinkTarget[] {
  const readingOrder = project.contents.flatMap((entry) =>
    entry.kind === 'chapter' ? [entry.file] : entry.chapters.map((chapter) => chapter.file),
  )
  const position = (file: ProjectPath): number => {
    const at = readingOrder.indexOf(file)
    return at === -1 ? readingOrder.length : at
  }
  const chapters = [...project.chapters].sort((a, b) => position(a.file) - position(b.file))
  return [
    ...chapters.map((chapter): LinkTarget => ({
      file: chapter.file,
      kind: 'chapter',
      title: chapter.title ?? chapter.file,
      aka: [],
      tags: [],
      description: null,
    })),
    ...references.map((reference): LinkTarget => ({ ...reference })),
  ]
}

export const LINK_KINDS: readonly LinkTarget['kind'][] = ['chapter', 'character', 'place', 'note']

/**
 * What the link picker offers before anything is typed: a few of each kind, so the author sees what
 * there is. Chapters stay in reading order; pages are alphabetical. Kinds with nothing are left out.
 */
export function suggestedLinkTargets(targets: readonly LinkTarget[], perKind = 5): { kind: LinkTarget['kind']; targets: LinkTarget[] }[] {
  return LINK_KINDS.map((kind) => {
    const ofKind = targets.filter((target) => target.kind === kind)
    const ordered = kind === 'chapter' ? ofKind : [...ofKind].sort((a, b) => a.title.localeCompare(b.title))
    return { kind, targets: ordered.slice(0, perKind) }
  }).filter((group) => group.targets.length > 0)
}

/** A relative Markdown link from a file in `fromDir` (Milestone 5, decision 2): `[Ilka](../characters/ilka.md)`. */
export function markdownLink(fromDir: string, target: ProjectPath, title: string): string {
  const path = relativePath(fromDir, target)
  const destination = /[\s()<>]/.test(path) ? `<${path}>` : path
  return `[${title.replace(/([[\]\\])/g, '\\$1')}](${destination})`
}

/** One kind of page for its gallery, A to Z in the interface's language (Milestone 11, decision 6). */
export function galleryPages(
  references: readonly ReferenceSummaryView[],
  kind: ReferenceSummaryView['kind'],
  locale: string,
): ReferenceSummaryView[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  return references.filter((reference) => reference.kind === kind).sort((a, b) => collator.compare(a.title, b.title))
}

const WIKI = /\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g
const LINK = /!?\[((?:\\.|[^\]\\\n])*)\]\((?:<[^>\n]*>|[^\s)]+)(?:[ \t]+"[^"\n]*")?\)/g

/** "Sister of [Bea](bea.md)" as it reads: "Sister of Bea". Links become their text; other marks stay. */
export function linkTextOnly(text: string): string {
  return text
    .replace(LINK, (_match, label: string) => label.replace(/\\([[\]\\])/g, '$1'))
    .replace(WIKI, (_match, name: string, alias: string | undefined) => (alias ?? name).trim())
}

/**
 * A relationship the app can reword: words, then one link at the end, as the app writes them
 * ("Sister of [Bea](bea.md)"). Anything else is `null`, and is changed in the page's text instead.
 */
export function relationshipWords(text: string): { words: string; link: string } | null {
  const links = [...text.matchAll(LINK), ...text.matchAll(WIKI)]
  const only = links.length === 1 ? links[0] : undefined
  if (!only || only.index + only[0].length !== text.trimEnd().length) return null
  return { words: text.slice(0, only.index).trim(), link: only[0] }
}

/** Picks out an outline's cards on the board: the same card by its section and text. */
export const cardKey = (section: string | null, card: string): string => `${section ?? ''}\n${card}`
