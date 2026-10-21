import { describe, expect, it } from 'vitest'
import { buildLinkIndex } from '../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { entryWarnings } from './entry-warnings'

const p = (value: string): ProjectPath => value as ProjectPath
const links = buildLinkIndex([
  { path: p('locations/Marrow.md'), type: 'location' },
  { path: p('characters/Marrow.md'), type: 'character' },
  { path: p('characters/Ilka Szabó.md'), type: 'character' },
  { path: p('manuscript/Part One.md'), type: 'part' }
])
const ferry = p('manuscript/The Ferry.md')
const warn = (frontmatter: unknown, body = '') =>
  entryWarnings([{ path: ferry, frontmatter, body }], links)

describe('entryWarnings', () => {
  it('retains a textual description for a missing list member', () => {
    expect(warn({ pov: [undefined] })).toEqual([
      {
        code: 'unusable-value',
        title: 'The Ferry',
        reason: 'not-link',
        key: 'pov',
        value: 'undefined',
        paths: [ferry]
      }
    ])
  })

  it('finds nothing wrong in a tidy chapter', () => {
    expect(
      warn(
        { title: 'The Ferry', part: '[[Part One]]', order: 1, location: '[[Marrow]]' },
        'Ilka at [[locations/Marrow|Marrow]] with [[Ilka Szabó]].'
      )
    ).toEqual([])
  })

  it('flags a prose link that two files share, once, ignoring code', () => {
    const warnings = warn(
      { title: 'The Ferry' },
      'At [[Marrow]], then [[Marrow|the town]]. `[[Marrow]]`'
    )
    expect(warnings).toEqual([
      {
        code: 'ambiguous-link',
        title: 'The Ferry',
        link: '[[Marrow]]',
        location: { kind: 'body' },
        choices: [p('characters/Marrow.md'), p('locations/Marrow.md')],
        paths: [ferry],
        fix: {
          kind: 'path-form',
          name: 'Marrow',
          choices: [p('characters/Marrow.md'), p('locations/Marrow.md')]
        }
      }
    ])
  })

  it('lets a key’s expected type settle a shared name', () => {
    expect(warn({ location: '[[Marrow]]', pov: '[[Marrow]]' })).toEqual([])
    expect(warn({ characters: ['[[Ilka Szabó]]'], threads: ['[[Marrow]]'] })).toEqual([])
  })

  it('flags unquoted links, values that aren’t links, and orders that aren’t whole numbers', () => {
    expect(warn({ pov: [['Ilka Szabó']], characters: ['[[Ilka Szabó]]', 7], order: 1.5 })).toEqual([
      {
        code: 'unusable-value',
        title: 'The Ferry',
        reason: 'unquoted-link',
        key: 'pov',
        value: '[[Ilka Szabó]]',
        paths: [ferry],
        fix: { kind: 'quote', key: 'pov' }
      },
      {
        code: 'unusable-value',
        title: 'The Ferry',
        reason: 'not-link',
        key: 'characters',
        value: '7',
        paths: [ferry]
      },
      {
        code: 'unusable-value',
        title: 'The Ferry',
        reason: 'not-integer',
        key: 'order',
        value: '1.5',
        paths: [ferry]
      }
    ])
  })
})
