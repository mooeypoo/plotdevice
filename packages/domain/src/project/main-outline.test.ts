import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { mainOutlineOf, mainOutlineToKeep, outlineRolesAfter, outlinesInUse } from './main-outline'

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

describe('setting aside, bringing back and deleting outlines', () => {
  const [loose, main, bea] = outlines as [ProjectPath, ProjectPath, ProjectPath]
  const named = { mainOutline: main, setAside: [] as ProjectPath[] }

  it('setting the main outline aside makes the first outline still in use main', () => {
    expect(outlineRolesAfter(named, outlines, { kind: 'set-aside', file: main })).toEqual({ setAside: [main], mainOutline: loose })
  })

  it('setting another aside keeps the main one, and writes it down if project.md didn’t name it', () => {
    expect(outlineRolesAfter(named, outlines, { kind: 'set-aside', file: bea })).toEqual({ setAside: [bea], mainOutline: main })
    // Unnamed, the first outline was main; setting the second aside doesn't change that.
    expect(outlineRolesAfter({ mainOutline: null, setAside: [] }, outlines, { kind: 'set-aside', file: main })).toEqual({
      setAside: [main],
      mainOutline: loose,
    })
  })

  it('bringing one back keeps the main outline', () => {
    expect(outlineRolesAfter({ mainOutline: loose, setAside: [main] }, outlines, { kind: 'bring-back', file: main })).toEqual({
      setAside: [],
      mainOutline: loose,
    })
  })

  it('deleting takes the outline out of both, and the next outline in use becomes main', () => {
    expect(outlineRolesAfter({ mainOutline: main, setAside: [bea] }, outlines, { kind: 'delete', file: main })).toEqual({
      setAside: [bea],
      mainOutline: loose,
    })
    expect(outlineRolesAfter({ mainOutline: main, setAside: [bea] }, outlines, { kind: 'delete', file: bea })).toEqual({
      setAside: [],
      mainOutline: main,
    })
  })

  it('names no main outline when none is left in use', () => {
    expect(outlineRolesAfter({ mainOutline: main, setAside: [loose, bea] }, outlines, { kind: 'set-aside', file: main })).toEqual({
      setAside: [loose, bea, main],
      mainOutline: null,
    })
  })

  it('a set-aside outline is never main, even if project.md names it', () => {
    expect(mainOutlineOf(main, outlinesInUse(outlines, [main]))).toBe(loose)
  })
})
