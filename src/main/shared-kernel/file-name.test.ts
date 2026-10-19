import { describe, expect, it } from 'vitest'
import { fileNameFromTitle, parseFileName } from './file-name'

function errorCode(raw: string): string | undefined {
  const result = parseFileName(raw)
  return result.ok ? undefined : result.error.code
}

describe('parseFileName', () => {
  it.each([
    'Arrival.md',
    'Mira Kovač.md',
    'מירה.md',
    'Part One',
    'CONSOLE.md',
    'NULL.md',
    'Com10.md'
  ])('accepts %s', (raw) => {
    expect(parseFileName(raw)).toEqual({ ok: true, value: raw })
  })

  it('normalizes to NFC', () => {
    const result = parseFileName('Kovac\u030C.md')
    expect(result).toEqual({ ok: true, value: 'Kova\u010D.md' })
  })

  it.each(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])(
    'rejects the Windows-forbidden character %s',
    (char) => {
      expect(errorCode(`a${char}b.md`)).toBe('forbidden-character')
    }
  )

  it.each(['\u0000', '\u0009', '\u000A', '\u001F'])('rejects control character %j', (char) => {
    expect(errorCode(`a${char}b.md`)).toBe('forbidden-character')
  })

  it.each(['#', '^', '[', ']'])('rejects %s, which breaks wikilinks', (char) => {
    expect(errorCode(`a${char}b.md`)).toBe('link-breaking-character')
  })

  it.each(['Arrival.', 'Arrival ', 'Arrival.md.', 'Arrival.md '])(
    'rejects a trailing dot or space in %j',
    (raw) => {
      expect(errorCode(raw)).toBe('trailing-dot-or-space')
    }
  )

  it.each([
    'CON',
    'con',
    'PRN.md',
    'aux.txt',
    'NUL.md',
    'nul.tar.gz',
    'COM1',
    'com9.md',
    'LPT1.md',
    'COM¹.md',
    'CON .md'
  ])('rejects the Windows reserved name %s', (raw) => {
    expect(errorCode(raw)).toBe('reserved-name')
  })

  it('rejects an empty name', () => {
    expect(errorCode('')).toBe('empty')
  })

  it.each(['.', '..'])('rejects %j', (raw) => {
    expect(errorCode(raw)).toBe('dot-name')
  })

  it('rejects names longer than 255 UTF-8 bytes', () => {
    expect(errorCode(`${'a'.repeat(253)}.md`)).toBe('too-long')
    expect(parseFileName(`${'a'.repeat(252)}.md`).ok).toBe(true)
    // Each Hebrew letter is two bytes in UTF-8.
    expect(errorCode(`${'א'.repeat(127)}.md`)).toBe('too-long')
    expect(parseFileName(`${'א'.repeat(126)}.md`).ok).toBe(true)
  })
})

describe('fileNameFromTitle', () => {
  it.each([
    ['Arrival', 'Arrival.md'],
    ['Mira: The Return, Part 1', 'Mira - The Return, Part 1.md'],
    ['Before/After', 'Before-After.md'],
    ['Either | Or', 'Either - Or.md'],
    ['What? Why*', 'What Why.md'],
    ['Chapter #3 [draft]', 'Chapter 3 draft.md'],
    ['"Quoted" <title>', 'Quoted title.md'],
    ['  lots   of\tspace  ', 'lots of space.md'],
    ['...hidden', 'hidden.md'],
    ['Ends with dots...', 'Ends with dots.md'],
    ['הגעה לנמל', 'הגעה לנמל.md'],
    ['', 'Untitled.md'],
    ['???', 'Untitled.md'],
    ['CON', 'CON_.md'],
    ['nul', 'nul_.md']
  ])('turns %j into %j', (title, expected) => {
    expect(fileNameFromTitle(title)).toBe(expected)
  })

  it('writes NFC', () => {
    expect(fileNameFromTitle('Kovac\u030C')).toBe('Kova\u010D.md')
  })

  it('cuts long titles to 100 characters', () => {
    expect(fileNameFromTitle('a'.repeat(150))).toBe(`${'a'.repeat(100)}.md`)
    expect(fileNameFromTitle('נ'.repeat(150))).toBe(`${'נ'.repeat(100)}.md`)
  })

  it('cuts further to fit 255 UTF-8 bytes, never splitting a letter from its niqqud', () => {
    const pointedBet = '\u05D1\u05B8' // bet + qamats: one character, two code points, four UTF-8 bytes
    // 63 × 4 bytes + ".md" = 255 bytes.
    expect(fileNameFromTitle(pointedBet.repeat(120))).toBe(`${pointedBet.repeat(63)}.md`)
  })

  it('always produces a name that parseFileName accepts', () => {
    const titles = ['CON', ':::', 'a#b^c[d]e', 'tab\there', 'x'.repeat(400), 'נ'.repeat(400)]
    for (const title of titles) {
      expect(parseFileName(fileNameFromTitle(title)).ok).toBe(true)
    }
  })
})
