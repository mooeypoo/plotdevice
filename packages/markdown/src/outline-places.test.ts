import { describe, expect, it } from 'vitest'
import { itemAt, itemStart, keptPassages } from './outline-places'
import { readOutline } from './read-outline'

const TEXT = [
  '# The Salt Orchard',
  '',
  '## Beginning',
  '',
  'Where it starts.',
  '',
  '- Ilka inherits the orchard',
  '  - The will names Marrow',
  '  - Aunt Bea refuses to sign',
  '- The first frost',
  '',
  '## Ending',
  '',
  '- The orchard is sold',
].join('\n')

const at = (text: string, find: string): number => text.indexOf(find)

describe('places in an outline’s text (Milestone 14)', () => {
  it('finds the card or detail the cursor is on, the deepest one', () => {
    const outline = readOutline(TEXT)
    expect(itemAt(outline, at(TEXT, 'Ilka'))).toEqual({ section: 0, path: [0] })
    expect(itemAt(outline, at(TEXT, 'Bea'))).toEqual({ section: 0, path: [0, 1] })
    // On the bullet itself, before the text.
    expect(itemAt(outline, at(TEXT, '- The first'))).toEqual({ section: 0, path: [1] })
    // The very end of a file with no final line ending is still on its last card.
    expect(itemAt(outline, TEXT.length)).toEqual({ section: 1, path: [0] })
  })

  it('finds no card on a heading, a section’s intro or a blank line', () => {
    const outline = readOutline(TEXT)
    expect(itemAt(outline, at(TEXT, '## Beginning'))).toBeNull()
    expect(itemAt(outline, at(TEXT, 'Where it starts'))).toBeNull()
    expect(itemAt(outline, at(TEXT, '\n\n## Ending') + 1)).toBeNull()
  })

  it('goes from a card to its line and back', () => {
    const outline = readOutline(TEXT)
    const start = itemStart(outline, { section: 0, path: [0, 1] })
    expect(start).toBe(at(TEXT, 'Aunt Bea'))
    expect(itemAt(outline, start ?? -1)).toEqual({ section: 0, path: [0, 1] })
    expect(itemStart(outline, { section: 0, path: [0, 5] })).toBeNull()
    expect(itemStart(outline, { section: 9, path: [0] })).toBeNull()
  })

  it('works the same in Hebrew, with CRLF line endings and with cards before the first section', () => {
    const text = ['- לפני הכול', '', '## התחלה', '', '- אילקה יורשת את הפרדס 🌳', '  - הצוואה', ''].join('\r\n')
    const outline = readOutline(text)
    expect(itemAt(outline, at(text, 'לפני'))).toEqual({ section: 0, path: [0] })
    expect(itemAt(outline, at(text, 'הצוואה'))).toEqual({ section: 1, path: [0, 0] })
    expect(itemStart(outline, { section: 1, path: [0] })).toBe(at(text, 'אילקה'))
  })

  it('lists what the board keeps as written, in order, but not ### group labels', () => {
    const text = [
      'A note before any section.',
      '',
      '## Beginning',
      '',
      '- A card',
      '',
      '  More about the card.',
      '',
      '### Later',
      '',
      '- Another card',
      '',
      'A paragraph after the cards.',
      '',
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
      '',
    ].join('\n')
    const kept = keptPassages(readOutline(text)).map((range) => text.slice(range.start, range.end))
    expect(kept).toEqual([
      'A note before any section.',
      'More about the card.',
      'A paragraph after the cards.',
      '| a | b |\n| - | - |\n| 1 | 2 |',
    ])
  })

  it('finds nothing kept in an outline of headings and bullets', () => {
    expect(keptPassages(readOutline(TEXT))).toEqual([])
  })
})
