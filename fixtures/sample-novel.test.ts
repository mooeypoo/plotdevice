import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the fixture's deliberate quirks. If git, an editor, or a formatter "fixes" a fixture file,
// the round-trip tests built on it would silently stop testing anything.

const root = fileURLToPath(new URL('./sample-novel', import.meta.url))

function bytes(path: string): Buffer {
  return readFileSync(join(root, path))
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full) : [relative(root, full).split(sep).join('/')]
  })
}

const crlfOnly = [
  'outlines/Revision plan.md',
  'manuscript/Part One/First frost.md',
  'manuscript/Part Three/Part Three.md',
  'characters/Aunt Bea.md'
]
const mixedLineEndings = ['manuscript/Part One/Mixed endings.md', 'outlines/Loose plan.md']

describe('fixtures/sample-novel', () => {
  it('contains exactly the expected files', () => {
    expect(listFiles(root).map((path) => path.normalize('NFC')).sort()).toEqual(
      [
        '.obsidian/app.json',
        'Loose thoughts.md',
        'Working plan.md',
        'outlines/Loose plan.md',
        'outlines/Not a board.md',
        'outlines/Revision plan.md',
        'outlines/תוכנית.md',
        'characters/Marrow.md',
        'characters/Ilka Szabó.md',
        'characters/Aunt Bea.md',
        'characters/Noël.md',
        'characters/יעל.md',
        'locations/Marrow.md',
        'manuscript/Part One/The Ferry.md',
        'manuscript/Part One/First frost.md',
        'manuscript/Part One/Margins.md',
        'manuscript/Part One/Mixed endings.md',
        'manuscript/Part One/Part One.md',
        'manuscript/Part Three/Lost part.md',
        'manuscript/Part Three/Misfiled.md',
        'manuscript/Part Three/No order.md',
        'manuscript/Part Three/Part Three.md',
        'manuscript/Part Three/הנהר.md',
        'manuscript/Part Two/Broken.md',
        'manuscript/Part Two/Café Ñandú.md',
        'manuscript/Part Two/Duplicate order.md',
        'manuscript/Part Two/Empty frontmatter.md',
        'manuscript/Part Two/Part Two.md',
        'manuscript/Part Two/Shapes.md',
        'manuscript/Part Two/The Cannery.md',
        'notes/Chapter #3 [draft].md',
        'notes/Research.md',
        'notes/Scene idea.md',
        'notes/Unclosed.md',
        'notes/Unknown type.md',
        'notes/Windows-1255.md',
        'novel.md'
      ]
        .map((path) => path.normalize('NFC'))
        .sort()
    )
  })

  it.each(crlfOnly)('%s uses CRLF on every line', (path) => {
    const text = bytes(path).toString('utf8')
    expect(text).toContain('\r\n')
    expect(text.replaceAll('\r\n', '')).not.toContain('\n')
  })

  it.each(mixedLineEndings)('%s mixes CRLF and bare LF', (path) => {
    const text = bytes(path).toString('utf8')
    expect(text).toContain('\r\n')
    expect(text.replaceAll('\r\n', '')).toContain('\n')
  })

  it('uses LF only in every other text file', () => {
    const lfFiles = listFiles(root).filter(
      (path) => !crlfOnly.includes(path) && !mixedLineEndings.includes(path)
    )
    for (const path of lfFiles) {
      expect(bytes(path).includes('\r'), path).toBe(false)
    }
  })

  it('keeps a file without a trailing newline', () => {
    const text = bytes('manuscript/Part Two/Café Ñandú.md').toString('utf8')
    expect(text.endsWith('strike.')).toBe(true)
    expect(bytes('outlines/Loose plan.md').toString('utf8').endsWith('the gate')).toBe(true)
  })

  it.each(['manuscript/Part Three/הנהר.md', 'outlines/Revision plan.md'])(
    'keeps a UTF-8 byte-order mark in %s',
    (path) => {
      expect([...bytes(path).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    }
  )

  it('keeps a file that is not valid UTF-8', () => {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    expect(() => decoder.decode(bytes('notes/Windows-1255.md'))).toThrow()
  })

  it('keeps a decomposed (NFD) file name', () => {
    expect(readdirSync(join(root, 'characters'))).toContain('Noe\u0308l.md')
  })

  it('keeps Hebrew niqqud in the prose', () => {
    // בְּרֵאשִׁית in NFC order: sheva before dagesh, hiriq before shin dot.
    expect(bytes('manuscript/Part Three/הנהר.md').toString('utf8')).toContain(
      'בְּרֵאשִׁית'
    )
  })
})
