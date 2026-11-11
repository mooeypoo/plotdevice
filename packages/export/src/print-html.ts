import type { ExportedBook } from './exported-book'
import { blocksToHtml, escapeXml } from './html'

export interface PrintFont {
  family: string
  /** Where the desktop app keeps the font file, as a `file:` URL. */
  url: string
  style: 'normal' | 'italic'
  /** The characters this file covers, as CSS `unicode-range`; all when absent. */
  unicodeRange?: string
}

export interface PrintOptions {
  titlePage: boolean
  /** "about 84,000 words", already in the book's language; `null` leaves it out. */
  wordCount: string | null
  doubleSpaced: boolean
  paper: 'a4' | 'letter'
  /** "by", in the book's language. */
  by: string
  /** The app's own fonts (Literata, Noto Serif Hebrew), packed into the PDF. */
  fonts: readonly PrintFont[]
  /** Families in order, for the text: the first that has a character is used. */
  families: readonly string[]
}

/** Text as a quoted CSS string, safe inside a `<style>` element. */
function cssString(text: string): string {
  return `"${text
    .replace(/[\\"]/g, (char) => `\\${char}`)
    .replace(/[\n\r\f]/g, ' ')
    .replace(/</g, '\\3C ')}"`
}

/**
 * The page the desktop app prints to PDF (Milestone 22): the same manuscript as the Word file, in the
 * app's own fonts. Self-contained: no scripts, and a Content-Security-Policy that loads only fonts.
 * The running head ("Surname / TITLE / page") is drawn by CSS page margins, and left off the title page,
 * which isn't counted, so the first page of the book is page 1, as in the Word file.
 */
export function printHtml(book: ExportedBook, options: PrintOptions): string {
  const rtl = book.direction === 'rtl'
  const surname = book.author?.split(/\s+/).at(-1)
  const head = `${surname ? `${surname} / ` : ''}${book.title.toLocaleUpperCase(book.language)} / `
  const headBox = rtl ? '@top-left' : '@top-right'
  const fontFaces = options.fonts
    .map(
      (font) =>
        `@font-face { font-family: ${cssString(font.family)}; src: url(${cssString(font.url)}) format("woff2"); font-weight: 100 900; font-style: ${font.style};${
          font.unicodeRange ? ` unicode-range: ${font.unicodeRange};` : ''
        } }`,
    )
    .join('\n')
  const families = [...options.families.map(cssString), 'serif'].join(', ')
  const line = options.doubleSpaced ? 2 : 1.5

  const sections: string[] = []
  if (options.titlePage) {
    sections.push(`<section class="title-page">
<div class="title-top"><span>${escapeXml(book.author ?? '')}</span><span>${escapeXml(options.wordCount ?? '')}</span></div>
<h1 class="book-title">${escapeXml(book.title)}</h1>
${book.author ? `<p class="byline">${escapeXml(`${options.by} ${book.author}`)}</p>` : ''}
</section>`)
  }
  for (const entry of book.entries) {
    if (entry.kind === 'part') sections.push(`<section class="part"><h1>${escapeXml(entry.name)}</h1></section>`)
    else if (entry.untitled)
      // An untitled poem has no heading (ADR 0013).
      sections.push(`<section class="chapter untitled">
${blocksToHtml(entry.blocks, book.direction, 1, true)}
</section>`)
    else
      sections.push(`<section class="chapter">
<h1>${entry.label === null ? '' : `<span class="label">${escapeXml(entry.label)}</span>`}${escapeXml(entry.name)}</h1>
${blocksToHtml(entry.blocks, book.direction, 1, entry.poem)}
</section>`)
  }

  return `<!doctype html>
<html lang="${escapeXml(book.language)}" dir="${book.direction}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src file: data:">
<title>${escapeXml(book.title)}</title>
<style>
${fontFaces}
@page { size: ${options.paper === 'a4' ? 'A4' : 'letter'}; margin: 1in; ${headBox} { content: ${cssString(head)} counter(page); font-family: ${families}; font-size: 10pt; vertical-align: bottom; padding-bottom: 0.25in; } }
@page title { counter-increment: page 0; ${headBox} { content: none; } }
html { font-family: ${families}; font-size: 12pt; line-height: ${line}; color: #000; background: #fff; }
body { margin: 0; }
h1 { font-size: 12pt; font-weight: normal; text-align: center; margin: 2in 0 0.5in; line-height: ${line}; }
h1 .label { display: block; }
h2, h3, h4, h5, h6 { font-size: 12pt; font-weight: normal; font-style: italic; margin: ${line / 2}em 0; break-after: avoid; }
p { margin: 0; text-indent: 0.5in; text-align: start; orphans: 2; widows: 2; }
.scene-break { text-align: center; text-indent: 0; }
.stanza { text-indent: 0; margin: 0 0 ${line}em; text-align: start; hyphens: none; break-inside: avoid; }
.stanza .line { display: block; padding-inline-start: 0.5in; text-indent: -0.5in; }
.untitled { padding-top: 2in; }
blockquote { margin: 0 0.5in; }
blockquote p, li p { text-indent: 0; }
ul, ol { margin: 0; padding-inline-start: 0.5in; }
a { color: inherit; }
.title-page { page: title; break-after: page; }
.title-top { display: flex; justify-content: space-between; gap: 1em; line-height: 1.2; }
.book-title { margin-top: 3in; text-transform: uppercase; }
.byline { text-align: center; text-indent: 0; }
.part { break-before: page; }
.part h1 { margin-top: 3in; font-size: 14pt; }
.chapter { break-before: page; }
</style>
</head>
<body>
${sections.join('\n')}
</body>
</html>
`
}
