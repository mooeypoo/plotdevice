import type { CodexEntryDto, CodexKindDto, CodexListingDto } from '../../../../contract/dtos'

/** One section of the codex list. */
export interface CodexSection {
  readonly kind: CodexKindDto
  readonly heading: string
  /** The label of the "+ New …" button and the title box. */
  readonly newLabel: string
  readonly entries: readonly CodexEntryDto[]
}

const SECTIONS: readonly Omit<CodexSection, 'entries'>[] = [
  { kind: 'character', heading: 'Characters', newLabel: 'character' },
  { kind: 'location', heading: 'Locations', newLabel: 'location' },
  { kind: 'note', heading: 'Notes', newLabel: 'note' }
]

/** The codex list's sections, always all three, so each can take a new entry. */
export function codexSections(listing: CodexListingDto | null): CodexSection[] {
  return SECTIONS.map((section) => ({
    ...section,
    entries: (listing?.entries ?? []).filter((entry) => entry.kind === section.kind)
  }))
}

/** The small text beside an entry: a character's role, or its other names. */
export function entryDetail(entry: CodexEntryDto): string | undefined {
  if (entry.role !== undefined) return entry.role
  return entry.aliases.length > 0 ? `also ${entry.aliases.join(', ')}` : undefined
}
