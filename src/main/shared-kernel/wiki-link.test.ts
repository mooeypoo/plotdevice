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
    ['[[Ilka Szabó]]', { target: 'Ilka Szabó', embed: false }],
    ['[[Ilka Szabó|Ilka]]', { target: 'Ilka Szabó', shownText: 'Ilka', embed: false }],
    ['[[Ilka Szabó#History]]', { target: 'Ilka Szabó', subpath: 'History', embed: false }],
    ['[[Ilka Szabó#^ab12]]', { target: 'Ilka Szabó', subpath: '^ab12', embed: false }],
    [
      '[[Ilka Szabó#History|her past]]',
      { target: 'Ilka Szabó', subpath: 'History', shownText: 'her past', embed: false }
    ],
    ['![[Marrow]]', { target: 'Marrow', embed: true }],
    [
      '[[locations/Marrow|Marrow]]',
      { target: 'locations/Marrow', shownText: 'Marrow', embed: false }
    ],
    ['[[Marrow.md]]', { target: 'Marrow', embed: false }],
    ['[[ Marrow ]]', { target: 'Marrow', embed: false }],
    ['[[Marrow|]]', { target: 'Marrow', embed: false }],
    ['[[מירה|מירה הצעירה]]', { target: 'מירה', shownText: 'מירה הצעירה', embed: false }],
    // Inside a markdown table, Obsidian escapes the pipe.
    ['[[Ilka Szabó\\|Ilka]]', { target: 'Ilka Szabó', shownText: 'Ilka', embed: false }],
    // A heading in the same file.
    ['[[#History]]', { target: '', subpath: 'History', embed: false }]
  ])('parses %s', (raw, expected) => {
    expect(parseWikiLink(raw)).toEqual({ ok: true, value: expected })
  })

  it.each(['Ilka', '[Ilka]', '[[Ilka]', '[[Ilka]] and more', '[[a [[b]] c]]', '[[two\nlines]]'])(
    'rejects %j as not a wikilink',
    (raw) => {
      expect(errorCode(raw)).toBe('not-a-wikilink')
    }
  )

  it.each(['[[]]', '[[ ]]', '[[|Ilka]]', '![[]]'])('rejects %j as having no target', (raw) => {
    expect(errorCode(raw)).toBe('empty-target')
  })
})

describe('formatWikiLink', () => {
  it.each([
    '[[Ilka Szabó]]',
    '[[Ilka Szabó|Ilka]]',
    '[[Ilka Szabó#History|her past]]',
    '![[Marrow]]',
    '[[locations/Marrow|Marrow]]',
    '[[#History]]'
  ])('round-trips %s', (raw) => {
    expect(formatWikiLink(link(raw))).toBe(raw)
  })
})

describe('wikiLinkTargetKey', () => {
  it('compares targets without case or Unicode form differences', () => {
    expect(wikiLinkTargetKey(link('[[ILKA SZABÓ]]'))).toBe(
      wikiLinkTargetKey(link('[[ilka szabó]]'))
    )
    expect(wikiLinkTargetKey(link('[[Szab\u00F3]]'))).toBe(
      wikiLinkTargetKey(link('[[Szabo\u0301]]'))
    )
  })

  it('ignores shown text, subpath, and embedding', () => {
    expect(wikiLinkTargetKey(link('![[Marrow#Mill|the mill]]'))).toBe(
      wikiLinkTargetKey(link('[[Marrow]]'))
    )
  })
})

describe('isPathFormLink', () => {
  it('tells path-form links from name links', () => {
    expect(isPathFormLink(link('[[locations/Marrow]]'))).toBe(true)
    expect(isPathFormLink(link('[[Marrow]]'))).toBe(false)
  })
})
