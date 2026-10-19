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
const warn = (frontmatter: unknown, body = ''): { code: string; message: string }[] =>
  entryWarnings([{ path: ferry, frontmatter, body }], links).map(({ code, message }) => ({
    code,
    message
  }))

describe('entryWarnings', () => {
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
        message:
          'The Ferry: [[Marrow]] in the text could mean characters/Marrow.md or locations/Marrow.md. Write it with its folder, like [[characters/Marrow]].'
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
        message:
          'The Ferry: pov: [[Ilka Szabó]] isn’t in quotes, so YAML reads it as a list. Write pov: "[[Ilka Szabó]]".'
      },
      {
        code: 'unusable-value',
        message: 'The Ferry: characters should be a link like "[[Name]]", not 7.'
      },
      { code: 'unusable-value', message: 'The Ferry: order should be a whole number, not 1.5.' }
    ])
  })
})
