import { describe, expect, it } from 'vitest'
import { basenameOf, collisionKey, dirnameOf, parseProjectPath, relativePath, resolveRelative, stemOf } from './project-path'

const problems = (path: string): string[] => {
  const parsed = parseProjectPath(path)
  return parsed.ok ? [] : parsed.error
}

describe('parseProjectPath', () => {
  it.each(['manuscript/the-crossing.md', 'manuscript/המעבר.md', 'The Salt Orchard/CONTENTS.md', "manuscript/ilka's-will.md"])('accepts %s', (path) => {
    expect(problems(path)).toEqual([])
  })

  it.each([
    ['', 'empty'],
    ['/etc/passwd', 'absolute'],
    ['C:/Users/x.md', 'absolute'],
    ['manuscript\\x.md', 'backslash'],
    ['../outside.md', 'parent-segment'],
    ['manuscript/./x.md', 'parent-segment'],
    ['manuscript//x.md', 'empty-segment'],
    ['manuscript/what?.md', 'forbidden-character'],
    ['manuscript/a:b.md', 'forbidden-character'],
    ['manuscript/con.md', 'reserved-name'],
    ['manuscript/LPT1', 'reserved-name'],
    ['manuscript/chapter.', 'trailing-dot-or-space'],
    ['manuscript/chapter ', 'trailing-dot-or-space'],
    [`manuscript/${'א'.repeat(130)}.md`, 'segment-too-long'],
  ])('rejects %j (%s)', (path, problem) => {
    expect(problems(path)).toContain(problem)
  })
})

describe('collisionKey: names that are the same file on case-insensitive disks', () => {
  it('ignores case', () => {
    expect(collisionKey('manuscript/Frost.md')).toBe(collisionKey('manuscript/frost.md'))
  })
  it('ignores Unicode normalization (NFC vs NFD)', () => {
    expect(collisionKey('No\u00ebl.md')).toBe(collisionKey('Noe\u0308l.md'))
  })
  it('ignores the order of Hebrew niqqud marks', () => {
    expect(collisionKey('\u05D1\u05BC\u05B8.md')).toBe(collisionKey('\u05D1\u05B8\u05BC.md'))
  })
})

describe('path helpers', () => {
  it('split paths', () => {
    expect(dirnameOf('manuscript/the-crossing.md')).toBe('manuscript')
    expect(dirnameOf('CONTENTS.md')).toBe('')
    expect(basenameOf('manuscript/the-crossing.md')).toBe('the-crossing.md')
    expect(stemOf('manuscript/the-crossing.md')).toBe('the-crossing')
  })

  it('resolve a link relative to a folder, refusing to leave the project', () => {
    expect(resolveRelative('outlines', '../manuscript/the-crossing.md')).toBe('manuscript/the-crossing.md')
    expect(resolveRelative('', 'manuscript/./frost.md')).toBe('manuscript/frost.md')
    expect(resolveRelative('notes', '../../outside.md')).toBeNull()
  })

  it('build relative links', () => {
    expect(relativePath('outlines', 'manuscript/the-crossing.md')).toBe('../manuscript/the-crossing.md')
    expect(relativePath('', 'manuscript/frost.md')).toBe('manuscript/frost.md')
    expect(relativePath('manuscript', 'manuscript/frost.md')).toBe('frost.md')
  })
})
