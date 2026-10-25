/** Half-open range of UTF-16 code units into the decoded text, BOM excluded (ADR 0003). */
export interface TextRange {
  start: number
  end: number
}

export type ListMarker = { kind: 'bullet'; char: '-' | '*' | '+' } | { kind: 'ordered'; number: number; delimiter: '.' | ')' }

/** Why a block is shown "kept as written" instead of as part of the outline. */
export type KeptReason =
  /** `###` and deeper headings: shown as group labels inside a column. */
  | 'subheading'
  /** A paragraph after a section's first card. */
  | 'paragraph-after-cards'
  /** Anything after a card's first line: extra paragraphs, code, tables, quotes. Moves with the card. */
  | 'item-continuation'
  /** Any other block: tables, code, HTML, quotes between cards. */
  | 'unsupported-block'

/** Markdown the outline views don't edit. It is preserved exactly and shown as written. */
export interface KeptBlock {
  /** The mdast node type, such as `code`, `table`, `html` or `heading`. */
  type: string
  range: TextRange
  reason: KeptReason
}

export interface OutlineItemSource {
  /** The item's first paragraph as written, after any task checkbox. */
  text: string
  textRange: TextRange
  /** Whole lines: from the marker line's start to the end of the item's last line, line ending included. */
  lineRange: TextRange
  /** Whitespace before the marker. */
  indent: string
  marker: ListMarker
  /** Whitespace between the marker and the text. */
  gap: string
  /** A task item's checkbox state; `null` when it isn't a task. */
  checked: boolean | null
  children: OutlineItemSource[]
  kept: KeptBlock[]
  /** Whether the list this item belongs to has blank lines between its items. */
  listIsLoose: boolean
  isFirstInList: boolean
  /** The next item in the same Markdown list (not merely the same section). */
  nextInList: OutlineItemSource | null
  /** False when the marker shares its line with other syntax (`- - x`, `> - x`): such items can't move. */
  movable: boolean
}

export interface OutlineHeadingSource {
  text: string
  textRange: TextRange
  lineRange: TextRange
}

export interface OutlineSectionSource {
  /** `null` for the unnamed section: cards before the first `##` heading. */
  heading: OutlineHeadingSource | null
  range: TextRange
  /** End of the section's last non-blank line: where the first card of an empty section goes. */
  contentEnd: number
  intro: TextRange[]
  items: OutlineItemSource[]
  kept: KeptBlock[]
}

export type OutlineWarningCode = 'invalid-frontmatter' | 'unmovable-item' | KeptReason

export interface OutlineWarning {
  code: OutlineWarningCode
  range: TextRange
}

/**
 * An outline file read for structure, with the source range of everything (ADR 0003). It never
 * replaces the text: edits are splices planned from these ranges.
 */
export interface ParsedOutline {
  source: string
  frontmatter: { range: TextRange; valid: boolean } | null
  title: OutlineHeadingSource | null
  /** Blocks before the first section, other than the title. */
  preamble: KeptBlock[]
  sections: OutlineSectionSource[]
  /** One level of nesting as the file writes it, or `null` when nothing is nested. */
  nestingUnit: string | null
  warnings: OutlineWarning[]
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

export type OutlineRefusal =
  | 'no-such-item'
  | 'no-such-section'
  | 'index-out-of-range'
  | 'into-own-subtree'
  | 'unmovable-item'
  | 'unnamed-section'
  | 'multiline-text'
  | 'multiline-heading'
