import { err, ok, type ProjectPath, type Result } from '@plotdevice/shared'
import { markdownFileFor } from '../manuscript/index'

/** A card or a detail: one line of text, with details nested at any depth (ADR 0003). */
export interface OutlineItem {
  text: string
  /** A task item's checkbox; `null` when it isn't a task. */
  checked: boolean | null
  children: OutlineItem[]
  /** Content after the item's first line (paragraphs, code, tables), carried with it as written. */
  keptAsWritten: string[]
  /** False when the item shares its line with other Markdown and can't be moved safely. */
  movable: boolean
}

/** Something in a section the views show but don't edit: a `###` group label, or a block kept as written. */
export interface OutlineNote {
  kind: 'group' | 'kept'
  text: string
  /** Shown before the card at this index (or after the last card when it equals their number). */
  before: number
}

export interface OutlineSection {
  /** `null` for the unnamed section: cards before the first `##` heading. It is always first. */
  name: string | null
  intro: string[]
  items: OutlineItem[]
  notes: OutlineNote[]
}

/**
 * A story outline: sections, cards and details. Board, Outline and Cards are views of this one
 * structure, never copies of it. Cards are planning, not manuscript chapters (AGENTS.md, invariant 4).
 */
export interface Outline {
  title: string | null
  /** Blocks before the first section, kept as written. */
  preamble: string[]
  sections: OutlineSection[]
}

/** An item: its section, then the index at each level from the card down. */
export interface ItemPath {
  section: number
  path: readonly number[]
}

/** Where an item goes. `parentPath` is read before the move; `index` counts the siblings without the moving item. */
export interface ItemDestination {
  section: number
  parentPath: readonly number[]
  index: number
}

export type OutlineEdit =
  | { kind: 'move-item'; from: ItemPath; to: ItemDestination }
  | { kind: 'rename-item'; at: ItemPath; text: string }
  | { kind: 'add-item'; to: ItemDestination; text: string }
  | { kind: 'delete-item'; at: ItemPath }
  | { kind: 'rename-section'; section: number; text: string }
  | { kind: 'add-section'; index: number; text: string }
  /** `index` counts the other sections. */
  | { kind: 'move-section'; section: number; index: number }
  | { kind: 'delete-section'; section: number }
  | { kind: 'set-title'; text: string }

export type OutlineProblem =
  | 'no-such-item'
  | 'no-such-section'
  | 'index-out-of-range'
  | 'into-own-subtree'
  | 'unmovable-item'
  | 'unnamed-section'
  | 'empty-text'
  | 'multiline-text'

/**
 * Applies an edit to the outline's structure, or says why it can't be made. The file is the truth:
 * after an edit is written, the outline is read again, which also places notes where they now are.
 */
export function applyOutlineEdit(outline: Outline, edit: OutlineEdit): Result<Outline, OutlineProblem> {
  const textProblem = 'text' in edit ? checkText(edit.text) : null
  if (textProblem) return err(textProblem)
  const next: Outline = structuredCopy(outline)
  const problem = applyInPlace(next, edit)
  if (problem) return err(problem)
  // The unnamed section exists only while it holds cards.
  next.sections = next.sections.filter((section) => section.name !== null || section.items.length > 0)
  return ok(next)
}

function checkText(text: string): OutlineProblem | null {
  if (/[\r\n]/.test(text)) return 'multiline-text'
  return text.trim() === '' ? 'empty-text' : null
}

function applyInPlace(outline: Outline, edit: OutlineEdit): OutlineProblem | null {
  const { sections } = outline
  switch (edit.kind) {
    case 'move-item': {
      const from = locate(outline, edit.from)
      if (typeof from === 'string') return from
      if (!from.item.movable) return 'unmovable-item'
      const destination = containerAt(outline, edit.to.section, edit.to.parentPath)
      if (typeof destination === 'string') return destination
      if (destination.parent && contains(from.item, destination.parent)) return 'into-own-subtree'
      if (destination.parent && !destination.parent.movable) return 'unmovable-item'
      if (edit.to.index < 0 || edit.to.index > destination.items.length - (destination.items.includes(from.item) ? 1 : 0)) return 'index-out-of-range'
      from.siblings.splice(from.index, 1)
      destination.items.splice(edit.to.index, 0, from.item)
      return null
    }
    case 'rename-item': {
      const at = locate(outline, edit.at)
      if (typeof at === 'string') return at
      at.item.text = edit.text
      return null
    }
    case 'add-item': {
      const destination = containerAt(outline, edit.to.section, edit.to.parentPath)
      if (typeof destination === 'string') return destination
      if (edit.to.index < 0 || edit.to.index > destination.items.length) return 'index-out-of-range'
      destination.items.splice(edit.to.index, 0, { text: edit.text, checked: null, children: [], keptAsWritten: [], movable: true })
      return null
    }
    case 'delete-item': {
      const at = locate(outline, edit.at)
      if (typeof at === 'string') return at
      if (!at.item.movable) return 'unmovable-item'
      at.siblings.splice(at.index, 1)
      return null
    }
    case 'rename-section': {
      const section = sections[edit.section]
      if (!section) return 'no-such-section'
      if (section.name === null) return 'unnamed-section'
      section.name = edit.text
      return null
    }
    case 'add-section': {
      if (edit.index < 0 || edit.index > sections.length) return 'index-out-of-range'
      // A heading above the unnamed section would capture its cards.
      if (sections[edit.index]?.name === null) return 'unnamed-section'
      sections.splice(edit.index, 0, { name: edit.text, intro: [], items: [], notes: [] })
      return null
    }
    case 'move-section': {
      const section = sections[edit.section]
      if (!section) return 'no-such-section'
      if (edit.index < 0 || edit.index > sections.length - 1) return 'index-out-of-range'
      if (edit.index === edit.section) return null
      const others = sections.filter((_, i) => i !== edit.section)
      if (section.name === null || (edit.index === 0 && others[0]?.name === null)) return 'unnamed-section'
      sections.splice(edit.section, 1)
      sections.splice(edit.index, 0, section)
      return null
    }
    case 'delete-section': {
      const section = sections[edit.section]
      if (!section) return 'no-such-section'
      if (section.name === null) return 'unnamed-section'
      sections.splice(edit.section, 1)
      return null
    }
    case 'set-title':
      outline.title = edit.text
      return null
  }
}

interface Located {
  item: OutlineItem
  siblings: OutlineItem[]
  index: number
}

function locate(outline: Outline, at: ItemPath): Located | OutlineProblem {
  const section = outline.sections[at.section]
  if (!section) return 'no-such-section'
  let siblings = section.items
  let located: Located | null = null
  for (const index of at.path) {
    const item = siblings[index]
    if (!item) return 'no-such-item'
    located = { item, siblings, index }
    siblings = item.children
  }
  return located ?? 'no-such-item'
}

function containerAt(outline: Outline, section: number, parentPath: readonly number[]): { items: OutlineItem[]; parent: OutlineItem | null } | OutlineProblem {
  const target = outline.sections[section]
  if (!target) return 'no-such-section'
  if (parentPath.length === 0) return { items: target.items, parent: null }
  const parent = locate(outline, { section, path: parentPath })
  return typeof parent === 'string' ? parent : { items: parent.item.children, parent: parent.item }
}

const contains = (ancestor: OutlineItem, candidate: OutlineItem): boolean => ancestor === candidate || ancestor.children.some((child) => contains(child, candidate))

function structuredCopy(outline: Outline): Outline {
  const copyItem = (item: OutlineItem): OutlineItem => ({ ...item, keptAsWritten: [...item.keptAsWritten], children: item.children.map(copyItem) })
  return {
    title: outline.title,
    preamble: [...outline.preamble],
    sections: outline.sections.map((section) => ({ ...section, intro: [...section.intro], notes: section.notes.map((note) => ({ ...note })), items: section.items.map(copyItem) })),
  }
}

/** The file for a new outline, from its title: "Character arcs" → `outlines/character-arcs.md`. */
export function outlineFileFor(title: string, existing: readonly ProjectPath[]): ProjectPath {
  return markdownFileFor(OUTLINES_FOLDER, title, existing, 'outline')
}

export const OUTLINES_FOLDER = 'outlines'
