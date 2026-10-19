import { domainError, type DomainError } from './domain-error'
import { nameComparisonKey } from './name-comparison-key'
import { err, ok, type Result } from './result'

/**
 * A reference written as an Obsidian-style wikilink: `[[target#subpath|shown text]]`, or an embed
 * `![[…]]` (see "Links" in docs/file-format.md). It says what is linked, not which file it resolves to.
 */
export interface WikiLink {
  /** A file name without `.md`, or a path ending in one. Empty for a heading in the same file. */
  readonly target: string
  /** What follows `#`: a heading, or `^id` for a block. */
  readonly subpath?: string
  /** What follows `|`: the text shown instead of the target. */
  readonly shownText?: string
  readonly embed: boolean
}

/** Why a string was rejected by `parseWikiLink`. */
export type WikiLinkErrorCode = 'not-a-wikilink' | 'empty-target'

const WIKILINK = /^(!?)\[\[([^[\]\n]*)\]\]$/u
const MARKDOWN_EXTENSION = /\.md$/iu

/** Parses one complete wikilink, such as the quoted value of a frontmatter key. */
export function parseWikiLink(raw: string): Result<WikiLink, DomainError<WikiLinkErrorCode>> {
  const match = WIKILINK.exec(raw.trim())
  if (match === null) {
    return err(domainError('not-a-wikilink', `"${raw}" is not a [[wikilink]].`))
  }
  const embed = match[1] === '!'
  const inner = match[2] ?? ''

  const [reference, shownText] = splitOnce(inner, '|')
  // In a markdown table, Obsidian writes the pipe as `\|`.
  const unescapedReference = shownText !== undefined ? reference.replace(/\\$/u, '') : reference
  const [rawTarget, subpath] = splitOnce(unescapedReference, '#')
  const target = rawTarget.trim().replace(MARKDOWN_EXTENSION, '')

  if (target === '' && (subpath === undefined || subpath.trim() === '')) {
    return err(domainError('empty-target', `"${raw}" doesn't link to anything.`))
  }

  const trimmedShownText = shownText?.trim()
  const trimmedSubpath = subpath?.trim()
  return ok({
    target,
    ...(trimmedSubpath !== undefined && trimmedSubpath !== '' ? { subpath: trimmedSubpath } : {}),
    ...(trimmedShownText !== undefined && trimmedShownText !== ''
      ? { shownText: trimmedShownText }
      : {}),
    embed
  })
}

/** Writes a link in its canonical form. */
export function formatWikiLink(link: WikiLink): string {
  const subpath = link.subpath === undefined ? '' : `#${link.subpath}`
  const shownText = link.shownText === undefined ? '' : `|${link.shownText}`
  return `${link.embed ? '!' : ''}[[${link.target}${subpath}${shownText}]]`
}

/** The form in which a link's target is matched against file names and paths. */
export function wikiLinkTargetKey(link: WikiLink): string {
  return nameComparisonKey(link.target)
}

/** Whether the link names a path (`[[locations/Harbor]]`) rather than just a file name. */
export function isPathFormLink(link: WikiLink): boolean {
  return link.target.includes('/')
}

function splitOnce(text: string, separator: string): [string, string | undefined] {
  const index = text.indexOf(separator)
  return index === -1 ? [text, undefined] : [text.slice(0, index), text.slice(index + 1)]
}
