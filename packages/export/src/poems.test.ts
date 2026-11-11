import { readChapterForExport, splitFrontmatter } from '@plotdevice/markdown'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import poemEn from '../../../tests/fixtures/chapters/poem-en.md?raw'
import poemHe from '../../../tests/fixtures/chapters/poem-he.md?raw'
import { writeDocx } from './docx'
import { writeEpub } from './epub'
import type { ExportedBook } from './exported-book'
import { printHtml } from './print-html'

// Poems in every format (ADR 0013): lines kept, stanzas spaced, no indent; an untitled poem has no heading.
const blocks = (file: string) => readChapterForExport(splitFrontmatter(file).body)

const hebrew: ExportedBook = {
  title: 'שעות מלח',
  author: null,
  language: 'he',
  direction: 'rtl',
  id: 'salt-hours',
  made: '2026-11-10T12:00:00.000Z',
  entries: [
    { kind: 'part', name: 'אסופה ראשונה' },
    { kind: 'chapter', label: null, name: 'עֶרֶב בַּפַּרְדֵּס', poem: true, blocks: blocks(poemHe) },
  ],
}

const english: ExportedBook = {
  title: 'Salt Hours',
  author: null,
  language: 'en',
  direction: 'ltr',
  id: 'salt-hours',
  made: '2026-11-10T12:00:00.000Z',
  entries: [
    { kind: 'chapter', label: null, name: 'The evening settles on the orchard', poem: true, untitled: true, blocks: blocks(poemEn) },
    { kind: 'chapter', label: null, name: 'The Crossing', blocks: readChapterForExport('The ferry left.\\\nIt rained.\n') },
  ],
}

describe('a poem in the e-book', () => {
  const read = (book: ExportedBook, name: string) => {
    const file = unzipSync(writeEpub(book, { contents: 'Contents' }))[name]
    if (!file) throw new Error(`no ${name}`)
    return strFromU8(file)
  }

  it('keeps each line, in stanzas, with niqqud as written', () => {
    const page = read(hebrew, 'OEBPS/chapter-1.xhtml')
    expect(page).toContain('<h1>עֶרֶב בַּפַּרְדֵּס</h1>')
    expect(page).toContain(
      '<p class="stanza"><span class="line">הָעֶרֶב יוֹרֵד עַל הַפַּרְדֵּס</span><span class="line">וְהַמֶּלַח נָח עַל הֶעָלִים</span><span class="line">אֲנִי סוֹפֶרֶת אֶת הָעֵצִים</span></p>',
    )
    expect(page.match(/class="stanza"/g)).toHaveLength(2)
    expect(read(hebrew, 'OEBPS/styles.css')).toMatch(/\.stanza \{ text-indent: 0;.*hyphens: none/)
  })

  it('has no heading when untitled, and is listed by its first line in italics', () => {
    const page = read(english, 'OEBPS/chapter-1.xhtml')
    expect(page).not.toContain('<h1>')
    expect(page).toContain('<span class="line">The wind says <em>nothing</em></span>')
    expect(read(english, 'OEBPS/nav.xhtml')).toContain('<a href="chapter-1.xhtml"><em>The evening settles on the orchard</em></a>')
  })

  it('leaves prose as it was', () => {
    expect(read(english, 'OEBPS/chapter-2.xhtml')).toContain('<h1>The Crossing</h1>\n<p>The ferry left.<br/>It rained.</p>')
  })
})

describe('a poem in the PDF', () => {
  const print = (book: ExportedBook) =>
    printHtml(book, {
      titlePage: false,
      wordCount: null,
      doubleSpaced: false,
      paper: 'a4',
      by: 'by',
      fonts: [],
      families: ['Literata', 'Noto Serif Hebrew'],
    })

  it('lays stanzas out as verse, and an untitled poem without a heading', () => {
    const html = print(english)
    expect(html).toContain(
      '<section class="chapter untitled">\n<p class="stanza"><span class="line">The evening settles on the orchard</span>',
    )
    expect(html).toMatch(/\.stanza \.line \{ display: block; padding-inline-start: 0\.5in; text-indent: -0\.5in; \}/)
    expect(print(hebrew)).toContain('<h1>עֶרֶב בַּפַּרְדֵּס</h1>\n<p class="stanza"><span class="line">הָעֶרֶב')
  })
})

describe('a poem in Word', () => {
  const documentOf = async (book: ExportedBook) => {
    const bytes = await writeDocx(book, { titlePage: false, wordCount: null, doubleSpaced: false, paper: 'a4', by: 'by', hebrewFont: null })
    const file = unzipSync(bytes)['word/document.xml']
    return file ? strFromU8(file) : ''
  }
  const paragraphs = (xml: string) => [...xml.matchAll(/<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g)].map((m) => m[1] ?? '')
  const words = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join('')

  it('gives each line its own paragraph, hanging, and keeps a stanza together', async () => {
    const lines = paragraphs(await documentOf(hebrew)).filter((p) => words(p) !== '')
    const first = lines.findIndex((p) => words(p) === 'הָעֶרֶב יוֹרֵד עַל הַפַּרְדֵּס')
    expect(lines.slice(first, first + 3).map(words)).toEqual([
      'הָעֶרֶב יוֹרֵד עַל הַפַּרְדֵּס',
      'וְהַמֶּלַח נָח עַל הֶעָלִים',
      'אֲנִי סוֹפֶרֶת אֶת הָעֵצִים',
    ])
    const [line1, , line3] = lines.slice(first, first + 3)
    expect(line1).toMatch(/<w:keepNext\/>/)
    expect(line1).toMatch(/<w:ind w:start="720" w:hanging="720"\/>/)
    expect(line1).not.toMatch(/w:firstLine/)
    expect(line3).not.toMatch(/<w:keepNext\/>/)
    expect(line3).toMatch(/<w:spacing w:after="360"\/>/)
  })

  it('starts an untitled poem on a new page with no heading', async () => {
    const xml = await documentOf(english)
    expect(xml).not.toMatch(/Heading1[\s\S]*The evening settles/)
    expect(paragraphs(xml).find((p) => /pageBreakBefore/.test(p) && words(p) === '')).toBeDefined()
  })
})
