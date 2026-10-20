import type { LinkTargetDto } from '../../../contract/dtos'

/** A file a link can point to, with the text to put inside `[[…]]`. */
export interface LinkChoice {
  /** The file name, or the path without `.md` when another file shares the name. */
  readonly target: string
  readonly name: string
  readonly path: string
  readonly type?: string
}

/** Names are compared as the app compares them: NFC and case-folded. */
export function nameKey(name: string): string {
  return name.normalize('NFC').toLowerCase()
}

/**
 * Every link target with the text a new link to it uses: its name, or its path form when the name
 * isn't unique (see "Writing links" in docs/file-format.md).
 */
export function linkChoices(targets: readonly LinkTargetDto[]): LinkChoice[] {
  const counts = new Map<string, number>()
  for (const target of targets)
    counts.set(nameKey(target.name), (counts.get(nameKey(target.name)) ?? 0) + 1)
  return targets.map((target) => ({
    target:
      (counts.get(nameKey(target.name)) ?? 0) > 1
        ? target.path.replace(/\.md$/iu, '').normalize('NFC')
        : target.name.normalize('NFC'),
    name: target.name,
    path: target.path,
    ...(target.type !== undefined ? { type: target.type } : {})
  }))
}

/** The choice a written link target (`Aunt Bea`, `characters/Marrow`) refers to, if any. */
export function choiceFor(choices: readonly LinkChoice[], written: string): LinkChoice | undefined {
  const key = nameKey(written.replace(/\.md$/iu, ''))
  return (
    choices.find((choice) => nameKey(choice.target) === key) ??
    choices.find((choice) => nameKey(choice.path.replace(/\.md$/iu, '')).endsWith(`/${key}`)) ??
    choices.find((choice) => nameKey(choice.name) === key)
  )
}

/**
 * The one file a written link target means, or `undefined` when it means none or several (an
 * ambiguous name). Path forms match the end of a path, as in "Resolving links".
 */
export function resolveWritten(
  choices: readonly LinkChoice[],
  written: string
): LinkChoice | undefined {
  const key = nameKey(written.trim().replace(/\.md$/iu, ''))
  if (key === '') return undefined
  const withoutExtension = (choice: LinkChoice): string =>
    nameKey(choice.path.replace(/\.md$/iu, ''))
  const matches = key.includes('/')
    ? choices.filter((choice) => {
        const path = withoutExtension(choice)
        return path === key || path.endsWith(`/${key}`)
      })
    : choices.filter((choice) => nameKey(choice.name) === key)
  return matches.length === 1 ? matches[0] : undefined
}

/**
 * The project path a markdown link's address points to, from the file it's written in:
 * `../characters/Ilka%20Szab%C3%B3.md` from `manuscript/One.md` is `characters/Ilka Szabó.md`.
 */
export function markdownLinkPath(address: string, fromPath: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/iu.test(address) || address.startsWith('#')) return undefined
  let decoded: string
  try {
    decoded = decodeURIComponent(address.split('#')[0] ?? '')
  } catch {
    return undefined
  }
  const segments = decoded.startsWith('/') ? [] : fromPath.split('/').slice(0, -1)
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return undefined
      segments.pop()
    } else {
      segments.push(segment)
    }
  }
  return segments.length === 0 ? undefined : segments.join('/')
}
