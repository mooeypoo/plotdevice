import type { ExportBlock, ExportInline, TextDirection } from '@plotdevice/markdown'
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  Header,
  LevelFormat,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  type ILevelsOptions,
  type INumberingOptions,
  type IRunOptions,
  type ParagraphChild,
} from 'docx'
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import type { ExportedBook } from './exported-book'
import { safeUrl } from './html'

export interface ManuscriptFont {
  /** The family name, as the font file names it. */
  name: string
  regular: Uint8Array
  bold?: Uint8Array
  /** A font Word uses instead when the packed one isn't shown, such as "David" (Windows and Office). */
  fallback?: string
}

export interface ManuscriptOptions {
  titlePage: boolean
  /** "about 84,000 words", already in the book's language; `null` leaves it out. */
  wordCount: string | null
  doubleSpaced: boolean
  paper: 'a4' | 'letter'
  /** "by", in the book's language, before the author on the title page. */
  by: string
  /** Packed into the file for right-to-left text (Hebrew), so it looks the same on editors' computers. */
  hebrewFont: ManuscriptFont | null
}

const LATIN_FONT = 'Times New Roman'
const INCH = 1440 // twips
const PAPER = { a4: { width: 11906, height: 16838 }, letter: { width: 12240, height: 15840 } } as const
const SIZE = 24 // half-points: 12pt
const STRONG_RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/u
const STRONG_LTR = /\p{L}/u
/** Only right-to-left paragraphs say so; Word's default is left to right. */
const bidi = (rtl: boolean) => (rtl ? { bidirectional: true } : {})

/**
 * The book as a Word manuscript (Milestone 22), in the standard look editors expect: 12pt, double
 * spaced (or 1.5), one-inch margins, first lines indented, each chapter on a new page a third of the
 * way down, and "Surname / TITLE / page" at the top of every page after the title page. Built from
 * Word's own styles (Normal, Title, Heading 1–6, Quote), so an editor can restyle the whole file.
 */
export async function writeDocx(book: ExportedBook, options: ManuscriptOptions): Promise<Uint8Array> {
  const writer = new ManuscriptWriter(book, options)
  const body = book.entries.flatMap((entry) => (entry.kind === 'part' ? writer.part(entry.name) : writer.chapter(entry)))
  const titlePage = options.titlePage ? writer.titlePage() : null
  const runningHead = writer.runningHead()
  // The Hebrew font is packed in only when the book has right-to-left text, which keeps English files small.
  const hebrewFont = writer.hasRtl ? options.hebrewFont : null
  const page = {
    size: PAPER[options.paper],
    margin: { top: INCH, bottom: INCH, left: INCH, right: INCH, header: INCH / 2, footer: INCH / 2 },
  }
  const csFont = hebrewFont?.name ?? LATIN_FONT
  const font = { ascii: LATIN_FONT, hAnsi: LATIN_FONT, cs: csFont }
  const line = options.doubleSpaced ? 480 : 360
  const document = new Document({
    title: book.title,
    creator: book.author ?? '',
    lastModifiedBy: book.author ?? '',
    ...(hebrewFont
      ? {
          fonts: [
            {
              name: hebrewFont.name,
              data: hebrewFont.regular as never,
              ...(hebrewFont.bold ? { bold: hebrewFont.bold as never } : {}),
            },
          ],
        }
      : {}),
    styles: {
      default: {
        document: {
          run: {
            font,
            size: SIZE,
            sizeComplexScript: SIZE,
            language: { value: book.direction === 'rtl' ? 'he-IL' : 'en-US', bidirectional: 'he-IL' },
          },
          paragraph: { spacing: { line, lineRule: LineRuleType.AUTO, before: 0, after: 0 } },
        },
        title: { run: { font, size: SIZE, sizeComplexScript: SIZE, color: '000000' }, paragraph: { alignment: AlignmentType.CENTER } },
        heading1: {
          run: { font, size: SIZE, sizeComplexScript: SIZE, color: '000000', bold: false, boldComplexScript: false },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 3 * INCH, after: INCH / 2 }, keepNext: true },
        },
        ...Object.fromEntries(
          [2, 3, 4, 5, 6].map((level) => [
            `heading${level}`,
            {
              run: { font, size: SIZE, sizeComplexScript: SIZE, color: '000000', bold: false, italics: true, italicsComplexScript: true },
              paragraph: { spacing: { before: line / 2, after: line / 2 }, keepNext: true },
            },
          ]),
        ),
      },
      paragraphStyles: [
        {
          id: 'Part',
          name: 'Part',
          basedOn: 'Heading1',
          next: 'Normal',
          run: { size: SIZE + 4, sizeComplexScript: SIZE + 4 },
          paragraph: { spacing: { before: 4 * INCH }, outlineLevel: 0 },
        },
        { id: 'Quote', name: 'Quote', basedOn: 'Normal', next: 'Normal', paragraph: { indent: { start: INCH / 2, end: INCH / 2 } } },
        { id: 'SceneBreak', name: 'Scene Break', basedOn: 'Normal', next: 'Normal', paragraph: { alignment: AlignmentType.CENTER } },
      ],
    },
    numbering: { config: writer.numbering() },
    sections: [
      ...(titlePage ? [{ properties: { page }, children: titlePage }] : []),
      {
        properties: { page: { ...page, pageNumbers: { start: 1 } } },
        headers: { default: new Header({ children: [runningHead] }) },
        children: body,
      },
    ],
  })
  const bytes = new Uint8Array(await Packer.toArrayBuffer(document))
  return hebrewFont?.fallback ? withFallbackFont(bytes, hebrewFont.name, hebrewFont.fallback) : bytes
}

class ManuscriptWriter {
  private readonly lists: INumberingOptions['config'][number][] = []
  /** Whether any text so far is right to left. */
  hasRtl = false

  constructor(
    private readonly book: ExportedBook,
    private readonly options: ManuscriptOptions,
  ) {}

  /** One line's height, the space after a stanza: as the body's line spacing. */
  private get lineSpacing(): number {
    return this.options.doubleSpaced ? 480 : 360
  }

  numbering(): INumberingOptions['config'] {
    return this.lists
  }

  titlePage(): Paragraph[] {
    const { book, options } = this
    const rtl = book.direction === 'rtl'
    const para = (
      text: string,
      alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
      extra: Partial<IRunOptions> = {},
      before = 0,
    ) => new Paragraph({ ...bidi(rtl), alignment, spacing: { before }, children: this.runs(text, book.direction, extra) })
    return [
      ...(book.author ? [para(book.author, AlignmentType.START)] : []),
      ...(options.wordCount ? [para(options.wordCount, AlignmentType.END)] : []),
      new Paragraph({
        style: 'Title',
        ...bidi(rtl),
        alignment: AlignmentType.CENTER,
        spacing: { before: 3 * INCH },
        children: this.runs(book.title, book.direction, { allCaps: true }),
      }),
      ...(book.author ? [para(`${options.by} ${book.author}`, AlignmentType.CENTER)] : []),
    ]
  }

  /** "Varga / THE SALT ORCHARD / 12", at the end of the line (the right in English, the left in Hebrew). */
  runningHead(): Paragraph {
    const { book } = this
    const surname = book.author?.split(/\s+/).at(-1)
    return new Paragraph({
      ...bidi(book.direction === 'rtl'),
      alignment: AlignmentType.END,
      spacing: { line: 240 },
      children: [
        ...(surname ? [...this.runs(surname, book.direction), ...this.runs(' / ', book.direction)] : []),
        ...this.runs(book.title, book.direction, { allCaps: true }),
        ...this.runs(' / ', book.direction),
        new TextRun({ children: [PageNumber.CURRENT], rightToLeft: book.direction === 'rtl' }),
      ],
    })
  }

  part(name: string): Paragraph[] {
    return [
      new Paragraph({
        style: 'Part',
        pageBreakBefore: true,
        ...bidi(this.book.direction === 'rtl'),
        children: this.runs(name, this.book.direction),
      }),
    ]
  }

  chapter(chapter: { label: string | null; name: string; blocks: ExportBlock[]; poem?: boolean; untitled?: boolean }): Paragraph[] {
    const { direction } = this.book
    const at = { quote: 0, list: null, poem: chapter.poem === true || chapter.untitled === true }
    // An untitled poem has no heading: it starts a new page, as far down as a chapter's heading would (ADR 0013).
    if (chapter.untitled) {
      const [first, ...rest] = this.blocks(chapter.blocks, direction, at)
      const start = new Paragraph({ pageBreakBefore: true, spacing: { before: 2 * INCH }, ...bidi(direction === 'rtl'), children: [] })
      return [start, ...(first ? [first] : []), ...rest]
    }
    const heading = new Paragraph({
      style: 'Heading1',
      pageBreakBefore: true,
      ...bidi(direction === 'rtl'),
      children: [
        ...(chapter.label === null ? [] : [...this.runs(chapter.label, direction), new TextRun({ break: 1 })]),
        ...this.runs(chapter.name, direction),
      ],
    })
    return [heading, ...this.blocks(chapter.blocks, direction, at)]
  }

  private blocks(
    blocks: readonly ExportBlock[],
    around: TextDirection,
    at: { quote: number; list: { reference: string; level: number } | null; poem?: boolean },
  ): Paragraph[] {
    return blocks.flatMap((block): Paragraph[] => {
      switch (block.type) {
        case 'scene-break':
          return [new Paragraph({ style: 'SceneBreak', ...bidi(around === 'rtl'), children: [new TextRun('* * *')] })]
        case 'heading': {
          const direction = block.direction ?? around
          const level = Math.min(6, block.level + 1)
          return [
            new Paragraph({
              style: `Heading${level}`,
              ...bidi(direction === 'rtl'),
              children: this.inlines(block.children, direction, {}),
            }),
          ]
        }
        case 'paragraph': {
          const direction = block.direction ?? around
          if (at.poem && at.quote === 0 && at.list === null) return this.stanza(block.children, direction)
          const indent =
            at.list !== null
              ? { start: (at.list.level + 1) * (INCH / 2) + at.quote * (INCH / 2) }
              : at.quote > 0
                ? { start: at.quote * (INCH / 2), end: at.quote * (INCH / 2) }
                : { firstLine: INCH / 2 }
          return [
            new Paragraph({
              ...(at.quote > 0 && at.list === null ? { style: 'Quote' } : {}),
              ...bidi(direction === 'rtl'),
              indent,
              children: this.inlines(block.children, direction, {}),
            }),
          ]
        }
        case 'quote':
          return this.blocks(block.children, block.direction ?? around, { ...at, quote: at.quote + 1 })
        case 'list': {
          const direction = block.direction ?? around
          const level = at.list === null ? 0 : at.list.level + 1
          const reference = this.addList(block.ordered, block.start, level)
          return block.items.flatMap((item) =>
            item.flatMap((child, index) => {
              const inner = this.blocks([child], direction, { ...at, list: { reference, level } })
              // The item's first paragraph carries its bullet or number; the rest line up under it.
              const first = inner[0]
              if (index === 0 && child.type === 'paragraph' && first) {
                return [
                  new Paragraph({
                    ...bidi((child.direction ?? direction) === 'rtl'),
                    numbering: { reference, level },
                    children: this.inlines(child.children, child.direction ?? direction, {}),
                  }),
                  ...inner.slice(1),
                ]
              }
              return inner
            }),
          )
        }
      }
    })
  }

  /**
   * A stanza (ADR 0013): one paragraph per line, so a line too long for the page carries on indented
   * (a hanging indent would indent every line after a break inside one paragraph). Its lines keep
   * together on a page, and the last is followed by a line's space.
   */
  private stanza(inlines: readonly ExportInline[], direction: TextDirection): Paragraph[] {
    const lines: ExportInline[][] = [[]]
    for (const inline of inlines) {
      if (inline.type === 'break') lines.push([])
      else lines.at(-1)?.push(inline)
    }
    return lines.map(
      (line, i) =>
        new Paragraph({
          ...bidi(direction === 'rtl'),
          indent: { start: INCH / 2, hanging: INCH / 2 },
          spacing: { after: i === lines.length - 1 ? this.lineSpacing : 0 },
          ...(i < lines.length - 1 ? { keepNext: true } : {}),
          keepLines: true,
          children: this.inlines(line, direction, {}),
        }),
    )
  }

  private addList(ordered: boolean, start: number, level: number): string {
    const reference = `list-${this.lists.length + 1}`
    const levels: ILevelsOptions[] = Array.from({ length: 9 }, (_, index) => ({
      level: index,
      format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
      text: ordered ? `%${index + 1}.` : index % 2 === 0 ? '•' : '◦',
      start: index === level ? start : 1,
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { start: (index + 1) * (INCH / 2), hanging: INCH / 4 } } },
    }))
    this.lists.push({ reference, levels })
    return reference
  }

  private inlines(inlines: readonly ExportInline[], direction: TextDirection, style: Partial<IRunOptions>): ParagraphChild[] {
    return inlines.flatMap((inline): ParagraphChild[] => {
      switch (inline.type) {
        case 'text':
          return this.runs(inline.value, direction, style)
        case 'break':
          return [new TextRun({ break: 1 })]
        case 'emphasis':
          return this.inlines(inline.children, direction, { ...style, italics: true, italicsComplexScript: true })
        case 'strong':
          return this.inlines(inline.children, direction, { ...style, bold: true, boldComplexScript: true })
        case 'span':
          return this.inlines(inline.children, inline.direction, style)
        case 'link': {
          const url = safeUrl(inline.url)
          const children = this.inlines(inline.children, direction, url === null ? style : { ...style, style: 'Hyperlink' })
          return url === null ? children : [new ExternalHyperlink({ link: url, children })]
        }
      }
    })
  }

  /**
   * Text as runs, split where its script changes: Hebrew letters (and the spaces and punctuation
   * with them) are right-to-left runs, so Word gives them the Hebrew font and their order; Latin
   * letters are left-to-right runs in the Latin font.
   */
  private runs(text: string, base: TextDirection, style: Partial<IRunOptions> = {}): TextRun[] {
    const pieces: { text: string; rtl: boolean }[] = []
    let rtl = base === 'rtl'
    for (const char of text) {
      if (STRONG_RTL.test(char)) rtl = true
      else if (STRONG_LTR.test(char)) rtl = false
      const last = pieces.at(-1)
      if (last?.rtl === rtl) last.text += char
      else pieces.push({ text: char, rtl })
    }
    if (pieces.some((piece) => piece.rtl && STRONG_RTL.test(piece.text))) this.hasRtl = true
    return pieces.map((piece) => new TextRun({ ...style, text: piece.text, ...(piece.rtl ? { rightToLeft: true } : {}) }))
  }
}

/** Names a font Word uses when the packed one can't be shown (`w:altName`), which the library doesn't write. */
function withFallbackFont(bytes: Uint8Array, name: string, fallback: string): Uint8Array {
  const files = unzipSync(bytes)
  const table = files['word/fontTable.xml']
  if (!table) return bytes
  const escaped = (text: string) =>
    text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)
  const xml = strFromU8(table).replace(
    `<w:font w:name="${escaped(name)}">`,
    `<w:font w:name="${escaped(name)}"><w:altName w:val="${escaped(fallback)}"/>`,
  )
  const zippable: Zippable = {}
  for (const [path, data] of Object.entries(files)) zippable[path] = path === 'word/fontTable.xml' ? strToU8(xml) : data
  return zipSync(zippable, { level: 6 })
}
