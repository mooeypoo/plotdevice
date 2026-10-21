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

/** Describes a parsed frontmatter value for a semantic diagnostic, never for writing it back. */
export function describeFrontmatterValue(value: unknown): string {
  const serialized: unknown = JSON.stringify(value)
  return typeof serialized === 'string' ? serialized : 'undefined'
}
