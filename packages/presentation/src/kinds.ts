import type { ProjectView, ReferenceSummaryView } from '@plotdevice/contracts'
import { freeFolderName } from '@plotdevice/shared'

/** The interface's translator: a message key and its values. */
export type Translate = (key: string, ...params: (string | number)[]) => string

type Kinds = ProjectView['kinds']

/** The default kinds keep their translated messages, keyed by these words (`story-character`, `new-character`…). */
const BUILT_IN: Readonly<Record<string, string>> = { characters: 'character', places: 'place', notes: 'note' }

/** A default kind's message stem (`character`), or `null` for the author's own kinds and unsorted folders. */
export const builtInKindKey = (folder: string): string | null => BUILT_IN[folder] ?? null

export interface KindLabels {
  one: string
  many: string
  /** The button that adds a page: "New character", or "New Faction" for the author's kinds;
   * in Hebrew "הוספת פלג", so no adjective must agree in gender. */
  newPage: string
  /** The empty gallery's title and explanation. */
  empty: string
  emptyText: string
  /** The folded rest of a gallery grouped by tags: "All characters (3)". */
  all: (count: number) => string
}

/**
 * What the interface calls a kind of page (ADR 0011). The author's names come as typed, in any
 * language; buttons put them after "+" so Hebrew needs no adjective to agree in gender (Milestone 18,
 * open question 3). The default kinds, unrenamed, use the app's own translations. A folder the book
 * doesn't list is named as it is on disk.
 */
export function kindLabels(kinds: Kinds, folder: string, t: Translate): KindLabels {
  const kind = kinds.find((each) => each.folder === folder)
  const key = builtInKindKey(folder)
  if (kind?.one === undefined && kind?.many === undefined && key !== null && kind !== undefined)
    return {
      one: t(`kind-${key}`),
      many: t(`story-${key}`),
      newPage: t(`new-${key}`),
      empty: t(`gallery-empty-${key}`),
      emptyText: t(`gallery-empty-${key}-text`),
      all: (count) => t(`tag-all-${key}`, count),
    }
  const one = kind?.one ?? folder
  const many = kind?.many ?? folder
  return {
    one,
    many,
    newPage: t('new-page-of-kind', one),
    empty: t('gallery-empty-kind', many),
    emptyText: t('gallery-empty-kind-text'),
    all: (count) => t('tag-all-kind', many, count),
  }
}

/** Folders with pages that the book doesn't list as a kind, A to Z: "Not sorted yet". */
export function unsortedFolders(kinds: Kinds, references: readonly Pick<ReferenceSummaryView, 'kind'>[]): string[] {
  const listed = new Set(kinds.map((kind) => kind.folder))
  return [...new Set(references.map((reference) => reference.kind).filter((folder) => !listed.has(folder)))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Every page folder in order: the book's kinds as it lists them, then the unsorted. */
export function kindOrder(kinds: Kinds, references: readonly Pick<ReferenceSummaryView, 'kind'>[]): string[] {
  return [...kinds.map((kind) => kind.folder), ...unsortedFolders(kinds, references)]
}

/** The folder a new kind gets, from its plural, as the host will make it (ADR 0011, decision 8). */
export const kindFolderFor = (plural: string, kinds: Kinds): string =>
  freeFolderName(plural, [...kinds.map((kind) => kind.folder), 'manuscript', 'outlines'])
