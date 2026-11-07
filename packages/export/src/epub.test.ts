import { readChapterForExport } from '@plotdevice/markdown'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { writeEpub } from './epub'
import type { ExportedBook } from './exported-book'

const hebrew: ExportedBook = {
  title: 'פרדס המלח',
  author: 'אינס ורגה',
  language: 'he',
  direction: 'rtl',
  id: '0f6e3a52-8c1d-4c55-9a59-0d2b1e6f7a10',
  made: '2026-11-07T12:30:00.000Z',
  entries: [
    {
      kind: 'chapter',
      label: 'פרק 1',
      name: 'המעבר',
      blocks: readChapterForExport('המעבורת יצאה לפני עלות השחר.\n\n* * *\n\n::: {dir=ltr}\nThe letter was sent.\n:::\n'),
    },
    { kind: 'part', name: 'חלק שני' },
    { kind: 'chapter', label: 'פרק 2', name: 'רוח <מלוחה>', blocks: readChapterForExport('„תהיה עוד אחת בצהריים,” אמר הסבל.\n') },
    { kind: 'part', name: 'חלק ריק' },
  ],
}

const english: ExportedBook = {
  title: 'The Salt Orchard',
  author: null,
  language: 'en',
  direction: 'ltr',
  id: 'salt-orchard',
  made: '2026-11-07T12:30:00.000Z',
  entries: [{ kind: 'chapter', label: null, name: 'The Crossing', blocks: readChapterForExport('The ferry left before dawn.\n') }],
}

const files = (bytes: Uint8Array) => Object.fromEntries(Object.entries(unzipSync(bytes)).map(([name, data]) => [name, data]))
const text = (bytes: Uint8Array, name: string) => {
  const file = files(bytes)[name]
  if (!file) throw new Error(`no ${name}`)
  return strFromU8(file)
}

describe('the e-book', () => {
  const epub = writeEpub(hebrew, { contents: 'תוכן העניינים' })

  it('starts with the uncompressed mimetype, as e-book readers require', () => {
    expect(strFromU8(epub.slice(30, 38))).toBe('mimetype') // the first local file header's name
    expect(epub[8]).toBe(0) // stored, not compressed
    expect(strFromU8(epub.slice(38, 58))).toBe('application/epub+zip')
  })

  it('names the book, its author and language, and turns pages right to left in Hebrew', () => {
    const opf = text(epub, 'OEBPS/content.opf')
    expect(opf).toContain('<dc:title>פרדס המלח</dc:title>')
    expect(opf).toContain('<dc:creator>אינס ורגה</dc:creator>')
    expect(opf).toContain('<dc:language>he</dc:language>')
    expect(opf).toContain('<meta property="dcterms:modified">2026-11-07T12:30:00Z</meta>')
    expect(opf).toContain('<spine page-progression-direction="rtl">')
  })

  it('reads in order: title page, contents, then parts and chapters', () => {
    const spine = [...text(epub, 'OEBPS/content.opf').matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1])
    expect(spine).toEqual(['title-page', 'nav', 'chapter-1', 'part-1', 'chapter-2', 'part-2'])
  })

  it('lists chapters inside their parts in the contents, and an empty part on its own', () => {
    const nav = text(epub, 'OEBPS/nav.xhtml')
    expect(nav).toContain('<h1>תוכן העניינים</h1>')
    expect(nav).toContain('<li><a href="chapter-1.xhtml">פרק 1: המעבר</a></li>')
    expect(nav).toContain(
      '<li><a href="part-1.xhtml">חלק שני</a><ol>\n<li><a href="chapter-2.xhtml">פרק 2: רוח &lt;מלוחה&gt;</a></li>\n</ol></li>',
    )
    expect(nav).toContain('<li><a href="part-2.xhtml">חלק ריק</a></li>')
  })

  it('writes each chapter right to left, with its heading, text, scene breaks and marked paragraphs', () => {
    const chapter = text(epub, 'OEBPS/chapter-1.xhtml')
    expect(chapter).toContain('xml:lang="he" lang="he" dir="rtl"')
    expect(chapter).toContain('<h1><span class="label">פרק 1</span>המעבר</h1>')
    expect(chapter).toContain(
      '<p>המעבורת יצאה לפני עלות השחר.</p>\n<p class="scene-break" role="separator">* * *</p>\n<p dir="ltr">The letter was sent.</p>',
    )
    expect(text(epub, 'OEBPS/chapter-2.xhtml')).toContain('רוח &lt;מלוחה&gt;')
  })

  it('is the same file for the same book', () => {
    expect(writeEpub(hebrew, { contents: 'תוכן העניינים' })).toEqual(epub)
  })
})

describe('an e-book with a cover and no author', () => {
  const cover = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
  const epub = writeEpub(english, { contents: 'Contents' }, { bytes: cover, mediaType: 'image/jpeg' })

  it('packs the cover picture and opens on it', () => {
    expect(files(epub)['OEBPS/cover.jpg']).toEqual(cover)
    const opf = text(epub, 'OEBPS/content.opf')
    expect(opf).toContain('<item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>')
    expect([...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1])).toEqual(['cover', 'title-page', 'nav', 'chapter-1'])
    expect(opf).toContain('<spine page-progression-direction="ltr">')
    expect(text(epub, 'OEBPS/cover.xhtml')).toContain('<img src="cover.jpg" alt="The Salt Orchard"/>')
  })

  it('leaves the author out when there is none, and the chapter heading is only its name', () => {
    expect(text(epub, 'OEBPS/content.opf')).not.toContain('dc:creator')
    expect(text(epub, 'OEBPS/title.xhtml')).not.toContain('class="author"')
    expect(text(epub, 'OEBPS/chapter-1.xhtml')).toContain('<h1>The Crossing</h1>')
  })
})
