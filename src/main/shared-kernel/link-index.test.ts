import { describe, expect, it } from 'vitest'
import { buildLinkIndex } from './link-index'
import type { ProjectPath } from './project-path'
import { parseWikiLink, type WikiLink } from './wiki-link'

function link(raw: string): WikiLink {
  const parsed = parseWikiLink(raw)
  if (!parsed.ok) throw new Error(`test setup: ${raw}`)
  return parsed.value
}

const path = (value: string): ProjectPath => value as ProjectPath

const index = buildLinkIndex([
  { path: path('manuscript/Part One/Part One.md'), type: 'part' },
  { path: path('manuscript/Part One/Arrival.md'), type: 'chapter' },
  { path: path('characters/Harbor.md'), type: 'character' },
  { path: path('locations/Harbor.md'), type: 'location' },
  { path: path('characters/Mira Kovač.md'), type: 'character' },
  { path: path('characters/Zoe\u0308.md'), type: 'character' },
  { path: path('characters/נועה.md'), type: 'character' },
  { path: path('notes/Loose.md') }
])

describe('buildLinkIndex', () => {
  it('resolves a link by file name', () => {
    expect(index.resolve(link('[[Part One]]'))).toEqual({
      kind: 'resolved',
      path: 'manuscript/Part One/Part One.md'
    })
  })

  it('ignores case, Unicode form, a .md suffix, and shown text or subpaths', () => {
    expect(index.resolve(link('[[mira KOVAČ|Mira]]'))).toMatchObject({ kind: 'resolved' })
    expect(index.resolve(link('[[Zo\u00EB]]'))).toEqual({
      kind: 'resolved',
      path: 'characters/Zoe\u0308.md'
    })
    expect(index.resolve(link('[[Arrival.md#Docks]]'))).toMatchObject({ kind: 'resolved' })
    expect(index.resolve(link('[[נועה]]'))).toMatchObject({ kind: 'resolved' })
  })

  it('reports a name shared by several files as ambiguous', () => {
    expect(index.resolve(link('[[Harbor]]'))).toEqual({
      kind: 'ambiguous',
      paths: ['characters/Harbor.md', 'locations/Harbor.md']
    })
  })

  it('uses the expected type to choose between files with the same name', () => {
    expect(index.resolve(link('[[Harbor]]'), 'location')).toEqual({
      kind: 'resolved',
      path: 'locations/Harbor.md'
    })
  })

  it('stays ambiguous when no candidate has the expected type', () => {
    expect(index.resolve(link('[[Harbor]]'), 'part')).toMatchObject({ kind: 'ambiguous' })
  })

  it('resolves a path-form link by the end of the path', () => {
    expect(index.resolve(link('[[locations/Harbor|Harbor]]'))).toEqual({
      kind: 'resolved',
      path: 'locations/Harbor.md'
    })
    expect(index.resolve(link('[[Part One/Arrival]]'))).toMatchObject({ kind: 'resolved' })
  })

  it('does not match a path segment partially', () => {
    expect(index.resolve(link('[[ations/Harbor]]'))).toEqual({ kind: 'unresolved' })
  })

  it('reports a missing target as unresolved', () => {
    expect(index.resolve(link('[[Part Nine]]'))).toEqual({ kind: 'unresolved' })
    expect(index.resolve(link('[[#Heading]]'))).toEqual({ kind: 'unresolved' })
  })

  it('looks up the type of a resolved path', () => {
    expect(index.typeOf(path('locations/Harbor.md'))).toBe('location')
    expect(index.typeOf(path('notes/Loose.md'))).toBeUndefined()
  })
})
