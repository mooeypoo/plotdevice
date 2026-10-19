import type { LinkIndex } from '../../../shared-kernel/link-index'
import { linkKeyType } from '../../../shared-kernel/link-key-type'
import { findWikiLinks } from '../../../shared-kernel/link-rewriter'
import { projectPathStem, type ProjectPath } from '../../../shared-kernel/project-path'
import { readLinkValue } from '../../../shared-kernel/read-link-value'
import { formatWikiLink, type WikiLink } from '../../../shared-kernel/wiki-link'
import { isMapping, readEntryText } from './frontmatter-values'
import type { ManuscriptWarning } from './manuscript'

/** A part's or chapter's file as read: its frontmatter values and its body. */
export interface EntrySource {
  readonly path: ProjectPath
  readonly frontmatter: unknown
  readonly body: string
}

const LINK_KEYS = ['part', 'pov', 'characters', 'location'] as const

/**
 * Problems inside parts and chapters that the writer should fix by hand: links that could mean
 * more than one file, and values the app can't use as written. Files are never changed for them.
 */
export function entryWarnings(
  sources: readonly EntrySource[],
  links: LinkIndex
): ManuscriptWarning[] {
  return sources.flatMap((source) => warningsFor(source, links))
}

function warningsFor(source: EntrySource, links: LinkIndex): ManuscriptWarning[] {
  const keys = isMapping(source.frontmatter) ? source.frontmatter : {}
  const name = readEntryText(keys['title']) ?? projectPathStem(source.path)
  const warnings: ManuscriptWarning[] = []
  const unusable = (message: string): void => {
    warnings.push({ code: 'unusable-value', message: `${name}: ${message}`, paths: [source.path] })
  }
  const reported = new Set<string>()
  const checkAmbiguous = (link: WikiLink, where: string, key?: string): void => {
    const expected = key === undefined ? undefined : linkKeyType(key)
    const resolution = links.resolve(link, expected)
    const text = formatWikiLink({ target: link.target, embed: false })
    if (resolution.kind !== 'ambiguous' || reported.has(text)) return
    reported.add(text)
    warnings.push({
      code: 'ambiguous-link',
      message: `${name}: ${text} ${where} could mean ${resolution.paths.join(' or ')}. Write it with its folder, like [[${resolution.paths[0]?.replace(/\.md$/iu, '') ?? ''}]].`,
      paths: [source.path]
    })
  }

  for (const key of LINK_KEYS) {
    const value = keys[key]
    if (value === undefined || value === null) continue
    const whole = readLinkValue(value)
    const items: unknown[] =
      Array.isArray(value) && whole.kind !== 'link' ? (value as unknown[]) : [value]
    for (const item of items) {
      const read = readLinkValue(item)
      if (read.kind === 'link') {
        if (read.recovered === true) {
          unusable(
            `${key}: ${formatWikiLink(read.link)} isn’t in quotes, so YAML reads it as a list. Write ${key}: "${formatWikiLink(read.link)}".`
          )
        }
        checkAmbiguous(read.link, `in ${key}`, key)
      } else {
        unusable(`${key} should be a link like "[[Name]]", not ${JSON.stringify(item)}.`)
      }
    }
  }

  const order = keys['order']
  if (order !== undefined && order !== null && !Number.isInteger(order)) {
    unusable(`order should be a whole number, not ${JSON.stringify(order)}.`)
  }

  for (const link of findWikiLinks(source.body, { skipCode: true })) {
    checkAmbiguous(link, 'in the text')
  }
  return warnings
}
