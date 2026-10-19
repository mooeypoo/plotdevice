import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readFrontmatter } from './read-frontmatter'

const fixture = join(import.meta.dirname, '../../../../fixtures/sample-novel')

function read(path: string): ReturnType<typeof readFrontmatter> {
  return readFrontmatter(readFileSync(join(fixture, path)))
}

describe('readFrontmatter', () => {
  it('reads values, keeping dates as text', () => {
    expect(read('manuscript/Part One/The Ferry.md')).toMatchObject({
      kind: 'read',
      data: { type: 'chapter', part: '[[Part One]]', order: 1, story_date: '1952-10-03' }
    })
  })

  it('reads a year-only date as a number, which StoryDate accepts', () => {
    expect(read('manuscript/Part Two/Café Ñandú.md')).toMatchObject({
      kind: 'read',
      data: { story_date: 1952 }
    })
  })

  it('reads an unquoted wikilink as a list inside a list', () => {
    expect(read('manuscript/Part Two/Shapes.md')).toMatchObject({
      kind: 'read',
      data: { pov: [['Ilka Szabó']] }
    })
  })

  it('reads an empty block as no values', () => {
    expect(read('manuscript/Part Two/Empty frontmatter.md')).toEqual({ kind: 'read', data: null })
  })

  it.each([
    ['manuscript/Part Two/Broken.md', 'unparseable'],
    ['notes/Unclosed.md', 'unclosed'],
    ['notes/Windows-1255.md', 'invalid-encoding'],
    ['manuscript/Part One/Margins.md', 'none']
  ])('reports %s as %s', (path, kind) => {
    expect(read(path).kind).toBe(kind)
  })
})
