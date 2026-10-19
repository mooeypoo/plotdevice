import { describe, expect, it } from 'vitest'
import type { ProjectPath } from './project-path'
import { retargetWikiLink } from './retarget-wiki-link'

const to = 'manuscript/Part Two/The Crossing.md' as ProjectPath

describe('retargetWikiLink', () => {
  it('names the new file in a name link, keeping shown text and heading', () => {
    expect(
      retargetWikiLink(
        { target: 'The Ferry', shownText: 'the boat', subpath: 'Arrival', embed: false },
        to
      )
    ).toEqual({ target: 'The Crossing', shownText: 'the boat', subpath: 'Arrival', embed: false })
  })

  it('keeps a path link’s depth', () => {
    expect(retargetWikiLink({ target: 'Part One/The Ferry', embed: false }, to).target).toBe(
      'Part Two/The Crossing'
    )
    expect(retargetWikiLink({ target: 'manuscript/Part One/The Ferry', embed: true }, to)).toEqual({
      target: 'manuscript/Part Two/The Crossing',
      embed: true
    })
  })
})
