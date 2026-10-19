import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from './split-frontmatter'

const fixture = join(import.meta.dirname, '../../../../fixtures/sample-novel')
const encoder = new TextEncoder()

function split(text: string): ReturnType<typeof splitFrontmatter> {
  return splitFrontmatter(encoder.encode(text))
}

function readFixture(path: string): ReturnType<typeof splitFrontmatter> {
  return splitFrontmatter(readFileSync(join(fixture, path)))
}

describe('splitFrontmatter', () => {
  it('separates frontmatter from the body', () => {
    const result = split('---\ntitle: The Ferry\n---\nProse.\n')
    expect(result).toMatchObject({ kind: 'frontmatter', hasBom: false, yaml: 'title: The Ferry\n' })
    if (result.kind === 'frontmatter') expect(result.text.slice(result.bodyStart)).toBe('Prose.\n')
  })

  it('keeps CRLF inside the frontmatter and finds the body after it', () => {
    const result = split('---\r\ntitle: The Ferry\r\n---\r\nProse.\r\n')
    expect(result).toMatchObject({ kind: 'frontmatter', yaml: 'title: The Ferry\r\n' })
    if (result.kind === 'frontmatter')
      expect(result.text.slice(result.bodyStart)).toBe('Prose.\r\n')
  })

  it('accepts a closing line at the very end of the file', () => {
    const result = split('---\ntitle: x\n---')
    expect(result).toMatchObject({ kind: 'frontmatter', yaml: 'title: x\n' })
    if (result.kind === 'frontmatter') expect(result.bodyStart).toBe(result.text.length)
  })

  it('accepts an empty block', () => {
    expect(split('---\n---\nBody\n')).toMatchObject({ kind: 'frontmatter', yaml: '' })
  })

  it.each([
    ['plain text', 'Just prose.\n'],
    ['a rule later in the file', 'Prose\n---\nMore\n'],
    ['dashes with trailing text', '--- not frontmatter\n---\n'],
    ['four dashes', '----\ntitle: x\n----\n'],
    ['a lone rule with no newline', '---'],
    ['an empty file', '']
  ])('finds no frontmatter in %s', (_, text) => {
    expect(split(text).kind).toBe('none')
  })

  it('reports a block that is never closed', () => {
    expect(split('---\ntitle: x\nBody\n').kind).toBe('unclosed')
  })

  it('does not treat an indented or padded --- as the closing line', () => {
    expect(split('---\ntitle: x\n --- \nBody\n').kind).toBe('unclosed')
  })

  it('reports bytes that are not UTF-8', () => {
    expect(splitFrontmatter(new Uint8Array([0x2d, 0x2d, 0x2d, 0x0a, 0xe9, 0x0a]))).toEqual({
      kind: 'invalid-encoding'
    })
  })

  describe('on the fixture', () => {
    it('handles a BOM', () => {
      const result = readFixture('manuscript/Part Three/הנהר.md')
      expect(result).toMatchObject({ kind: 'frontmatter', hasBom: true })
      if (result.kind === 'frontmatter') expect(result.yaml).toContain('type: chapter')
    })

    it('handles mixed line endings', () => {
      expect(readFixture('manuscript/Part One/Mixed endings.md')).toMatchObject({
        kind: 'frontmatter',
        yaml: 'type: chapter\npart: "[[Part One]]"\r\norder: 3\nstatus: idea\r\n'
      })
    })

    it.each([
      ['manuscript/Part One/Margins.md', 'none'],
      ['manuscript/Part Two/Empty frontmatter.md', 'frontmatter'],
      ['notes/Unclosed.md', 'unclosed'],
      ['notes/Windows-1255.md', 'invalid-encoding'],
      ['manuscript/Part Two/Broken.md', 'frontmatter']
    ])('classifies %s as %s', (path, kind) => {
      expect(readFixture(path).kind).toBe(kind)
    })

    it('keeps a file without a trailing newline intact', () => {
      const result = readFixture('manuscript/Part Two/Café Ñandú.md')
      expect(result.kind).toBe('frontmatter')
      if (result.kind === 'frontmatter') {
        expect(result.text.slice(result.bodyStart)).toBe(
          'Steam rose from the cups. Nobody mentioned the strike.'
        )
      }
    })
  })
})
