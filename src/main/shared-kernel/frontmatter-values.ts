/** Whether a parsed YAML value is a mapping of keys. */
export function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Trimmed, non-empty text, or `undefined`. Numbers are read as text (a title of `1984`). */
export function readEntryText(value: unknown): string | undefined {
  const text = typeof value === 'number' ? String(value) : value
  if (typeof text !== 'string') return undefined
  const trimmed = text.trim()
  return trimmed === '' ? undefined : trimmed
}

/** A whole number, or `undefined` for anything else (see "Order" in docs/file-format.md). */
export function readInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}
