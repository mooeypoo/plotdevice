/** What can be open in the editor: a part or chapter, or a codex entry. */
export type EntryKind =
  'part' | 'chapter' | 'character' | 'location' | 'note' | 'template' | 'outline'

/** Semantic position information for labels translated only at the presentation boundary. */
export type EntryPlaceLabel =
  | { readonly type: 'part'; readonly number: number }
  | { readonly type: 'not-in-sequence' }
  | { readonly type: 'chapter'; readonly number: number | undefined }
  | {
      readonly type: 'part-chapter'
      readonly partNumber: number
      readonly chapterNumber?: number
    }
  | { readonly type: 'unsequenced-part-chapter'; readonly partTitle: string }
  | { readonly type: 'unordered' }
  | { readonly type: 'codex-kind'; readonly kind: 'character' | 'location' | 'note' }
  | { readonly type: 'outline' }
  | { readonly type: 'template' }

/** Where an entry sits, as the store that lists it describes it. */
export interface EntryPlace {
  readonly kind: EntryKind
  readonly title: string
  readonly label: EntryPlaceLabel
  /** A chapter's part, so a chapter whose file vanished can be saved there again. */
  readonly partPath?: string
  /** For a template: the kind of entry it starts. */
  readonly templateOf?: 'character' | 'location' | 'note'
}
