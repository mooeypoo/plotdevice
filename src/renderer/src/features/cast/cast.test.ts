import { describe, expect, it } from 'vitest'
import type { LinkAt } from '../../shared/link-at'
import { castMembers, withoutCode } from './cast-members'
import { outlineLinesFor } from './outline-mentions'

const files: Record<string, string> = {
  Ilka: 'characters/Ilka.md',
  'Aunt Bea': 'characters/Aunt Bea.md',
  Marrow: 'locations/Marrow.md',
  יעל: 'characters/יעל.md',
  'The Ferry': 'The Ferry.md'
}
const kinds: Record<string, string> = {
  'characters/Ilka.md': 'character',
  'characters/Aunt Bea.md': 'character',
  'characters/יעל.md': 'character',
  'locations/Marrow.md': 'location',
  'The Ferry.md': 'chapter'
}
const resolve = (link: LinkAt): string | undefined =>
  link.kind === 'wiki' ? files[link.target] : undefined
const kindOf = (path: string): string | undefined => kinds[path]

describe('castMembers', () => {
  it('orders point of view, listed characters, places, then text-only mentions, once each', () => {
    const members = castMembers(
      { pov: ['[[Ilka]]'], characters: ['[[Aunt Bea]]', '[[Ilka]]'], location: ['[[Marrow]]'] },
      'Bea meets [[יעל]] at [[Marrow]] and [[Aunt Bea|Bea]] again.',
      resolve,
      kindOf
    )
    expect(members).toEqual([
      { path: 'characters/Ilka.md', kind: 'character', role: 'pov' },
      { path: 'characters/Aunt Bea.md', kind: 'character', role: 'listed' },
      { path: 'locations/Marrow.md', kind: 'location', role: 'listed' },
      { path: 'characters/יעל.md', kind: 'character', role: 'mentioned' }
    ])
  })

  it('skips links in code, unresolved links and entries that are not characters or places', () => {
    const body = 'See [[The Ferry]], [[Nobody]], `[[Ilka]]` and\n```\n[[Marrow]]\n```\n'
    expect(castMembers({ pov: [], characters: [], location: [] }, body, resolve, kindOf)).toEqual(
      []
    )
  })

  it('removes fenced and inline code only', () => {
    expect(withoutCode('a `b` c\n~~~\nd\n~~~\ne')).toBe('a  c\n\ne')
  })
})

describe('outlineLinesFor', () => {
  it('returns the lines that link to the chapter, readable and in order', () => {
    const outline = [
      '## Part One',
      '- [[The Ferry]]: Ilka arrives; [[Aunt Bea|Bea]] waits.',
      '- Ilka finds the ledger.',
      '  - Echo of [the ferry](The%20Ferry.md) here',
      '```',
      '- [[The Ferry]] in code',
      '```'
    ].join('\n')
    const pointsHere = (link: LinkAt): boolean =>
      link.kind === 'wiki' ? link.target === 'The Ferry' : link.address === 'The%20Ferry.md'
    expect(outlineLinesFor(outline, pointsHere)).toEqual([
      'The Ferry: Ilka arrives; Bea waits.',
      'Echo of [the ferry](The%20Ferry.md) here'
    ])
  })
})
