import { describe, expect, it } from 'vitest'
import {
  formatWikiLink,
  isPathFormLink,
  parseWikiLink,
  wikiLinkTargetKey,
  type WikiLink
} from './wiki-link'

function link(raw: string): WikiLink {
  const result = parseWikiLink(raw)
  if (!result.ok) throw new Error(`test setup: ${raw} is not a wikilink`)
  return result.value
}

function errorCode(raw: string): string | undefined {
  const result = parseWikiLink(raw)
  return result.ok ? undefined : result.error.code
}

describe('parseWikiLink', () => {
  it.each<[string, WikiLink]>([
    ['[[Mira Kovač]]', { target: 'Mira Kovač', embed: false }],
    ['[[Mira Kovač|Mira]]', { target: 'Mira Kovač', shownText: 'Mira', embed: false }],
    ['[[Mira Kovač#History]]', { target: 'Mira Kovač', subpath: 'History', embed: false }],
    ['[[Mira Kovač#^ab12]]', { target: 'Mira Kovač', subpath: '^ab12', embed: false }],
    [
      '[[Mira Kovač#History|her past]]',
      { target: 'Mira Kovač', subpath: 'History', shownText: 'her past', embed: false }
    ],
    ['![[Harbor]]', { target: 'Harbor', embed: true }],
    [
      '[[locations/Harbor|Harbor]]',
      { target: 'locations/Harbor', shownText: 'Harbor', embed: false }
    ],
    ['[[Harbor.md]]', { target: 'Harbor', embed: false }],
    ['[[ Harbor ]]', { target: 'Harbor', embed: false }],
    ['[[Harbor|]]', { target: 'Harbor', embed: false }],
    ['[[מירה|מירה הצעירה]]', { target: 'מירה', shownText: 'מירה הצעירה', embed: false }],
    // Inside a markdown table, Obsidian escapes the pipe.
    ['[[Mira Kovač\\|Mira]]', { target: 'Mira Kovač', shownText: 'Mira', embed: false }],
    // A heading in the same file.
    ['[[#History]]', { target: '', subpath: 'History', embed: false }]
  ])('parses %s', (raw, expected) => {
    expect(parseWikiLink(raw)).toEqual({ ok: true, value: expected })
  })

  it.each(['Mira', '[Mira]', '[[Mira]', '[[Mira]] and more', '[[a [[b]] c]]', '[[two\nlines]]'])(
    'rejects %j as not a wikilink',
    (raw) => {
      expect(errorCode(raw)).toBe('not-a-wikilink')
    }
  )

  it.each(['[[]]', '[[ ]]', '[[|Mira]]', '![[]]'])('rejects %j as having no target', (raw) => {
    expect(errorCode(raw)).toBe('empty-target')
  })
})

describe('formatWikiLink', () => {
  it.each([
    '[[Mira Kovač]]',
    '[[Mira Kovač|Mira]]',
    '[[Mira Kovač#History|her past]]',
    '![[Harbor]]',
    '[[locations/Harbor|Harbor]]',
    '[[#History]]'
  ])('round-trips %s', (raw) => {
    expect(formatWikiLink(link(raw))).toBe(raw)
  })
})

describe('wikiLinkTargetKey', () => {
  it('compares targets without case or Unicode form differences', () => {
    expect(wikiLinkTargetKey(link('[[MIRA KOVAČ]]'))).toBe(
      wikiLinkTargetKey(link('[[mira kovač]]'))
    )
    expect(wikiLinkTargetKey(link('[[Kova\u010D]]'))).toBe(
      wikiLinkTargetKey(link('[[Kovac\u030C]]'))
    )
  })

  it('ignores shown text, subpath, and embedding', () => {
    expect(wikiLinkTargetKey(link('![[Harbor#Docks|the docks]]'))).toBe(
      wikiLinkTargetKey(link('[[Harbor]]'))
    )
  })
})

describe('isPathFormLink', () => {
  it('tells path-form links from name links', () => {
    expect(isPathFormLink(link('[[locations/Harbor]]'))).toBe(true)
    expect(isPathFormLink(link('[[Harbor]]'))).toBe(false)
  })
})
