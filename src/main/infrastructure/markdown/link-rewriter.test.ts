import { describe, expect, it } from 'vitest'
import { formatWikiLink } from '../../shared-kernel/wiki-link'
import { codeRanges } from './code-ranges'
import { findWikiLinks, rewriteWikiLinks } from './link-rewriter'

const renameFerry = (text: string): ReturnType<typeof rewriteWikiLinks> =>
  rewriteWikiLinks(
    text,
    (link) =>
      link.target === 'The Ferry' ? formatWikiLink({ ...link, target: 'The Crossing' }) : undefined,
    { skipCode: true }
  )

describe('rewriteWikiLinks', () => {
  it('rewrites the target and keeps shown text, headings, and embeds', () => {
    expect(
      renameFerry(
        'See [[The Ferry]], [[The Ferry|the boat]], [[The Ferry#Arrival]], ![[The Ferry]].'
      )
    ).toEqual({
      text: 'See [[The Crossing]], [[The Crossing|the boat]], [[The Crossing#Arrival]], ![[The Crossing]].',
      count: 4
    })
  })

  it('leaves other links and all other text exactly as they were', () => {
    const text = 'Ilka took [[Aunt Bea|Bea]]’s hand.\r\nThen [[Marrow]].\r\n'
    expect(renameFerry(text)).toEqual({ text, count: 0 })
  })

  it('ignores links in code blocks and inline code', () => {
    const text =
      'A `[[The Ferry]]` and:\n```\n[[The Ferry]]\n```\n~~~md\n[[The Ferry]]\n~~~\nbut [[The Ferry]].'
    expect(renameFerry(text)).toEqual({
      text: text.replace('but [[The Ferry]].', 'but [[The Crossing]].'),
      count: 1
    })
  })

  it('treats an unclosed fence as code to the end', () => {
    expect(renameFerry('```\n[[The Ferry]]\n').count).toBe(0)
  })

  it('works with Hebrew text and links', () => {
    expect(
      rewriteWikiLinks(
        'וְ[[יעל]] ירדה.',
        (link) => (link.target === 'יעל' ? '[[יעל כהן]]' : undefined),
        { skipCode: true }
      )
    ).toEqual({ text: 'וְ[[יעל כהן]] ירדה.', count: 1 })
  })
})

describe('findWikiLinks', () => {
  it('lists links outside code', () => {
    expect(findWikiLinks('[[A]] `[[B]]` [[C|c]]', { skipCode: true }).map((l) => l.target)).toEqual(
      ['A', 'C']
    )
  })
})

describe('codeRanges', () => {
  it('finds fences and inline spans with matching backtick runs', () => {
    const text = 'a ``x ` y`` b\n```\ncode\n```\n'
    const ranges = codeRanges(text).map(([s, e]) => text.slice(s, e))
    expect(ranges).toEqual(['``x ` y``', '```\ncode\n```\n'])
  })
})
