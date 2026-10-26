import { describe, expect, it } from 'vitest'
import { detailBlocks } from './detail-blocks'

describe('a page’s details, as blocks to show', () => {
  it('reads headings and the paragraphs under them (the demo’s Bea Halmi)', () => {
    const details =
      '## Habits\nCounts the trees aloud. Never sits with her back to the river.\n\n## Secret\nShe kept the ledger after the funeral. See [Ilka](ilka.md).\n'
    expect(detailBlocks(details)).toEqual([
      { kind: 'heading', text: 'Habits' },
      { kind: 'paragraph', text: 'Counts the trees aloud. Never sits with her back to the river.' },
      { kind: 'heading', text: 'Secret' },
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
      { kind: 'heading', text: 'הרגלים' },
      { kind: 'paragraph', text: 'סופרת את העצים בקול.' },
    ])
  })

  it('shows nothing for empty details', () => {
    expect(detailBlocks('\n  \n')).toEqual([])
  })
})
