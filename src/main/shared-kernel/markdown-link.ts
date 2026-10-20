import type { ProjectPath } from './project-path'

const MARKDOWN_LINK = /^\s*!?\[[^\]\n]*\]\(([^)\s]+)\)\s*$/u

/**
 * The file a markdown link value (`[Ilka](../characters/Ilka%20Szab%C3%B3.md)`) points to, from
 * the file it's written in. Web addresses, anchors, and paths leaving the project point nowhere.
 */
export function markdownLinkTarget(value: unknown, fromPath: ProjectPath): ProjectPath | undefined {
  if (typeof value !== 'string') return undefined
  const address = MARKDOWN_LINK.exec(value)?.[1]
  if (address === undefined || /^[a-z][a-z0-9+.-]*:/iu.test(address) || address.startsWith('#')) {
    return undefined
  }
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
  return segments.length === 0 ? undefined : (segments.join('/') as ProjectPath)
}
