import type { LinkTargetDto } from '../../../../contract/dtos'

/** A wikilink found in text, with the offsets the editor needs to style it. */
export interface FoundWikiLink {
  readonly from: number
  readonly to: number
  /** The visible part: the shown text if there is one, otherwise the target. */
  readonly labelFrom: number
  readonly labelTo: number
  readonly target: string
  readonly embed: boolean
}

const WIKILINK = /(!?)\[\[([^[\]\n]+)\]\]/gu

/** Finds `[[…]]` and `![[…]]` links in `text`, with offsets relative to `offset`. */
export function findWikiLinks(text: string, offset = 0): FoundWikiLink[] {
  const found: FoundWikiLink[] = []
  for (const match of text.matchAll(WIKILINK)) {
    const embed = match[1] === '!'
    const inner = match[2] ?? ''
    const start = offset + match.index
    const innerStart = start + (embed ? 3 : 2)
    const pipe = inner.indexOf('|')
    const reference = pipe === -1 ? inner : inner.slice(0, pipe).replace(/\\$/u, '')
    const target = reference.split('#')[0]?.trim() ?? ''
    const label =
      pipe === -1
        ? { from: innerStart, to: innerStart + inner.length }
        : { from: innerStart + pipe + 1, to: innerStart + inner.length }
    found.push({
      from: start,
      to: start + match[0].length,
      labelFrom: label.from,
      labelTo: label.to,
      target,
      embed
    })
  }
  return found
}

/** How a link looks: the type of the file it points to, or why it doesn't point anywhere. */
export type LinkKind =
  | 'part'
  | 'chapter'
  | 'character'
  | 'location'
  | 'note'
  | 'scene'
  | 'untyped'
  | 'ambiguous'
  | 'missing'

const TYPED_KINDS: ReadonlySet<string> = new Set([
  'part',
  'chapter',
  'character',
  'location',
  'note',
  'scene'
])

/** Looks up a link target's kind by name, the way links resolve (NFC, case-insensitive). */
export function createLinkKindLookup(
  targets: readonly LinkTargetDto[]
): (target: string) => LinkKind {
  const kinds = new Map<string, LinkKind>()
  for (const { name, type } of targets) {
    const key = nameKey(name)
    const existing = kinds.get(key)
    const kind: LinkKind =
      type !== undefined && TYPED_KINDS.has(type) ? (type as LinkKind) : 'untyped'
    kinds.set(key, existing === undefined || existing === kind ? kind : 'ambiguous')
  }
  return (target) => {
    const name = target.replace(/\.md$/iu, '').split('/').pop() ?? ''
    return kinds.get(nameKey(name)) ?? 'missing'
  }
}

function nameKey(name: string): string {
  return name.normalize('NFC').toLowerCase()
}
