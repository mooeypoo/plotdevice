import { readChapterForExport } from '@plotdevice/markdown'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { writeDocx, type ManuscriptOptions } from './docx'
import type { ExportedBook } from './exported-book'

const hebrew: ExportedBook = {
  title: 'פרדס המלח',
  author: 'אינס ורגה',
  language: 'he',
  direction: 'rtl',
  id: 'salt',
  made: '2026-11-07T12:30:00.000Z',
  entries: [
    {
      kind: 'chapter',
      label: 'פרק 1',
      name: 'המעבר',
      blocks: readChapterForExport('המעבורת יצאה, *ו*אינס said: no.\n\n* * *\n\n::: {dir=ltr}\nThe letter <was> sent.\n:::\n').map(
        (block) => (block.type === 'scene-break' || block.direction ? block : { ...block, direction: 'rtl' as const }),
      ),
    },
    { kind: 'part', name: 'חלק שני' },
  ],
}

const english: ExportedBook = {
  title: 'The Salt Orchard',
  author: 'Ines Varga',
  language: 'en',
  direction: 'ltr',
  id: 'salt',
  made: '2026-11-07T12:30:00.000Z',
  entries: [
    {
      kind: 'chapter',
      label: null,
      name: 'The Crossing',
      blocks: readChapterForExport(
        '## Inside\n\n> Quoted.\n\n3. three\n4. four\n   - nested\n\n[site](https://x.org) and [Ilka](../world/ilka.md) and [bad](javascript:alert(1)).\n',
      ),
    },
  ],
}

const options = (changes: Partial<ManuscriptOptions> = {}): ManuscriptOptions => ({
  titlePage: true,
  wordCount: 'about 84,000 words',
  doubleSpaced: true,
  paper: 'a4',
  by: 'by',
  hebrewFont: null,
  ...changes,
})

async function parts(book: ExportedBook, changes: Partial<ManuscriptOptions> = {}) {
  const files = unzipSync(await writeDocx(book, options(changes)))
  const text = (name: string) => {
    const file = files[name]
    return file ? strFromU8(file) : ''
  }
  return { files, document: text('word/document.xml'), styles: text('word/styles.xml'), numbering: text('word/numbering.xml'), text }
}

/** The visible text of each paragraph, in order. */
const paragraphs = (xml: string) =>
  [...xml.matchAll(/<w:p>([\s\S]*?)<\/w:p>|<w:p [^>]*>([\s\S]*?)<\/w:p>/g)].map((match) =>
    [...(match[1] ?? match[2] ?? '').matchAll(/<w:t[^>]*>([^<]*)<\/w:t>|<w:br\/>/g)].map((t) => t[1] ?? '\n').join(''),
  )

describe('the Word manuscript', () => {
  it('opens with a title page: author, word count, title and byline', async () => {
    const { document } = await parts(english)
    expect(paragraphs(document).slice(0, 4)).toEqual(['Ines Varga', 'about 84,000 words', 'The Salt Orchard', 'by Ines Varga'])
  })

  it('leaves out the title page, or only the word count, when the author chooses', async () => {
    expect(paragraphs((await parts(english, { titlePage: false })).document)[0]).toBe('The Crossing')
    expect(paragraphs((await parts(english, { wordCount: null })).document).slice(0, 2)).toEqual(['Ines Varga', 'The Salt Orchard'])
  })

  it('heads each chapter on a new page, with its label and name, in Word’s Heading 1', async () => {
    const { document } = await parts(hebrew)
    expect(document).toMatch(/<w:pStyle w:val="Heading1"\/><w:pageBreakBefore\/><w:bidi\/>/)
    expect(paragraphs(document)).toContain('פרק 1\nהמעבר')
    expect(document).toMatch(/<w:pStyle w:val="Part"\/><w:pageBreakBefore\/>/)
  })

  it('marks Hebrew paragraphs right to left, splits runs where the script changes, and keeps marked English left to right', async () => {
    const { document } = await parts(hebrew)
    const runs = (paragraph: string) =>
      [...paragraph.matchAll(/<w:r>([\s\S]*?)<\/w:r>/g)].map(
        (m) => `${m[1]?.includes('<w:rtl/>') ? 'R' : 'L'}:${m[1]?.match(/<w:t[^>]*>([^<]*)/)?.[1] ?? ''}`,
      )
    const body = [...document.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map((m) => m[1] ?? '')
    const first = body.find((p) => p.includes('המעבורת')) ?? ''
    expect(first).toContain('<w:bidi/>')
    expect(runs(first)).toEqual(['R:המעבורת יצאה, ', 'R:ו', 'R:אינס ', 'L:said: no.'])
    const letter = body.find((p) => p.includes('The letter')) ?? ''
    expect(letter).not.toContain('<w:bidi/>')
    expect(runs(letter)).toEqual(['L:The letter &lt;was&gt; sent.'])
  })

  it('writes scene breaks, inner headings, quotes, lists and only safe links', async () => {
    const { document, numbering, text } = await parts(english)
    expect((await parts(hebrew)).document).toContain('<w:pStyle w:val="SceneBreak"/>')
    expect(document).toContain('<w:pStyle w:val="Heading3"/>') // `##` sits under the chapter's Heading 1
    expect(document).toContain('<w:pStyle w:val="Quote"/>')
    expect(numbering).toContain('<w:start w:val="3"/>')
    expect(paragraphs(document)).toEqual(expect.arrayContaining(['three', 'four', 'nested', 'site and Ilka and bad.']))
    const relationships = text('word/_rels/document.xml.rels')
    expect(relationships).toContain('Target="https://x.org"')
    expect(relationships).not.toContain('javascript')
    expect(relationships).not.toContain('ilka.md')
  })

  it('puts "Surname / TITLE / page" at the top of the pages after the title page', async () => {
    const { files, document } = await parts(english)
    const headers = Object.keys(files).filter((name) => /^word\/header\d+\.xml$/.test(name))
    expect(headers).toHaveLength(1)
    const header = strFromU8(files[headers[0] as string] as Uint8Array)
    expect(paragraphs(header)[0]).toBe('Varga / The Salt Orchard / ')
    expect(header).toContain('<w:caps/>')
    expect(header).toContain('PAGE')
    // Two sections: the title page with no header, then the book, numbered from 1.
    expect(document.match(/<w:sectPr/g)).toHaveLength(2)
    expect(document).toMatch(/<w:pgNumType w:start="1"\/>/)
  })

  it('sets the paper and the spacing the author chose', async () => {
    expect((await parts(english)).document).toContain('<w:pgSz w:w="11906" w:h="16838"')
    expect((await parts(english, { paper: 'letter' })).document).toContain('<w:pgSz w:w="12240" w:h="15840"')
    expect((await parts(english)).styles).toContain('w:line="480"')
    expect((await parts(english, { doubleSpaced: false })).styles).toContain('w:line="360"')
  })

  it('packs the Hebrew font into the file, with David as the font to use instead where it can’t be shown', async () => {
    const font = { name: 'David Libre', regular: new Uint8Array(64).fill(7), fallback: 'David' }
    const { files, text } = await parts(hebrew, { hebrewFont: font })
    expect(text('word/fontTable.xml')).toMatch(/<w:font w:name="David Libre"><w:altName w:val="David"\/>[\s\S]*?<w:embedRegular /)
    expect(Object.keys(files).some((name) => name.startsWith('word/fonts/'))).toBe(true)
    expect(text('word/styles.xml')).toContain('w:cs="David Libre"')
  })

  it('doesn’t pack the Hebrew font into a book with no Hebrew in it', async () => {
    const font = { name: 'David Libre', regular: new Uint8Array(64).fill(7), fallback: 'David' }
    const { files, text } = await parts(english, { hebrewFont: font })
    expect(Object.keys(files).some((name) => name.startsWith('word/fonts/'))).toBe(false)
    expect(text('word/fontTable.xml')).not.toContain('David Libre')
  })

  it('names the book and its author in the file’s details', async () => {
    const { text } = await parts(hebrew)
    expect(text('docProps/core.xml')).toContain('<dc:title>פרדס המלח</dc:title>')
    expect(text('docProps/core.xml')).toContain('<dc:creator>אינס ורגה</dc:creator>')
  })
})
