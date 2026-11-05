import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { mainOutlineOf, mainOutlineToKeep } from './main-outline'

const path = (value: string) => value as ProjectPath
const outlines = [path('outlines/loose-ideas.md'), path('outlines/main-story.md'), path('outlines/beas-path.md')]

describe('the main outline', () => {
  it('is the one project.md names', () => {
    expect(mainOutlineOf(path('outlines/main-story.md'), outlines)).toBe('outlines/main-story.md')
  })

  it('is the first outline in the list when project.md names none', () => {
    expect(mainOutlineOf(null, outlines)).toBe('outlines/loose-ideas.md')
  })

  it('is the first outline when the named file is gone', () => {
    expect(mainOutlineOf(path('outlines/deleted.md'), outlines)).toBe('outlines/loose-ideas.md')
  })

  it('is the only outline of a book with one', () => {
    expect(mainOutlineOf(null, [path('outlines/main-story.md')])).toBe('outlines/main-story.md')
  })

  it('is none in a book without outlines', () => {
    expect(mainOutlineOf(path('outlines/main-story.md'), [])).toBeNull()
  })
})

describe('keeping the main outline when an outline is added', () => {
  it('writes down the current main when project.md doesn’t name it, so a new outline can’t take over', () => {
    expect(mainOutlineToKeep(null, outlines)).toBe('outlines/loose-ideas.md')
    expect(mainOutlineToKeep(path('outlines/deleted.md'), outlines)).toBe('outlines/loose-ideas.md')
  })

  it('writes nothing when project.md names it already, or when the book has no outline yet', () => {
    expect(mainOutlineToKeep(path('outlines/main-story.md'), outlines)).toBeNull()
    expect(mainOutlineToKeep(null, [])).toBeNull()
  })
})
