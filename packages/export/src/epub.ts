import { strToU8, zipSync, type Zippable } from 'fflate'
import type { ExportedBook, ExportedChapter } from './exported-book'
import { blocksToHtml, escapeXml } from './html'

export interface EpubCover {
  bytes: Uint8Array
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export interface EpubWords {
  /** The table of contents' heading, in the book's language: "Contents", "תוכן העניינים". */
  contents: string
}

const EXTENSIONS: Record<EpubCover['mediaType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

const STYLES = `body { margin: 0 5%; line-height: 1.5; }
p { margin: 0; text-indent: 1.5em; text-align: start; }
h1 { text-align: center; font-weight: normal; margin: 3em 0 2em; page-break-before: always; break-before: page; }
h1 .label { display: block; font-size: 0.7em; letter-spacing: 0.1em; margin-bottom: 0.4em; }
h2, h3, h4, h5, h6 { font-weight: normal; font-style: italic; margin: 1.5em 0 0.75em; }
h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p, .scene-break + p, blockquote + p, ul + p, ol + p { text-indent: 0; }
.scene-break { text-align: center; text-indent: 0; margin: 1em 0; }
.stanza { text-indent: 0; margin: 0 0 1.5em; text-align: start; hyphens: none; -webkit-hyphens: none; }
.stanza .line { display: block; padding-inline-start: 2em; text-indent: -2em; }
.untitled { margin-top: 3em; }
blockquote { margin: 1em 2em; }
blockquote p, li p { text-indent: 0; }
.part { margin-top: 30%; }
.title-page { text-align: center; margin-top: 30%; }
.title-page h1 { margin: 0 0 1em; font-size: 2em; }
.title-page p { text-indent: 0; text-align: center; }
.cover { text-align: center; margin: 0; padding: 0; }
.cover img { max-width: 100%; max-height: 100vh; }
nav ol { list-style: none; padding-inline-start: 1em; }
`

/**
 * The book as an EPUB 3 e-book (Milestone 22): a title page, a table of contents from the part and
 * chapter headings, each part and chapter its own page, and the cover when there is one. Pages turn
 * the book's way, right to left for Hebrew. No fonts are packed in, so readers' own settings win.
 */
export function writeEpub(book: ExportedBook, words: EpubWords, cover: EpubCover | null = null): Uint8Array {
  const pages: { id: string; href: string; title: string; body: string; type: string; chapter?: ExportedChapter }[] = []
  if (cover) pages.push({ id: 'cover', href: 'cover.xhtml', title: book.title, type: 'cover', body: coverBody(book, cover) })
  pages.push({ id: 'title-page', href: 'title.xhtml', title: book.title, type: 'titlepage', body: titleBody(book) })
  let partNumber = 0
  let chapterNumber = 0
  const toc: { href: string; text: string; part: boolean; untitled?: boolean }[] = []
  for (const entry of book.entries) {
    if (entry.kind === 'part') {
      const href = `part-${++partNumber}.xhtml`
      pages.push({
        id: `part-${partNumber}`,
        href,
        title: entry.name,
        type: 'part',
        body: `<h1 class="part">${escapeXml(entry.name)}</h1>`,
      })
      toc.push({ href, text: entry.name, part: true })
    } else {
      const href = `chapter-${++chapterNumber}.xhtml`
      const heading = chapterHeading(entry)
      pages.push({
        id: `chapter-${chapterNumber}`,
        href,
        title: heading,
        type: 'chapter',
        // An untitled poem has no heading; the contents names it by its first line (ADR 0013).
        body: entry.untitled
          ? `<div class="untitled">${blocksToHtml(entry.blocks, book.direction, 1, true)}</div>`
          : `<h1>${entry.label === null ? '' : `<span class="label">${escapeXml(entry.label)}</span>`}${escapeXml(entry.name)}</h1>\n${blocksToHtml(entry.blocks, book.direction, 1, entry.poem)}`,
      })
      toc.push({ href, text: heading, part: false, ...(entry.untitled ? { untitled: true } : {}) })
    }
  }

  const files: Zippable = {
    // First and uncompressed, so readers recognise the file (EPUB OCF).
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(CONTAINER),
    'OEBPS/content.opf': strToU8(packageDocument(book, pages, cover)),
    'OEBPS/nav.xhtml': strToU8(xhtml(book, words.contents, navBody(words, toc, pages), 'toc')),
    'OEBPS/styles.css': strToU8(STYLES),
  }
  for (const page of pages) files[`OEBPS/${page.href}`] = strToU8(xhtml(book, page.title, page.body, page.type))
  if (cover) files[`OEBPS/cover.${EXTENSIONS[cover.mediaType]}`] = [cover.bytes, { level: 0 }]
  return zipSync(files, { level: 9, mtime: new Date(book.made) })
}

const chapterHeading = (chapter: ExportedChapter): string =>
  chapter.label === null || chapter.untitled ? chapter.name : `${chapter.label}: ${chapter.name}`

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`

function xhtml(book: ExportedBook, title: string, body: string, type: string): string {
  const language = escapeXml(book.language)
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}" dir="${book.direction}">
<head>
<meta charset="UTF-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="${type === 'part' ? 'part' : type === 'chapter' ? 'chapter' : type === 'toc' ? 'frontmatter' : type}">
${type === 'toc' ? body : `<section epub:type="${type === 'chapter' ? 'bodymatter chapter' : type}">\n${body}\n</section>`}
</body>
</html>
`
}

function titleBody(book: ExportedBook): string {
  const author = book.author === null ? '' : `\n<p class="author">${escapeXml(book.author)}</p>`
  return `<div class="title-page">\n<h1>${escapeXml(book.title)}</h1>${author}\n</div>`
}

function coverBody(book: ExportedBook, cover: EpubCover): string {
  return `<div class="cover"><img src="cover.${EXTENSIONS[cover.mediaType]}" alt="${escapeXml(book.title)}"/></div>`
}

function navBody(
  words: EpubWords,
  toc: readonly { href: string; text: string; part: boolean; untitled?: boolean }[],
  pages: readonly { href: string; type: string; title: string }[],
): string {
  // Chapters after a part are listed inside it; chapters before the first part stand alone.
  let items = ''
  let inPart = false
  for (const entry of toc) {
    if (entry.part) {
      if (inPart) items += '</ol></li>\n'
      items += `<li><a href="${entry.href}">${escapeXml(entry.text)}</a><ol>\n`
      inPart = true
    } else {
      // An untitled poem is listed by its first line, in italics (ADR 0013).
      const text = entry.untitled ? `<em>${escapeXml(entry.text)}</em>` : escapeXml(entry.text)
      items += `<li><a href="${entry.href}">${text}</a></li>\n`
    }
  }
  if (inPart) items += '</ol></li>\n'
  // An empty part has an empty list, which EPUB doesn't allow; it stands alone instead.
  items = items.replace(/<ol>\n<\/ol><\/li>/g, '</li>')
  const first = pages.find((page) => page.type === 'chapter' || page.type === 'part')
  const landmarks = [
    ...pages
      .filter((page) => page.type === 'cover')
      .map((page) => `<li><a epub:type="cover" href="cover.xhtml">${escapeXml(page.title)}</a></li>`),
    `<li><a epub:type="toc" href="nav.xhtml">${escapeXml(words.contents)}</a></li>`,
    first ? `<li><a epub:type="bodymatter" href="${first.href}">${escapeXml(first.title)}</a></li>` : '',
  ].join('')
  return `<nav epub:type="toc" id="toc">
<h1>${escapeXml(words.contents)}</h1>
<ol>
${items}</ol>
</nav>
<nav epub:type="landmarks" hidden="hidden">
<ol>${landmarks}</ol>
</nav>`
}

function packageDocument(book: ExportedBook, pages: readonly { id: string; href: string }[], cover: EpubCover | null): string {
  const modified = new Date(book.made).toISOString().replace(/\.\d{3}Z$/, 'Z')
  const manifest = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="styles" href="styles.css" media-type="text/css"/>',
    ...(cover
      ? [`<item id="cover-image" href="cover.${EXTENSIONS[cover.mediaType]}" media-type="${cover.mediaType}" properties="cover-image"/>`]
      : []),
    ...pages.map((page) => `<item id="${page.id}" href="${page.href}" media-type="application/xhtml+xml"/>`),
  ]
  // The table of contents follows the title page, as in a printed book.
  const order = pages.flatMap((page) => (page.id === 'title-page' ? [page.id, 'nav'] : [page.id]))
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${escapeXml(book.language)}" dir="${book.direction}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">${escapeXml(`urn:plotdevice:${book.id}`)}</dc:identifier>
<dc:title>${escapeXml(book.title)}</dc:title>
<dc:language>${escapeXml(book.language)}</dc:language>
${book.author === null ? '' : `<dc:creator>${escapeXml(book.author)}</dc:creator>\n`}<meta property="dcterms:modified">${modified}</meta>
${cover ? '<meta name="cover" content="cover-image"/>\n' : ''}</metadata>
<manifest>
${manifest.join('\n')}
</manifest>
<spine page-progression-direction="${book.direction}">
${order.map((id) => `<itemref idref="${id}"/>`).join('\n')}
</spine>
</package>
`
}
