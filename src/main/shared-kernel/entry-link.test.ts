import { describe, expect, it } from 'vitest'
import { linkTo } from './entry-link'
import type { ProjectPath } from './project-path'

const p = (value: string): ProjectPath => value as ProjectPath

describe('linkTo', () => {
  it('names the file, or its path when the name is shared', () => {
    const candidates = [
      { path: p('characters/Marrow.md') },
      { path: p('locations/Marrow.md') },
      { path: p('characters/Aunt Bea.md') }
    ]
    expect(linkTo(p('characters/Aunt Bea.md'), candidates)).toBe('[[Aunt Bea]]')
    expect(linkTo(p('locations/Marrow.md'), candidates)).toBe('[[locations/Marrow]]')
  })

  it('writes NFC even when the file name on disk is decomposed', () => {
    const decomposed = p('characters/Noël.md')
    expect(linkTo(decomposed, [{ path: decomposed }])).toBe('[[Noël]]')
  })
})
