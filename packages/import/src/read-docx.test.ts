import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { ENGLISH_BOOK, HEBREW_BOOK, PAGE_BREAK, docx, para, run } from './docx-fixtures.test-support'
import { readDocx, type ImportedManuscript } from './read-docx'

async function read(bytes: Uint8Array): Promise<ImportedManuscript> {
  const result = await readDocx(bytes)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const shape = (manuscript: ImportedManuscript) =>
  manuscript.paragraphs.map((p) => `${p.title ? 'title' : p.kind}${p.heading ? p.heading : ''}${p.pageBreakBefore ? '↵' : ''}: ${p.text}`)

describe('reading a Hebrew Word manuscript with heading styles', () => {
  it('gives its paragraphs, headings and title, with tracked changes accepted', async () => {
    expect(shape(await read(HEBREW_BOOK))).toEqual([
      'title: מטע המלח',
      'paragraph: מאת אינס ורגה',
      'heading1: חלק ראשון: הגעה',
      'heading2: פרק 1: המעבר',
      'paragraph: המעבורת יצאה לפני עלות השחר, ואינס לא הייתה עליה.',
      'paragraph: נואל ענה: It was never ושתק.',
      'paragraph: The letter was sent in English.',
      'paragraph: היא לא חיכתה לצהריים.', // " לצהריים" inserted, " בכלל" deleted
      'paragraph: * * *',
      'list-item: פריט ראשון',
      'list-item: פריט שני',
      'quote: ציטוט מהמכתב.',
      'heading1: חלק שני: מלח',
      'heading2: פרק 2: רוח מלוחה',
      'paragraph: הרוח באה מהים.',
    ])
  })

  it('keeps italic, and footnote marks with their notes', async () => {
    const manuscript = await read(HEBREW_BOOK)
    expect(manuscript.paragraphs[4]?.inlines).toEqual([
      { type: 'text', value: 'המעבורת יצאה לפני עלות השחר, ' },
      { type: 'emphasis', children: [{ type: 'text', value: 'ו' }] },
      { type: 'text', value: 'אינס לא הייתה עליה.' },
      { type: 'footnote', id: 'footnote-1' },
    ])
    expect(manuscript.footnotes).toEqual({
      'footnote-1': [{ type: 'text', value: 'בשנת 1904 המעבר ארך שעתיים.' }],
      'footnote-2': [
        { type: 'text', value: 'A ' },
        { type: 'emphasis', children: [{ type: 'text', value: 'second' }] },
        { type: 'text', value: ' note.' },
      ],
    })
  })

  it('counts what won’t come in, and reads the file’s title and author', async () => {
    const manuscript = await read(HEBREW_BOOK)
    expect(manuscript.leftOut).toEqual({ comments: 2, pictures: 1, tables: 1 })
    expect(manuscript.details).toEqual({ title: 'מטע המלח', author: 'אינס ורגה' })
    expect(manuscript.paragraphs.some((p) => p.text.includes('Cell'))).toBe(false) // the table's text stays out
  })
})

describe('reading an English manuscript typed without heading styles', () => {
  it('marks the paragraph after each page break, even one at the end of a paragraph', async () => {
    expect(shape(await read(ENGLISH_BOOK))).toEqual([
      'paragraph: THE SALT ORCHARD',
      'paragraph: by Ines Varga',
      'paragraph↵: Chapter One',
      'paragraph: The Crossing',
      'paragraph: The ferry left before dawn, and Ines was not on it.',
      'paragraph: #',
      'paragraph: She did not wait for noon.',
      'paragraph↵: Chapter Two',
      'paragraph: The salt had reached the first rows.',
      'paragraph: Last line of chapter two.',
      'paragraph↵: A page that starts with no heading at all.',
    ])
  })

  it('has no details when the file names none, and nothing left out', async () => {
    const manuscript = await read(ENGLISH_BOOK)
    expect(manuscript.details).toEqual({ title: null, author: null })
    expect(manuscript.leftOut).toEqual({ comments: 0, pictures: 0, tables: 0 })
  })
})

describe('the file’s own words are only ever text', () => {
  it('keeps markup typed in the text as text, and decodes the details', async () => {
    const manuscript = await read(
      docx({ body: para(run('A &lt;script&gt;alert(1)&lt;/script&gt; &amp; more')), title: 'Salt &amp; Frost' }),
    )
    expect(manuscript.paragraphs[0]?.inlines).toEqual([{ type: 'text', value: 'A <script>alert(1)</script> & more' }])
    expect(manuscript.details.title).toBe('Salt & Frost')
  })

  it('keeps links with their address', async () => {
    const body = para('<w:hyperlink r:id="rIdLink"><w:r><w:t>the map</w:t></w:r></w:hyperlink>')
    const bytes = docx({ body })
    // Add the link's relationship to the file.
    const files = unzipSync(bytes)
    const rels = strFromU8(files['word/_rels/document.xml.rels'] ?? new Uint8Array())
    files['word/_rels/document.xml.rels'] = strToU8(
      rels.replace(
        '</Relationships>',
        '<Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.org/map" TargetMode="External"/></Relationships>',
      ),
    )
    const manuscript = await read(zipSync(files))
    expect(manuscript.paragraphs[0]?.inlines).toEqual([
      { type: 'link', url: 'https://example.org/map', children: [{ type: 'text', value: 'the map' }] },
    ])
  })
})

describe('files that can’t be read', () => {
  it('says plainly what kind of problem it is', async () => {
    expect(await readDocx(strToU8('just some text'))).toEqual({ ok: false, error: 'not-a-word-file' })
    expect(await readDocx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toEqual({
      ok: false,
      error: 'old-or-protected',
    })
    expect(await readDocx(zipSync({ 'hello.txt': strToU8('hi') }))).toEqual({ ok: false, error: 'not-a-word-file' })
    expect(await readDocx(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toEqual({ ok: false, error: 'not-a-word-file' })
  })

  it('reads an empty document as no paragraphs', async () => {
    expect((await read(docx({ body: para(PAGE_BREAK) }))).paragraphs).toEqual([])
  })
})
