import type { ExportBlock, TextDirection } from '@plotdevice/markdown'

export interface ExportedChapter {
  kind: 'chapter'
  /** "Chapter 3", "פרק 3", in the book's word for chapters; `null` when the heading is only the name. */
  label: string | null
  /** The chapter's title; for an untitled poem, its first line, shown in the contents only. */
  name: string
  /** Laid out as verse: lines kept, stanzas spaced, no indent or justification (ADR 0013). */
  poem?: boolean
  /** An untitled poem: no heading above it, and its first line, in italics, in the contents. */
  untitled?: boolean
  /** Every paragraph, heading, quote and list has its direction resolved. */
  blocks: ExportBlock[]
}

export type ExportedEntry = { kind: 'part'; name: string } | ExportedChapter

/** A book ready to be written in any format: the chosen chapters, read and resolved (Milestone 22). */
export interface ExportedBook {
  title: string
  author: string | null
  /** A language tag such as `he` or `en-GB`. */
  language: string
  direction: TextDirection
  /** A stable identifier for the book, such as its project id. */
  id: string
  /** When the file was made, as an ISO date and time; passed in so the same book gives the same file. */
  made: string
  entries: ExportedEntry[]
}
