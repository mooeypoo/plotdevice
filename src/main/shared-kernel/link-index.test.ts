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
  { path: path('manuscript/Part One/The Ferry.md'), type: 'chapter' },
  { path: path('characters/Marrow.md'), type: 'character' },
  { path: path('locations/Marrow.md'), type: 'location' },
  { path: path('characters/Ilka Szabó.md'), type: 'character' },
  { path: path('characters/Noe\u0308l.md'), type: 'character' },
  { path: path('characters/יעל.md'), type: 'character' },
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
    expect(index.resolve(link('[[ilka SZABÓ|Ilka]]'))).toMatchObject({ kind: 'resolved' })
    expect(index.resolve(link('[[No\u00EBl]]'))).toEqual({
      kind: 'resolved',
      path: 'characters/Noe\u0308l.md'
    })
    expect(index.resolve(link('[[The Ferry.md#Docks]]'))).toMatchObject({ kind: 'resolved' })
    expect(index.resolve(link('[[יעל]]'))).toMatchObject({ kind: 'resolved' })
  })

  it('reports a name shared by several files as ambiguous', () => {
    expect(index.resolve(link('[[Marrow]]'))).toEqual({
      kind: 'ambiguous',
      paths: ['characters/Marrow.md', 'locations/Marrow.md']
    })
  })

  it('uses the expected type to choose between files with the same name', () => {
    expect(index.resolve(link('[[Marrow]]'), 'location')).toEqual({
      kind: 'resolved',
      path: 'locations/Marrow.md'
    })
  })

  it('stays ambiguous when no candidate has the expected type', () => {
    expect(index.resolve(link('[[Marrow]]'), 'part')).toMatchObject({ kind: 'ambiguous' })
  })

  it('resolves a path-form link by the end of the path', () => {
    expect(index.resolve(link('[[locations/Marrow|Marrow]]'))).toEqual({
      kind: 'resolved',
      path: 'locations/Marrow.md'
    })
    expect(index.resolve(link('[[Part One/The Ferry]]'))).toMatchObject({ kind: 'resolved' })
  })

  it('does not match a path segment partially', () => {
    expect(index.resolve(link('[[ations/Marrow]]'))).toEqual({ kind: 'unresolved' })
  })

  it('reports a missing target as unresolved', () => {
    expect(index.resolve(link('[[Part Nine]]'))).toEqual({ kind: 'unresolved' })
    expect(index.resolve(link('[[#Heading]]'))).toEqual({ kind: 'unresolved' })
  })

  it('looks up the type of a resolved path', () => {
    expect(index.typeOf(path('locations/Marrow.md'))).toBe('location')
    expect(index.typeOf(path('notes/Loose.md'))).toBeUndefined()
  })
})
