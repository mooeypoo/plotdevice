import { describe, expect, it } from 'vitest'
import { plainTextOf, readChapterForExport, type ExportBlock } from './exported-chapter'

const text = (value: string) => ({ type: 'text', value })
const para = (...children: unknown[]) => ({ type: 'paragraph', children })

describe('reading a chapter for export', () => {
  it('keeps paragraphs, italic, bold, links and line breaks; a single newline is a space', () => {
    const blocks = readChapterForExport(
      'The ferry left *before* dawn,\nand **Ines** was not on it.\n\nSee [the map](https://example.org/map).\\\nThen home.\n',
    )
    expect(blocks).toEqual([
      para(
        text('The ferry left '),
        { type: 'emphasis', children: [text('before')] },
        text(' dawn, and '),
        { type: 'strong', children: [text('Ines')] },
        text(' was not on it.'),
      ),
      para(
        text('See '),
        { type: 'link', url: 'https://example.org/map', children: [text('the map')] },
        text('.'),
        { type: 'break' },
        text('Then home.'),
      ),
    ])
  })

  it('keeps Hebrew as written, niqqud and punctuation included', () => {
    expect(readChapterForExport('„תהיה עוד אחת בצהריים,” אמר הסַּבָּל.\n')).toEqual([para(text('„תהיה עוד אחת בצהריים,” אמר הסַּבָּל.'))])
  })

  it('keeps headings with their level, and scene breaks', () => {
    expect(readChapterForExport('## בפרדס\n\nהמלח הגיע.\n\n* * *\n\nAt the orchard.\n')).toEqual([
      { type: 'heading', level: 2, children: [text('בפרדס')] },
      para(text('המלח הגיע.')),
      { type: 'scene-break' },
      para(text('At the orchard.')),
    ])
  })

  it('keeps quotes and lists, including where a numbered list starts', () => {
    expect(readChapterForExport('> The sea\n> remembers.\n\n- salt\n- frost\n\n3. third\n4. fourth\n')).toEqual([
      { type: 'quote', children: [para(text('The sea remembers.'))] },
      { type: 'list', ordered: false, start: 1, items: [[para(text('salt'))], [para(text('frost'))]] },
      { type: 'list', ordered: true, start: 3, items: [[para(text('third'))], [para(text('fourth'))]] },
    ])
  })

  it('reads CRLF line endings the same as LF', () => {
    expect(readChapterForExport('One\r\ntwo.\r\n\r\n* * *\r\n')).toEqual(readChapterForExport('One\ntwo.\n\n* * *\n'))
  })
})

describe('direction marks (Pandoc’s notation, as the editor writes it)', () => {
  it('gives a marked paragraph its direction, and leaves the others unmarked', () => {
    expect(readChapterForExport('אינס קראה את המכתב.\n\n::: {dir=ltr}\nThe letter was sent.\n:::\n\nהיא שתקה.\n')).toEqual([
      para(text('אינס קראה את המכתב.')),
      { type: 'paragraph', direction: 'ltr', children: [text('The letter was sent.')] },
      para(text('היא שתקה.')),
    ])
  })

  it('marks every block inside the marked lines, with blank lines between them', () => {
    const blocks = readChapterForExport('::: {dir=rtl}\n\nשורה ראשונה.\n\n- רשימה\n\n:::\n\nAfter.\n')
    expect(blocks.map((block) => ('direction' in block ? block.direction : undefined))).toEqual(['rtl', 'rtl', undefined])
  })

  it('keeps a marked phrase as a span inside its paragraph, formatting and links included', () => {
    expect(readChapterForExport('נואל ענה: [*It was* [never](https://x.org)]{dir=ltr} ושתק.\n')).toEqual([
      para(
        text('נואל ענה: '),
        {
          type: 'span',
          direction: 'ltr',
          children: [
            { type: 'emphasis', children: [text('It was')] },
            text(' '),
            { type: 'link', url: 'https://x.org', children: [text('never')] },
          ],
        },
        text(' ושתק.'),
      ),
    ])
  })

  it('gives a list item or quote marked as a whole its direction', () => {
    expect(readChapterForExport('- [The letter was sent.]{dir=ltr}\n')).toEqual([
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [[{ type: 'paragraph', direction: 'ltr', children: [text('The letter was sent.')] }]],
      },
    ])
  })

  it('leaves unfinished marks as the text they are', () => {
    expect(readChapterForExport('::: {dir=ltr}\nNo closing line.\n')).toEqual([para(text('::: {dir=ltr} No closing line.'))])
    expect(readChapterForExport('[half]{dir=ltr and more\n')).toEqual([para(text('[half]{dir=ltr and more'))])
  })

  it('keeps every word of a mark that crosses formatting, showing the mark as typed', () => {
    expect(readChapterForExport('*[a* b 🌊]{dir=ltr}\n')).toEqual([
      para({ type: 'emphasis', children: [text('[a')] }, text(' b 🌊]{dir=ltr}')),
    ])
  })
})

describe('what export doesn’t format', () => {
  it('keeps code, tables and HTML as plain text, never as markup', () => {
    const blocks = readChapterForExport(
      '```\nline one\nline two\n```\n\n<b>bold?</b>\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nText with <i>tag</i> and `code`.\n',
    )
    expect(blocks).toEqual([
      para(text('line one'), { type: 'break' }, text('line two')),
      para(text('<b>bold?</b>')),
      para(text('| a | b |'), { type: 'break' }, text('|---|---|'), { type: 'break' }, text('| 1 | 2 |')),
      para(text('Text with <i>tag</i> and code.')),
    ])
  })

  it('keeps a picture’s description as text, and struck-through text as plain text', () => {
    expect(readChapterForExport('A ![map of the island](map.png) and ~~old~~ new.\n')).toEqual([
      para(text('A map of the island and old new.')),
    ])
  })
})

describe('the plain text of a chapter, for counting words', () => {
  it('joins the text of every block, without formatting marks', () => {
    const blocks: ExportBlock[] = readChapterForExport('*The* ferry.\n\n* * *\n\n- [the letter]{dir=ltr}\n- כפור\n')
    expect(plainTextOf(blocks)).toBe('The ferry.\nthe letter\nכפור')
  })
})
