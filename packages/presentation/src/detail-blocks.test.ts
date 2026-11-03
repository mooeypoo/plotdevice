import { describe, expect, it } from 'vitest'
import { detailBlocks, detailSections, sectionItems } from './detail-blocks'

describe('a page’s details, as blocks to show', () => {
  it('reads headings and the paragraphs under them (the demo’s Bea Halmi)', () => {
    const details =
      '## Habits\nCounts the trees aloud. Never sits with her back to the river.\n\n## Secret\nShe kept the ledger after the funeral. See [Ilka](ilka.md).\n'
    expect(detailBlocks(details)).toEqual([
      { kind: 'heading', level: 2, text: 'Habits' },
      { kind: 'paragraph', text: 'Counts the trees aloud. Never sits with her back to the river.' },
      { kind: 'heading', level: 2, text: 'Secret' },
      { kind: 'paragraph', text: 'She kept the ledger after the funeral. See [Ilka](ilka.md).' },
    ])
  })

  it('joins a paragraph’s lines, and keeps lists, nesting and numbering', () => {
    expect(detailBlocks('First line\nsecond line\n\n- one\n  - under one\n- two\n\n1. first\n2. second')).toEqual([
      { kind: 'paragraph', text: 'First line second line' },
      {
        kind: 'list',
        ordered: false,
        items: [
          { text: 'one', depth: 0 },
          { text: 'under one', depth: 1 },
          { text: 'two', depth: 0 },
        ],
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          { text: 'first', depth: 0 },
          { text: 'second', depth: 0 },
        ],
      },
    ])
  })

  it('keeps quotes and code apart, and code exactly as written', () => {
    expect(detailBlocks('> She said\n> it twice\n\n```\nNaCl 4 g/L\n  indented\n```\nAfter')).toEqual([
      { kind: 'quote', text: 'She said it twice' },
      { kind: 'code', text: 'NaCl 4 g/L\n  indented' },
      { kind: 'paragraph', text: 'After' },
    ])
  })

  it('reads Hebrew and Windows line endings the same way', () => {
    expect(detailBlocks('## הרגלים\r\nסופרת את העצים בקול.\r\n')).toEqual([
      { kind: 'heading', level: 2, text: 'הרגלים' },
      { kind: 'paragraph', text: 'סופרת את העצים בקול.' },
    ])
  })

  it('shows nothing for empty details', () => {
    expect(detailBlocks('\n  \n')).toEqual([])
  })
})

describe('a page’s details, in parts to open one at a time', () => {
  it('splits at the top headings, keeping deeper headings and lists inside their part', () => {
    const details =
      'Grew up by the river.\n\n## Relationships\n- Aunt of [Ilka](ilka.md)\n\n### Old friends\n- Noel\n\n## Secret\nShe kept the ledger.'
    expect(detailSections(details)).toEqual([
      { heading: null, blocks: [{ kind: 'paragraph', text: 'Grew up by the river.' }] },
      {
        heading: 'Relationships',
        blocks: [
          { kind: 'list', ordered: false, items: [{ text: 'Aunt of [Ilka](ilka.md)', depth: 0 }] },
          { kind: 'heading', level: 3, text: 'Old friends' },
          { kind: 'list', ordered: false, items: [{ text: 'Noel', depth: 0 }] },
        ],
      },
      { heading: 'Secret', blocks: [{ kind: 'paragraph', text: 'She kept the ledger.' }] },
    ])
  })

  it('splits at whatever level the page’s headings start, in Hebrew too', () => {
    expect(detailSections('### הרגלים\nסופרת את העצים 🌳\n### סוד\nשמרה את הספר').map((section) => section.heading)).toEqual([
      'הרגלים',
      'סוד',
    ])
  })

  it('keeps details without headings as one unnamed part, and empty details as none', () => {
    expect(detailSections('- one\n- two')).toEqual([
      {
        heading: null,
        blocks: [
          {
            kind: 'list',
            ordered: false,
            items: [
              { text: 'one', depth: 0 },
              { text: 'two', depth: 0 },
            ],
          },
        ],
      },
    ])
    expect(detailSections('')).toEqual([])
  })
})

describe('how many items a part holds', () => {
  it('counts top-level list items only, and nothing for prose', () => {
    const [relationships, habits] = detailSections(
      '## Relationships\n- Aunt of Ilka\n  - since the funeral\n- Waits at the landing\n\n## Habits\nCounts the trees.',
    )
    expect(relationships && sectionItems(relationships)).toBe(2)
    expect(habits && sectionItems(habits)).toBe(0)
  })
})
