import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  composeMarkdownFile,
  dominantLineEnding,
  fromEditorText,
  splitMarkdownFile,
  toEditorText,
  type MarkdownFileParts
} from './markdown-file'

const fixture = join(import.meta.dirname, '../../../../fixtures/sample-novel')
const decoder = new TextDecoder()

const fixtureFiles = readdirSync(fixture, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => relative(fixture, join(entry.parentPath, entry.name)))
  .sort()

function partsOf(path: string): MarkdownFileParts {
  const split = splitMarkdownFile(readFileSync(join(fixture, path)))
  if (split.kind !== 'parts') throw new Error(`${path} has no parts: ${split.kind}`)
  return split.parts
}

describe('splitMarkdownFile and composeMarkdownFile', () => {
  const writable = fixtureFiles.filter(
    (path) => !['notes/Unclosed.md', 'notes/Windows-1255.md'].includes(path)
  )

  it.each(writable)('round-trips %s byte for byte', (path) => {
    const bytes = readFileSync(join(fixture, path))
    const parts = partsOf(path)
    const unchangedBody = fromEditorText(toEditorText(parts.body), parts)
    expect(Buffer.from(composeMarkdownFile({ ...parts, body: unchangedBody })).equals(bytes)).toBe(
      true
    )
  })

  it('refuses files it must never write', () => {
    expect(splitMarkdownFile(readFileSync(join(fixture, 'notes/Unclosed.md'))).kind).toBe(
      'unclosed'
    )
    expect(splitMarkdownFile(readFileSync(join(fixture, 'notes/Windows-1255.md'))).kind).toBe(
      'invalid-encoding'
    )
  })

  it('keeps the head exactly, including comments and CRLF', () => {
    const parts = partsOf('manuscript/Part One/First night.md')
    expect(parts.head.startsWith('---\r\ntype: chapter\r\n')).toBe(true)
    expect(parts.head).toContain('# which part this chapter belongs to')
    expect(parts.head.endsWith('---\r\n')).toBe(true)
  })

  it('treats a file without frontmatter as all body', () => {
    const parts = partsOf('manuscript/Part One/Lanterns.md')
    expect(parts.head).toBe('')
    expect(parts.body.startsWith('Lanterns along the quay')).toBe(true)
  })
})

describe('writing a new body', () => {
  function rewrite(path: string, transform: (text: string) => string): string {
    const parts = partsOf(path)
    const body = fromEditorText(transform(toEditorText(parts.body)), parts)
    return decoder.decode(composeMarkdownFile({ ...parts, body }))
  }

  it('gives a CRLF file CRLF in the new body, and leaves its frontmatter alone', () => {
    const original = readFileSync(join(fixture, 'manuscript/Part One/First night.md'), 'utf8')
    const result = rewrite('manuscript/Part One/First night.md', (text) => `${text}A new line.\n`)
    expect(result.endsWith('songs.\r\nA new line.\r\n')).toBe(true)
    expect(result.replaceAll('\r\n', '')).not.toContain('\n')
    expect(result.slice(0, original.indexOf('Mira'))).toBe(
      original.slice(0, original.indexOf('Mira'))
    )
  })

  it('keeps a BOM', () => {
    const parts = partsOf('manuscript/Part Three/חזרה.md')
    const body = fromEditorText(`${toEditorText(parts.body)}עוד שורה.\n`, parts)
    const bytes = composeMarkdownFile({ ...parts, body })
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('writes exactly what the editor has, so a missing trailing newline stays missing', () => {
    const result = rewrite('manuscript/Part Two/Café Ñandú.md', (text) => `${text} Then rain.`)
    expect(result.endsWith('ledger. Then rain.')).toBe(true)
  })

  it('gives an edited body with mixed endings its most common ending', () => {
    const result = rewrite('manuscript/Part One/Mixed endings.md', (text) => `${text}Edited.\n`)
    const head = partsOf('manuscript/Part One/Mixed endings.md').head
    expect(result.startsWith(head)).toBe(true)
    // The body had one CRLF and one LF; ties go to LF.
    expect(result.slice(head.length)).toBe(
      'This chapter mixes LF and CRLF line endings.\nThe app must keep each one exactly as it is.\nEdited.\n'
    )
  })
})

describe('dominantLineEnding', () => {
  it.each([
    ['a\nb\n', '\n'],
    ['a\r\nb\r\n', '\r\n'],
    ['a\r\nb\r\nc\n', '\r\n'],
    ['a\r\nb\n', '\n'],
    ['no newline', undefined]
  ])('finds the ending of %j', (text, expected) => {
    expect(dominantLineEnding(text)).toBe(expected)
  })
})
