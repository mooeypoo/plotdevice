import { describe, expect, it } from 'vitest'
import { buildLinkIndex } from '../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { pathFormRewrite, quotedLinkValue } from './warning-fixes'

const p = (value: string): ProjectPath => value as ProjectPath
const links = buildLinkIndex([
  { path: p('characters/Marrow.md'), type: 'character' },
  { path: p('locations/Marrow.md'), type: 'location' }
])

describe('pathFormRewrite', () => {
  const rewrite = pathFormRewrite('Marrow', p('locations/Marrow.md'), links)

  it('writes an ambiguous link with the chosen folder, keeping its visible text', () => {
    expect(rewrite({ target: 'Marrow', embed: false }, undefined)).toBe(
      '[[locations/Marrow|Marrow]]'
    )
    expect(
      rewrite({ target: 'marrow', shownText: 'the town', subpath: 'Mill', embed: false }, undefined)
    ).toBe('[[locations/Marrow#Mill|the town]]')
    expect(rewrite({ target: 'Marrow', subpath: 'Mill', embed: true }, undefined)).toBe(
      '![[locations/Marrow#Mill]]'
    )
  })

  it('leaves links that already mean one file alone', () => {
    expect(rewrite({ target: 'Marrow', embed: false }, 'location')).toBeUndefined()
    expect(rewrite({ target: 'locations/Marrow', embed: false }, undefined)).toBeUndefined()
    expect(rewrite({ target: 'Ilka', embed: false }, undefined)).toBeUndefined()
  })
})

describe('quotedLinkValue', () => {
  it('turns unquoted links back into link text', () => {
    expect(quotedLinkValue([['Ilka Szabó']])).toBe('[[Ilka Szabó]]')
    expect(quotedLinkValue([[['Ilka Szabó']], '[[Aunt Bea]]'])).toEqual([
      '[[Ilka Szabó]]',
      '[[Aunt Bea]]'
    ])
    expect(quotedLinkValue([[['Ilka']], 7])).toBeUndefined()
  })
})
