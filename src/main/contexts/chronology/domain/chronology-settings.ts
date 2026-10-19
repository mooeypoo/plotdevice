import type { Calendar } from './story-date'

/** A plotline from novel.md's `threads`. Chapters refer to it by `key`. */
export interface Thread {
  readonly key: string
  readonly name: string
  readonly color?: string
}

/** The parts of novel.md that chronology reads. */
export interface ChronologySettings {
  readonly calendar: Calendar
  readonly threads: readonly Thread[]
}

const THREAD_KEY = /^[A-Za-z0-9_-]+$/u

/** Reads `calendar` and `threads` from novel.md's frontmatter, ignoring what it can't use. */
export function readChronologySettings(frontmatter: unknown): ChronologySettings {
  const keys = isMapping(frontmatter) ? frontmatter : {}
  const calendar: Calendar = keys['calendar'] === 'day-count' ? 'day-count' : 'gregorian'
  const rawThreads = Array.isArray(keys['threads']) ? (keys['threads'] as unknown[]) : []
  const threads: Thread[] = []
  for (const raw of rawThreads) {
    if (!isMapping(raw)) continue
    const key = raw['key']
    if (typeof key !== 'string' || !THREAD_KEY.test(key) || threads.some((t) => t.key === key))
      continue
    const name =
      typeof raw['name'] === 'string' && raw['name'].trim() !== '' ? raw['name'].trim() : key
    const color = typeof raw['color'] === 'string' ? raw['color'] : undefined
    threads.push({ key, name, ...(color !== undefined ? { color } : {}) })
  }
  return { calendar, threads }
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
