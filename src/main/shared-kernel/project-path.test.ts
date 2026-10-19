import { describe, expect, it } from 'vitest'
import { parseFileName, type FileName } from './file-name'
import {
  isSameProjectPath,
  joinProjectPath,
  parseProjectPath,
  projectPathName,
  projectPathParent,
  projectPathSegments,
  projectPathStem,
  type ProjectPath
} from './project-path'

function path(raw: string): ProjectPath {
  const result = parseProjectPath(raw)
  if (!result.ok) throw new Error(`test setup: ${raw} is not a ProjectPath`)
  return result.value
}

function name(raw: string): FileName {
  const result = parseFileName(raw)
  if (!result.ok) throw new Error(`test setup: ${raw} is not a FileName`)
  return result.value
}

function errorCode(raw: string): string | undefined {
  const result = parseProjectPath(raw)
  return result.ok ? undefined : result.error.code
}

describe('parseProjectPath', () => {
  it.each([
    'novel.md',
    'manuscript/Part One/Arrival.md',
    'characters/Mira Kovač.md',
    'manuscript/חלק א/הגעה.md',
    // Files the app didn't create may have names the app would never write.
    'notes/Chapter #3 [draft].md',
    'notes/CON.md'
  ])('accepts %s exactly as written', (raw) => {
    expect(parseProjectPath(raw)).toEqual({ ok: true, value: raw })
  })

  it('keeps the exact Unicode form, because it identifies a file on disk', () => {
    const decomposed = 'characters/Kovac\u030C.md'
    expect(parseProjectPath(decomposed)).toEqual({ ok: true, value: decomposed })
  })

  it.each([
    ['', 'empty'],
    ['/novel.md', 'absolute'],
    ['C:/novel/novel.md', 'absolute'],
    ['c:novel.md', 'absolute'],
    ['manuscript\\Arrival.md', 'backslash'],
    ['\\\\server\\share\\novel.md', 'backslash'],
    ['manuscript//Arrival.md', 'empty-segment'],
    ['manuscript/', 'empty-segment'],
    ['./novel.md', 'dot-segment'],
    ['manuscript/../../etc/passwd', 'dot-segment'],
    ['notes/a\u0000b.md', 'control-character']
  ])('rejects %j (%s)', (raw, code) => {
    expect(errorCode(raw)).toBe(code)
  })
})

describe('ProjectPath parts', () => {
  const arrival = path('manuscript/Part One/Arrival.md')

  it('splits into segments, name, and stem', () => {
    expect(projectPathSegments(arrival)).toEqual(['manuscript', 'Part One', 'Arrival.md'])
    expect(projectPathName(arrival)).toBe('Arrival.md')
    expect(projectPathStem(arrival)).toBe('Arrival')
    expect(projectPathStem(path('notes/archive.tar.gz'))).toBe('archive.tar')
    expect(projectPathStem(path('notes/README'))).toBe('README')
  })

  it('finds the parent, and none at the project root', () => {
    expect(projectPathParent(arrival)).toBe('manuscript/Part One')
    expect(projectPathParent(path('novel.md'))).toBeUndefined()
  })

  it('joins a parent and a file name', () => {
    expect(joinProjectPath(path('manuscript/Part Two'), name('The Archive.md'))).toBe(
      'manuscript/Part Two/The Archive.md'
    )
    expect(joinProjectPath(undefined, name('novel.md'))).toBe('novel.md')
  })
})

describe('isSameProjectPath', () => {
  it('matches regardless of case, since Windows file systems ignore it', () => {
    expect(isSameProjectPath(path('locations/Harbor.md'), path('Locations/harbor.MD'))).toBe(true)
  })

  it('matches composed and decomposed Unicode', () => {
    expect(
      isSameProjectPath(path('characters/Kova\u010D.md'), path('characters/Kovac\u030C.md'))
    ).toBe(true)
  })

  it('does not match different files', () => {
    expect(isSameProjectPath(path('locations/Harbor.md'), path('notes/Harbor.md'))).toBe(false)
  })
})
