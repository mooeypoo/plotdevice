import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'
import { parseWikiLink } from '../../../shared-kernel/wiki-link'
import type { EntryProperties } from './entry-properties'

/** One frontmatter key to set, or to remove when `value` is `undefined`. */
export interface PropertyWrite {
  readonly key: string
  readonly value: string | number | readonly (string | number)[] | undefined
}

/**
 * What the writer changed in the inspector. Only present fields change. An empty text or an
 * empty list removes the key ("all keys are optional").
 */
export interface PropertyChanges {
  readonly title?: string
  readonly status?: string
  /** Link targets (file names), for example `Ilka Szabó`. */
  readonly pov?: readonly string[]
  readonly characters?: readonly string[]
  readonly location?: readonly string[]
  readonly threads?: readonly string[]
  /** As typed; commas separate the dates of a range. */
  readonly storyDate?: string
  readonly storyTime?: string
  readonly synopsis?: string
  /** A whole number sets the position; `null` removes `order` (the chapter leaves the numbered book). */
  readonly order?: number | null
}

const WHOLE_NUMBER = /^[+-]?\d+$/u

/** Turns inspector changes into frontmatter writes, keeping each key's existing shape where it can. */
export function propertyWrites(
  current: EntryProperties,
  changes: PropertyChanges
): PropertyWrite[] {
  const writes: PropertyWrite[] = []
  const textKey = (key: string, value: string | undefined): void => {
    if (value === undefined) return
    const trimmed = value.trim()
    writes.push({ key, value: trimmed === '' ? undefined : trimmed })
  }
  const linkKey = (
    key: string,
    targets: readonly string[] | undefined,
    existing: readonly string[],
    wasList: boolean
  ): void => {
    if (targets === undefined) return
    writes.push({
      key,
      value: shaped(
        targets.map((target) => linkText(target, existing)),
        wasList
      )
    })
  }

  textKey('title', changes.title)
  textKey('status', changes.status)
  linkKey('pov', changes.pov, current.pov, current.pov.length > 1)
  linkKey('characters', changes.characters, current.characters, true)
  linkKey('location', changes.location, current.location, current.location.length > 1)
  if (changes.threads !== undefined) {
    writes.push({ key: 'threads', value: shaped([...changes.threads], true) })
  }
  if (changes.storyDate !== undefined) {
    const dates = changes.storyDate
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '')
      .map((item) => (WHOLE_NUMBER.test(item) ? Number(item) : item))
    writes.push({ key: 'story_date', value: shaped(dates, false) })
  }
  textKey('story_time', changes.storyTime)
  textKey('synopsis', changes.synopsis)
  if (changes.order !== undefined) {
    writes.push({ key: 'order', value: changes.order ?? undefined })
  }
  return writes
}

/** Nothing → remove; one item → a single value unless the key is a list by nature; more → a list. */
function shaped<T extends string | number>(
  items: readonly T[],
  keepList: boolean
): T | readonly T[] | undefined {
  const [only] = items
  if (only === undefined) return undefined
  return items.length === 1 && !keepList ? only : items
}

/** The link to write for a target, reusing the writer's existing link (shown text, heading) when it has the same target. */
function linkText(target: string, existing: readonly string[]): string {
  const key = nameComparisonKey(target)
  const reused = existing.find((raw) => {
    const parsed = parseWikiLink(raw)
    return parsed.ok && nameComparisonKey(parsed.value.target) === key
  })
  return reused ?? `[[${target}]]`
}
