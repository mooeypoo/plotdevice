import type { LinkTargetDto } from '../../../../contract/dtos'

/** The file name a link points to: `[[Ilka Szabó|Ilka]]` → `Ilka Szabó`. */
export function linkTarget(link: string): string {
  const inner = /^!?\[\[([^\]]*)\]\]$/u.exec(link.trim())?.[1] ?? link
  return (inner.split('|')[0] ?? '').split('#')[0]?.trim() ?? ''
}

/** What a link shows: its shown text, or its target. */
export function linkLabel(link: string): string {
  const inner = /^!?\[\[([^\]]*)\]\]$/u.exec(link.trim())?.[1]
  if (inner === undefined) return link
  const [target, shown] = inner.split('|')
  return (shown ?? target ?? '').trim()
}

/** File names of the given types, sorted, for a picker's suggestions. */
export function namesOfType(
  targets: readonly LinkTargetDto[],
  types: readonly string[]
): readonly string[] {
  const names = targets.filter((target) => target.type !== undefined && types.includes(target.type))
  return [...new Set(names.map((target) => target.name))].sort((a, b) => a.localeCompare(b))
}
