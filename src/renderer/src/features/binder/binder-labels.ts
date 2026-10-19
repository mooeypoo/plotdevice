export { romanNumeral } from '../../shared/roman-numeral'
import type { UnorderedReasonDto } from '../../../../contract/dtos'

/** Why a chapter is unordered, in a few words. */
export function describeUnorderedReason(reason: UnorderedReasonDto): string {
  switch (reason) {
    case 'missing-order':
      return 'needs an order'
    case 'no-part':
      return 'needs a part'
    case 'part-not-a-link':
      return 'part isn’t a link'
    case 'part-not-found':
      return 'part not found'
    case 'part-ambiguous':
      return 'part is ambiguous'
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

const wordFormat = new Intl.NumberFormat(undefined)

/** A word count for the binder: "—" for none, digits grouped for the locale. */
export function formatWordCount(count: number): string {
  return count === 0 ? '—' : wordFormat.format(count)
}
