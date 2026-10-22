export { romanNumeral } from './roman-numeral'
import type { ChapterDto, UnorderedReasonDto } from '../../../contract/dtos'
import type { Translator } from '../../../i18n/translator'
import { isolate } from './isolate'

/** Why a chapter is unordered, in a few words. */
export function describeUnorderedReason(reason: UnorderedReasonDto, t: Translator['t']): string {
  switch (reason) {
    case 'missing-order':
      return t('placement-missing-order')
    case 'no-part':
      return t('placement-no-part')
    case 'part-not-a-link':
      return t('placement-part-not-a-link')
    case 'part-not-found':
      return t('placement-part-not-found')
    case 'part-ambiguous':
      return t('placement-part-ambiguous')
  }
}

const STATUS_COLORS: Readonly<Record<string, string>> = {
  idea: 'var(--status-idea)',
  outline: 'var(--status-outline)',
  draft: 'var(--status-draft)',
  revised: 'var(--status-revised)',
  final: 'var(--status-final)'
}

/** The dot color for a status. Statuses beyond the defaults share one color. */
export function statusColor(status: string | undefined): string {
  if (status === undefined) return 'var(--status-none)'
  return STATUS_COLORS[status.toLowerCase()] ?? 'var(--status-other)'
}

/** A word count: "—" for none, otherwise formatted for the UI locale. */
export function formatWordCount(
  count: number,
  formatNumber: (value: number) => string = String
): string {
  return count === 0 ? '—' : formatNumber(count)
}

/** Describes a chapter's order clash, isolating sibling titles only for presentation. */
export function clashDescription(
  chapter: ChapterDto,
  siblings: readonly ChapterDto[],
  t: Translator['t']
): string | undefined {
  if (!chapter.duplicateOrder) return undefined
  const others = siblings
    .filter((other) => other.path !== chapter.path && other.order === chapter.order)
    .map((other) => t('placement-quoted-title', isolate(other.title)))
    .reduce((list, title, index) => (index === 0 ? title : t('warning-list', list, title)), '')
  return t('placement-clash', String(chapter.order), others)
}
