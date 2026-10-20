import type { LinkIndex } from '../../../shared-kernel/link-index'
import { linkKeyType } from '../../../shared-kernel/link-key-type'
import { nameComparisonKey } from '../../../shared-kernel/name-comparison-key'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { readLinkValue } from '../../../shared-kernel/read-link-value'
import { formatWikiLink, type WikiLink } from '../../../shared-kernel/wiki-link'

/** Decides a link's replacement, knowing which frontmatter key it's under (none in prose). */
export type LinkRewrite = (link: WikiLink, key: string | undefined) => string | undefined

/**
 * Rewrites each link with `name` that is ambiguous where it stands to point at `chosen` by path,
 * keeping what the reader sees: `[[Marrow]]` becomes `[[locations/Marrow|Marrow]]`.
 */
export function pathFormRewrite(name: string, chosen: ProjectPath, links: LinkIndex): LinkRewrite {
  const wanted = nameComparisonKey(name)
  const target = chosen.replace(/\.md$/iu, '')
  return (link, key) => {
    if (nameComparisonKey(link.target) !== wanted) return undefined
    const expected = key === undefined ? undefined : linkKeyType(key)
    if (links.resolve(link, expected).kind !== 'ambiguous') return undefined
    // An embed shows the target's content, not a label, so it gets no shown text.
    const shownText = link.shownText ?? (link.embed ? undefined : link.target)
    return formatWikiLink({ ...link, target, ...(shownText !== undefined ? { shownText } : {}) })
  }
}

/**
 * The value that puts a key's unquoted links (read by YAML as lists in lists) in quotes, or
 * `undefined` if the value holds something that isn't a link and can't be fixed this way.
 */
export function quotedLinkValue(value: unknown): string | string[] | undefined {
  const whole = readLinkValue(value)
  if (whole.kind === 'link') return formatWikiLink(whole.link)
  if (!Array.isArray(value)) return undefined
  const texts = (value as unknown[]).flatMap((item) => {
    const read = readLinkValue(item)
    return read.kind === 'link' ? [formatWikiLink(read.link)] : []
  })
  return texts.length === value.length ? texts : undefined
}
