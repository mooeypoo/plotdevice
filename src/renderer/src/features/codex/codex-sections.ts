import type { CodexEntryDto, CodexKindDto, CodexListingDto } from '../../../../contract/dtos'
import type { Translator } from '../../../../i18n/translator'
import { isolate } from '../../shared/isolate'

/** One section of the codex list. */
export interface CodexSection {
  readonly kind: CodexKindDto
  readonly entries: readonly CodexEntryDto[]
}

const SECTIONS: readonly CodexKindDto[] = ['character', 'location', 'note']

/** The codex list's sections, always all three, so each can take a new entry. */
export function codexSections(listing: CodexListingDto | null): CodexSection[] {
  return SECTIONS.map((kind) => ({
    kind,
    entries: (listing?.entries ?? []).filter((entry) => entry.kind === kind)
  }))
}

/** Supporting text under a character's name (beside other entries): role, or other names. */
export function entryDetail(entry: CodexEntryDto, t: Translator['t']): string | undefined {
  if (entry.role !== undefined) return entry.role
  return entry.aliases.length > 0 ? t('codex-also-aliases', isolate(entry.aliases.join(', '))) : undefined
}
