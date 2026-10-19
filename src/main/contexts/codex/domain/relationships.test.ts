import { describe, expect, it } from 'vitest'
import { buildLinkIndex, type LinkCandidate } from '../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { canEditRelationships, listedBy, relationshipFields } from './relationships'

const p = (value: string): ProjectPath => value as ProjectPath
const candidates: LinkCandidate[] = [
  { path: p('characters/Ilka Szabó.md'), type: 'character' },
  { path: p('characters/Aunt Bea.md'), type: 'character' },
  { path: p('characters/Marrow.md'), type: 'character' },
  { path: p('locations/Marrow.md'), type: 'location' }
]
const links = buildLinkIndex(candidates)

describe('relationshipFields', () => {
  it('keeps existing links as written and leaves out empty fields', () => {
    expect(
      relationshipFields(
        [{ with: 'Aunt Bea', kind: 'mentor', note: '' }],
        [{ with: '[[Aunt Bea|Bea]]', kind: 'teacher' }],
        candidates,
        links
      )
    ).toEqual([
      [
        ['with', '[[Aunt Bea|Bea]]'],
        ['kind', 'mentor']
      ]
    ])
  })

  it('writes a new link with its folder when the name is shared', () => {
    expect(relationshipFields([{ with: 'Marrow', kind: 'rival' }], [], candidates, links)).toEqual([
      [
        ['with', '[[characters/Marrow]]'],
        ['kind', 'rival']
      ]
    ])
  })
})

describe('listedBy', () => {
  it('finds the characters whose relationships point here', () => {
    expect(
      listedBy(
        p('characters/Aunt Bea.md'),
        [
          {
            path: p('characters/Ilka Szabó.md'),
            title: 'Ilka Szabó',
            frontmatter: {
              relationships: [
                { with: '[[Aunt Bea]]', kind: 'mentor', note: 'Taught her to graft.' },
                { with: '[[Marrow]]' }
              ]
            }
          },
          { path: p('characters/Aunt Bea.md'), title: 'Aunt Bea', frontmatter: {} }
        ],
        links
      )
    ).toEqual([
      {
        path: 'characters/Ilka Szabó.md',
        title: 'Ilka Szabó',
        kind: 'mentor',
        note: 'Taught her to graft.'
      }
    ])
  })
})

describe('canEditRelationships', () => {
  it('accepts a missing value or plain items, and nothing nested', () => {
    expect(canEditRelationships(undefined)).toBe(true)
    expect(canEditRelationships([{ with: '[[Aunt Bea]]', kind: 'mentor' }])).toBe(true)
    expect(canEditRelationships('[[Aunt Bea]]')).toBe(false)
    expect(canEditRelationships([{ with: '[[Aunt Bea]]', since: { year: 1940 } }])).toBe(false)
  })
})
