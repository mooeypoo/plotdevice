import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'

/** A group name or list can be edited; structured or non-text values remain read-only. */
export function canEditCharacterGroups(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string'))
  )
}

/** Reads normalized, nonempty memberships, preserving the first spelling of each name. */
export function characterGroups(value: unknown): string[] {
  const values: unknown[] = Array.isArray(value) ? value : [value]
  const groups = new Map<string, string>()
  for (const entry of values) {
    if (typeof entry !== 'string') continue
    const name = entry.trim().normalize('NFC')
    const key = nameComparisonKey(name)
    if (name !== '' && !groups.has(key)) groups.set(key, name)
  }
  return [...groups.values()]
}
