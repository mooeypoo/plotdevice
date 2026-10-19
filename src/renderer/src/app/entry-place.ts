/** What can be open in the editor: a part or chapter, or a codex entry. */
export type EntryKind = 'part' | 'chapter' | 'character' | 'location' | 'note' | 'template'

/** Where an entry sits, as the store that lists it describes it. */
export interface EntryPlace {
  readonly kind: EntryKind
  readonly title: string
  /** "Part I · Chapter 2", "Unordered", "Character"… */
  readonly label: string
  /** A chapter's part, so a chapter whose file vanished can be saved there again. */
  readonly partPath?: string
  /** For a template: the kind of entry it starts. */
  readonly templateOf?: 'character' | 'location' | 'note'
}
