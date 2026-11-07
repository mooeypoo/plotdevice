import type { ExportBlock, TextDirection } from '@plotdevice/markdown'

export interface ExportedChapter {
  kind: 'chapter'
  /** "Chapter 3", "פרק 3", in the book's word for chapters; `null` when the heading is only the name. */
  label: string | null
  name: string
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
