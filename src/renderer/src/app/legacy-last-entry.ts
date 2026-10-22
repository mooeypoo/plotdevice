/**
 * The entry each project last had open, as the app remembered it before document tabs (ADR 0015).
 * Read once per project to seed its tabs, then removed (W6): nothing else reads or writes it.
 */
export const LEGACY_LAST_ENTRY_KEY = 'plotdevice.lastEntry'

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function readRecord(store: Storage): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(store.getItem(LEGACY_LAST_ENTRY_KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/**
 * The entry `projectRoot` last had open under the old key, if any, removing it from the record
 * (and the record once it is empty). Storage failures leave everything as it was.
 */
export function takeLegacyLastEntry(projectRoot: string): string | undefined {
  const store = storage()
  if (store === undefined) return undefined
  try {
    if (store.getItem(LEGACY_LAST_ENTRY_KEY) === null) return undefined
    const record = readRecord(store)
    const path = record[projectRoot]
    const rest = Object.fromEntries(Object.entries(record).filter(([root]) => root !== projectRoot))
    if (Object.keys(rest).length === 0) store.removeItem(LEGACY_LAST_ENTRY_KEY)
    else store.setItem(LEGACY_LAST_ENTRY_KEY, JSON.stringify(rest))
    return typeof path === 'string' ? path : undefined
  } catch {
    return undefined
  }
}
