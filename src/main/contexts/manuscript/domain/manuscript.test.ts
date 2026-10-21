import { describe, expect, it } from 'vitest'
import { buildLinkIndex, type LinkCandidate } from '../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { readChapter, type Chapter } from './chapter'
import { arrangeManuscript, type Manuscript } from './manuscript'
import { readPart, type Part } from './part'

const path = (value: string): ProjectPath => value as ProjectPath

function part(file: string, keys: Record<string, unknown>, body = ''): Part {
  return readPart(path(file), { type: 'part', ...keys }, body)
}

function chapter(file: string, keys: Record<string, unknown>, body = ''): Chapter {
  return readChapter(path(file), { type: 'chapter', ...keys }, body)
}

function arrange(parts: Part[], chapters: Chapter[], extra: LinkCandidate[] = []): Manuscript {
  const candidates: LinkCandidate[] = [
    ...parts.map((entry) => ({ path: entry.path, type: 'part' as const })),
    ...chapters.map((entry) => ({ path: entry.path, type: 'chapter' as const })),
    ...extra
  ]
  return arrangeManuscript(parts, chapters, buildLinkIndex(candidates))
}

// The structure of fixtures/sample-novel.
const partOne = part(
  'manuscript/Part One/Part One.md',
  { title: 'Part One: The Orchard', order: 1 },
  'Every tree remembers.'
)
const partTwo = part('manuscript/Part Two/Part Two.md', {
  title: 'Part Two: The Cannery',
  order: 2
})
const partThree = part('manuscript/Part Three/Part Three.md', {
  title: 'Part Three: הנהר',
  order: 3
})
const fixtureChapters = [
  chapter(
    'manuscript/Part One/The Ferry.md',
    { title: 'The Ferry', part: '[[Part One]]', order: 1 },
    'One two three.'
  ),
  chapter('manuscript/Part One/First frost.md', { part: '[[Part One]]', order: 2 }, 'Four five.'),
  chapter('manuscript/Part One/Mixed endings.md', { part: '[[Part One]]', order: 3 }),
  chapter('manuscript/Part Three/Misfiled.md', { part: '[[Part One]]', order: 4 }),
  chapter('manuscript/Part Two/The Cannery.md', { part: '[[Part Two]]', order: 1 }),
  chapter('manuscript/Part Two/Café Ñandú.md', { part: '[[Part Two]]', order: 2 }),
  chapter('manuscript/Part Two/Duplicate order.md', { part: '[[Part Two]]', order: 2 }),
  chapter('manuscript/Part Two/Shapes.md', { part: '[[Part Two]]', order: 3 }),
  chapter('manuscript/Part Three/הנהר.md', { title: 'הַנָּהָר', part: '[[Part Three]]', order: 1 }),
  chapter('manuscript/Part Three/No order.md', { part: '[[Part Three]]' }),
  chapter('manuscript/Part Three/Lost part.md', { part: '[[Part Nine]]', order: 2 })
]

function outline(sections: Manuscript['parts']): string[][] {
  return sections.map((section) => [
    `${String(section.number ?? '-')} ${section.part.title}`,
    ...section.chapters.map((entry) => `${String(entry.number ?? '-')} ${entry.chapter.title}`)
  ])
}

describe('arrangeManuscript on the sample novel', () => {
  const manuscript = arrange([partThree, partOne, partTwo], fixtureChapters)

  it('orders parts and chapters by frontmatter, restarting numbers in each part', () => {
    expect(outline(manuscript.parts)).toEqual([
      ['1 Part One: The Orchard', '1 The Ferry', '2 First frost', '3 Mixed endings', '4 Misfiled'],
      ['2 Part Two: The Cannery', '1 The Cannery', '2 Café Ñandú', '3 Duplicate order', '4 Shapes'],
      ['3 Part Three: הנהר', '1 הַנָּהָר']
    ])
  })

  it('puts a chapter where its part key says, whatever folder it is in', () => {
    expect(manuscript.parts[0]?.chapters[3]?.chapter.path).toBe('manuscript/Part Three/Misfiled.md')
  })

  it('numbers chapters by position, so a shared order still gets distinct numbers, with a warning', () => {
    const partTwoChapters = manuscript.parts[1]?.chapters ?? []
    expect(partTwoChapters.map((entry) => [entry.chapter.title, entry.duplicateOrder])).toEqual([
      ['The Cannery', false],
      ['Café Ñandú', true],
      ['Duplicate order', true],
      ['Shapes', false]
    ])
    expect(manuscript.warnings).toContainEqual(
      expect.objectContaining({ code: 'duplicate-chapter-order' })
    )
  })

  it('sends chapters it cannot place to the unordered tray, with the reason', () => {
    expect(manuscript.unordered.map((entry) => [entry.chapter.title, entry.reason])).toEqual([
      ['Lost part', 'part-not-found'],
      ['No order', 'missing-order']
    ])
  })

  it('counts every part and chapter body, placed or not', () => {
    expect(manuscript.parts[0]?.wordCount).toBe(3 + 3 + 2)
    expect(manuscript.wordCount).toBe(3 + 3 + 2)
  })

  it('has no unnumbered parts or loose chapters', () => {
    expect(manuscript.unnumberedParts).toEqual([])
    expect(manuscript.chapters).toEqual([])
  })
})

describe('arrangeManuscript rules', () => {
  it('puts parts without an order in their own unnumbered section, chapters unnumbered too', () => {
    const interludes = part('Interludes.md', { title: 'Interludes' })
    const manuscript = arrange(
      [partOne, interludes],
      [
        chapter('Lamplighter.md', { part: '[[Interludes]]', order: 2 }),
        chapter('Fog.md', { part: '[[Interludes]]', order: 1 })
      ]
    )
    expect(outline(manuscript.parts)).toEqual([['1 Part One: The Orchard']])
    expect(outline(manuscript.unnumberedParts)).toEqual([
      ['- Interludes', '- Fog', '- Lamplighter']
    ])
    expect(manuscript.warnings).toContainEqual({
      code: 'part-without-order',
      titles: ['Interludes'],
      paths: [interludes.path]
    })
  })

  it('lists chapters directly in a book without parts', () => {
    const manuscript = arrange(
      [],
      [
        chapter('b.md', { title: 'B', order: 2 }),
        chapter('a.md', { title: 'A', order: 1 }),
        chapter('c.md', { title: 'C' })
      ]
    )
    expect(
      manuscript.chapters.map((entry) => `${String(entry.number)} ${entry.chapter.title}`)
    ).toEqual(['1 A', '2 B'])
    expect(manuscript.unordered).toMatchObject([{ reason: 'missing-order' }])
  })

  it('needs a part for every chapter once the book has parts', () => {
    const manuscript = arrange([partOne], [chapter('Stray.md', { order: 1 })])
    expect(manuscript.unordered).toMatchObject([{ reason: 'no-part' }])
  })

  it('rejects a part key that is not a link, or links to something that is not a part', () => {
    const manuscript = arrange(
      [partOne],
      [
        chapter('Plain.md', { part: 'Part One', order: 1 }),
        chapter('Wrong.md', { part: '[[The Ferry]]', order: 1 }),
        chapter('The Ferry.md', { part: '[[Part One]]', order: 1 })
      ]
    )
    expect(manuscript.unordered.map((entry) => [entry.chapter.title, entry.reason])).toEqual([
      ['Plain', 'part-not-a-link'],
      ['Wrong', 'part-not-found']
    ])
  })

  it('accepts an unquoted part link', () => {
    const manuscript = arrange(
      [partOne],
      [chapter('The Ferry.md', { part: [['Part One']], order: 1 })]
    )
    expect(manuscript.parts[0]?.chapters).toHaveLength(1)
  })

  it('uses the expected type when a part shares its name with another file', () => {
    const marrowPart = part('manuscript/Marrow.md', { order: 1 })
    const manuscript = arrange(
      [marrowPart],
      [chapter('The Ferry.md', { part: '[[Marrow]]', order: 1 })],
      [{ path: path('locations/Marrow.md'), type: 'location' }]
    )
    expect(manuscript.parts[0]?.chapters).toHaveLength(1)
  })

  it('sends a chapter to the tray when its part link is ambiguous', () => {
    const manuscript = arrange(
      [part('a/Book.md', { order: 1 }), part('b/Book.md', { order: 2 })],
      [chapter('The Ferry.md', { part: '[[Book]]', order: 1 })]
    )
    expect(manuscript.unordered).toMatchObject([{ reason: 'part-ambiguous' }])
  })

  it('warns about parts that share an order, ordering them by title', () => {
    const manuscript = arrange(
      [part('Two.md', { title: 'Beta', order: 1 }), part('One.md', { title: 'Alpha', order: 1 })],
      []
    )
    expect(manuscript.parts.map((section) => section.part.title)).toEqual(['Alpha', 'Beta'])
    expect(manuscript.warnings).toMatchObject([{ code: 'duplicate-part-order' }])
  })
})

describe('readChapter and readPart', () => {
  it('takes the title from the title key, or the file name', () => {
    expect(chapter('manuscript/The Ferry.md', { title: '  The Dock ' }).title).toBe('The Dock')
    expect(chapter('manuscript/The Ferry.md', {}).title).toBe('The Ferry')
    expect(chapter('manuscript/1984.md', { title: 1984 }).title).toBe('1984')
  })

  it('accepts only whole numbers as an order', () => {
    expect(chapter('a.md', { order: 2 }).order).toBe(2)
    expect(chapter('a.md', { order: -3 }).order).toBe(-3)
    for (const order of [1.5, '2', null, [1]]) {
      expect(chapter('a.md', { order }).order).toBeUndefined()
    }
  })

  it('keeps any status value as written', () => {
    expect(chapter('a.md', { status: 'maybe' }).status).toBe('maybe')
  })

  it('reads a file with no frontmatter keys', () => {
    expect(readChapter(path('Loose.md'), undefined, 'Some words.')).toMatchObject({
      title: 'Loose',
      part: { kind: 'missing' },
      wordCount: 2
    })
  })
})
