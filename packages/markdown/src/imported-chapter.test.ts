import { describe, expect, it } from 'vitest'
import { readChapterForExport } from './exported-chapter'
import { importedChapterMarkdown, type ImportedBlock, type ImportedInline } from './imported-chapter'

const text = (value: string): ImportedInline => ({ type: 'text', value })
const para = (...inlines: ImportedInline[]): ImportedBlock => ({ kind: 'paragraph', inlines })

describe('an imported chapter as Markdown', () => {
  it('writes paragraphs with italic, bold, links and line breaks, in Plot Device’s own style', () => {
    expect(
      importedChapterMarkdown(
        [
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
        ],
        {},
      ),
    ).toBe('The ferry left *before* dawn, and **Ines** was not on it.\n\nSee [the map](https://example.org/map).\\\nThen home.\n')
  })

  it('keeps Hebrew as written, niqqud and quotation marks included', () => {
    expect(importedChapterMarkdown([para(text('„תהיה עוד אחת בצהריים,” אמר הסַּבָּל.'))], {})).toBe(
      '„תהיה עוד אחת בצהריים,” אמר הסַּבָּל.\n',
    )
  })

  it('writes scene breaks, headings inside the chapter, quotes and lists', () => {
    expect(
      importedChapterMarkdown(
        [
          { kind: 'heading', level: 3, inlines: [text('בפרדס')] },
          para(text('One.')),
          { kind: 'scene-break' },
          { kind: 'quote', inlines: [text('The sea')] },
          { kind: 'quote', inlines: [text('remembers.')] },
          { kind: 'list-item', ordered: true, depth: 0, inlines: [text('first')] },
          { kind: 'list-item', ordered: true, depth: 0, inlines: [text('second')] },
          { kind: 'list-item', ordered: false, depth: 1, inlines: [text('nested')] },
          { kind: 'list-item', ordered: true, depth: 0, inlines: [text('third')] },
          para(text('After.')),
        ],
        {},
      ),
    ).toBe('### בפרדס\n\nOne.\n\n* * *\n\n> The sea\n>\n> remembers.\n\n1. first\n2. second\n   - nested\n3. third\n\nAfter.\n')
  })

  it('never lets the author’s text become formatting', () => {
    expect(importedChapterMarkdown([para(text('# not a heading, *not italic*, <b>not bold</b>, 1. not a list'))], {})).toBe(
      '\\# not a heading, \\*not italic\\*, \\<b>not bold\\</b>, 1. not a list\n',
    )
    expect(importedChapterMarkdown([para(text('1. not a list'))], {})).toBe('1\\. not a list\n')
  })

  it('keeps only web and email links as links', () => {
    expect(
      importedChapterMarkdown(
        [
          para({ type: 'link', url: 'javascript:alert(1)', children: [text('bad')] }, text(' and '), {
            type: 'link',
            url: 'mailto:i@example.org',
            children: [text('mail')],
          }),
        ],
        {},
      ),
    ).toBe('bad and [mail](mailto:i@example.org)\n')
  })

  it('numbers footnotes from 1 in each chapter, in the order they appear, with the notes at the end', () => {
    const footnotes = {
      'footnote-7': [text('Second note.')],
      'footnote-3': [text('First '), { type: 'emphasis' as const, children: [text('note')] }, text('.')],
    }
    expect(
      importedChapterMarkdown(
        [
          para(text('A'), { type: 'footnote', id: 'footnote-3' }, text(' and b.'), { type: 'footnote', id: 'footnote-7' }),
          para(text('Again.'), { type: 'footnote', id: 'footnote-3' }),
          para(text('Gone.'), { type: 'footnote', id: 'footnote-99' }),
        ],
        footnotes,
      ),
    ).toBe('A[^1] and b.[^2]\n\nAgain.[^1]\n\nGone.\n\n[^1]: First *note*.\n[^2]: Second note.\n')
  })

  it('marks the direction of a paragraph only when the reader set one, as the editor writes it', () => {
    expect(
      importedChapterMarkdown(
        [
          para(text('אינס קראה.')),
          { kind: 'paragraph', direction: 'ltr', inlines: [text('The letter was sent.')] },
          { kind: 'list-item', ordered: false, depth: 0, direction: 'ltr', inlines: [text('In English')] },
          { kind: 'quote', direction: 'ltr', inlines: [text('Quoted')] },
        ],
        {},
      ),
    ).toBe('אינס קראה.\n\n::: {dir=ltr}\nThe letter was sent.\n:::\n\n- [In English]{dir=ltr}\n\n> [Quoted]{dir=ltr}\n')
  })

  it('reads back as the same text and formatting through export’s table', () => {
    const markdown = importedChapterMarkdown(
      [
        para(text('The ferry '), { type: 'emphasis', children: [text('left')] }, text('.')),
        { kind: 'scene-break' },
        { kind: 'paragraph', direction: 'ltr', inlines: [text('Letter.')] },
      ],
      {},
    )
    expect(readChapterForExport(markdown)).toEqual([
      { type: 'paragraph', children: [text('The ferry '), { type: 'emphasis', children: [text('left')] }, text('.')] },
      { type: 'scene-break' },
      { type: 'paragraph', direction: 'ltr', children: [text('Letter.')] },
    ])
  })

  it('is empty for a chapter with no text', () => {
    expect(importedChapterMarkdown([], {})).toBe('')
  })
})
