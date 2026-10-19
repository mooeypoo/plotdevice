/** What the writer changed in a codex entry's inspector. Only present fields change. */
export interface CodexChanges {
  readonly title?: string
  readonly aliases?: readonly string[]
  readonly role?: string
  /** As typed; commas separate several dates, like `story_date`. */
  readonly born?: string
}

/** One frontmatter key to set, or to remove when `value` is `undefined`. */
export interface CodexWrite {
  readonly key: string
  readonly value: string | number | readonly (string | number)[] | undefined
}

const WHOLE_NUMBER = /^[+-]?\d+$/u

/** Turns inspector changes into frontmatter writes. Empty text or an empty list removes the key. */
export function codexWrites(changes: CodexChanges): CodexWrite[] {
  const writes: CodexWrite[] = []
  const textKey = (key: string, value: string | undefined): void => {
    if (value === undefined) return
    const trimmed = value.trim()
    writes.push({ key, value: trimmed === '' ? undefined : trimmed })
  }
  textKey('title', changes.title)
  if (changes.aliases !== undefined) {
    const aliases = changes.aliases.map((alias) => alias.trim()).filter((alias) => alias !== '')
    writes.push({ key: 'aliases', value: aliases.length === 0 ? undefined : aliases })
  }
  textKey('role', changes.role)
  if (changes.born !== undefined) {
    const dates = changes.born
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '')
      .map((item) => (WHOLE_NUMBER.test(item) ? Number(item) : item))
    const [only] = dates
    writes.push({ key: 'born', value: dates.length > 1 ? dates : only })
  }
  return writes
}
