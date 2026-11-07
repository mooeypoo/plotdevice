import { readChapterForExport } from '@plotdevice/markdown'
import { describe, expect, it } from 'vitest'
import type { ExportedBook } from './exported-book'
import { printHtml, type PrintOptions } from './print-html'

const book = (changes: Partial<ExportedBook> = {}): ExportedBook => ({
  title: 'The Salt Orchard',
  author: 'Ines Varga',
  language: 'en',
  direction: 'ltr',
  id: 'salt',
  made: '2026-11-07T12:30:00.000Z',
  entries: [
    { kind: 'part', name: 'Part One' },
    {
      kind: 'chapter',
      label: 'Chapter 1',
      name: 'The Crossing',
      blocks: readChapterForExport('The ferry left.\n\n* * *\n\nAt the orchard.\n'),
    },
  ],
  ...changes,
})

const options = (changes: Partial<PrintOptions> = {}): PrintOptions => ({
  titlePage: true,
  wordCount: 'about 84,000 words',
  doubleSpaced: true,
  paper: 'a4',
  by: 'by',
  fonts: [{ family: 'Literata', url: 'file:///app/fonts/literata.woff2', style: 'normal' }],
  families: ['Literata', 'Noto Serif Hebrew'],
  ...changes,
})

describe('the page the PDF is printed from', () => {
  it('runs no scripts and loads nothing but fonts', () => {
    const html = printHtml(book(), options())
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src file: data:">`,
    )
    expect(html).not.toContain('<script')
  })

  it('escapes the author’s words everywhere, including the running head drawn by CSS', () => {
    const html = printHtml(book({ title: 'Salt </style><script>x</script> "quoted"', author: 'Ines \\ Varga' }), options())
    expect(html).not.toContain('</style><script>')
    expect(html).toContain('<h1 class="book-title">Salt &lt;/style&gt;&lt;script&gt;x&lt;/script&gt; &quot;quoted&quot;</h1>')
    // In CSS: backslashes and quotes escaped, and `<` written as an escape so the style element can't end early.
    expect(html).toContain('content: "Varga / SALT \\3C /STYLE>\\3C SCRIPT>X\\3C /SCRIPT> \\"QUOTED\\" / " counter(page)')
  })

  it('has a title page without a running head, not counted as a page, then parts and chapters each on a new page', () => {
    const html = printHtml(book(), options())
    expect(html).toContain('<div class="title-top"><span>Ines Varga</span><span>about 84,000 words</span></div>')
    expect(html).toContain('<p class="byline">by Ines Varga</p>')
    expect(html).toContain('@page title { counter-increment: page 0; @top-right { content: none; } }')
    expect(html).toContain('<section class="part"><h1>Part One</h1></section>')
    expect(html).toContain('<h1><span class="label">Chapter 1</span>The Crossing</h1>')
    expect(html).toContain('<p class="scene-break" role="separator">* * *</p>')
  })

  it('leaves out the title page or the word count when the author chooses', () => {
    expect(printHtml(book(), options({ titlePage: false }))).not.toContain('class="title-page"')
    expect(printHtml(book(), options({ wordCount: null }))).toContain('<span>Ines Varga</span><span></span>')
  })

  it('puts the running head on the left, and the whole page right to left, for a Hebrew book', () => {
    const html = printHtml(book({ title: 'פרדס המלח', author: 'אינס ורגה', language: 'he', direction: 'rtl' }), options({ by: 'מאת' }))
    expect(html).toContain('<html lang="he" dir="rtl">')
    expect(html).toContain('@top-left { content: "ורגה / פרדס המלח / " counter(page)')
    expect(html).toContain('<p class="byline">מאת אינס ורגה</p>')
  })

  it('uses the chosen paper and spacing, and the app’s fonts', () => {
    expect(printHtml(book(), options())).toContain('size: A4;')
    expect(printHtml(book(), options({ paper: 'letter' }))).toContain('size: letter;')
    expect(printHtml(book(), options())).toContain('line-height: 2;')
    expect(printHtml(book(), options({ doubleSpaced: false }))).toContain('line-height: 1.5;')
    expect(printHtml(book(), options())).toContain(
      '@font-face { font-family: "Literata"; src: url("file:///app/fonts/literata.woff2") format("woff2"); font-weight: 100 900; font-style: normal; }',
    )
    expect(printHtml(book(), options())).toContain('font-family: "Literata", "Noto Serif Hebrew", serif;')
  })

  it('leaves the running head without a surname when the book has no author', () => {
    expect(printHtml(book({ author: null }), options())).toContain('content: "THE SALT ORCHARD / " counter(page)')
  })
})
