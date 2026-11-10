import type { ProjectFolders, ProjectSnapshot } from '@plotdevice/application'
import {
  bookOutline,
  compiledBook,
  countWords,
  directionOfLanguage,
  naturalDirection,
  type ChapterHeadings,
  type Direction,
  type DirectionMode,
} from '@plotdevice/domain'
import type { ExportedBook, ExportedEntry } from '@plotdevice/export'
import { formatScalar, plainTextOf, readChapterForExport, splitFrontmatter, type ExportBlock } from '@plotdevice/markdown'
import type { ProjectPath } from '@plotdevice/shared'

export interface CompiledText {
  /** One Markdown file: Pandoc metadata, then parts and chapters in reading order. */
  text: string
  /** Chapters in the contents that couldn't be read; reported, never silently left out. */
  missing: ProjectPath[]
}

export interface MarkdownExport {
  /** The chapters to export, or `undefined` for the whole book. */
  chapters?: ReadonlySet<ProjectPath> | undefined
  /** With `chapterLabel`, chapters are headed "Chapter 3: The Crossing" or by name only (Milestone 22). */
  headings?: ChapterHeadings
  chapterLabel?: (number: number) => string
}

/**
 * The whole book as one Markdown file (Milestone 6, decision 4). Chapter text is kept as written,
 * direction markers included, which Pandoc understands; chapter frontmatter is left out. The result
 * is a new file, so it uses `\n` line endings throughout. Nothing in the project is changed. The Export
 * window (Milestone 22) can choose chapters, and head them with the book's word for chapters.
 */
export async function compileManuscript(
  folders: ProjectFolders,
  snapshot: ProjectSnapshot,
  options: MarkdownExport = {},
): Promise<CompiledText> {
  const store = folders.open(snapshot.root)
  const { details } = snapshot
  const titles = new Map(snapshot.chapters.flatMap((chapter) => (chapter.title ? [[chapter.file, chapter.title] as const] : [])))
  const metadata = [
    `title: ${formatScalar(details.title)}`,
    ...(details.author ? [`author: ${formatScalar(details.author)}`] : []),
    `lang: ${formatScalar(details.language)}`,
    ...(directionOfLanguage(details.language) === 'rtl' ? ['dir: rtl'] : []),
  ]
  const blocks: string[] = [`---\n${metadata.join('\n')}\n---`]
  const missing: ProjectPath[] = []
  const { chapterLabel } = options
  const entries =
    chapterLabel === undefined && options.chapters === undefined
      ? compiledBook(snapshot.contents, details.chapterNumbering, titles)
      : bookOutline(snapshot.contents, details.chapterNumbering, titles, options.chapters).map((entry) =>
          entry.kind === 'part'
            ? { kind: 'part' as const, heading: `# ${escapeHeading(entry.name)}` }
            : {
                kind: 'chapter' as const,
                file: entry.file,
                heading: `## ${
                  entry.number === null
                    ? ''
                    : chapterLabel === undefined
                      ? `${entry.number}. `
                      : options.headings === 'name'
                        ? ''
                        : `${chapterLabel(entry.number)}: `
                }${escapeHeading(entry.name)}`,
              },
        )
  for (const entry of entries) {
    if (entry.kind === 'part') {
      blocks.push(entry.heading)
      continue
    }
    const read = await store.read(entry.file)
    if (!read.ok) {
      missing.push(entry.file)
      continue
    }
    const body = splitFrontmatter(read.value.text).body.replace(/\r\n?/g, '\n').trim()
    blocks.push(body === '' ? entry.heading : `${entry.heading}\n\n${body}`)
  }
  return { text: `${blocks.join('\n\n')}\n`, missing }
}

const escapeHeading = (text: string): string => text.replace(/^#/, '\\#')

export interface ExportReading {
  /** The chapters to export, or `undefined` for the whole book. */
  chapters: ReadonlySet<ProjectPath> | undefined
  headings: ChapterHeadings
  /** The author's setting for paragraphs without a direction mark (ADR 0004). */
  directionMode: DirectionMode
  /** "Chapter 3", in the book's language and its word for chapters. */
  chapterLabel: (number: number) => string
  /** When the file is made, as an ISO date and time. */
  made: string
}

export interface BookForExport {
  book: ExportedBook
  /** Words in the whole book, whatever chapters are chosen. */
  wordCount: number
  /** Chosen chapters in the contents that couldn't be read; reported, never silently left out. */
  missing: ProjectPath[]
}

/**
 * The book read for export (Milestone 22): the chosen chapters as blocks, every paragraph's direction
 * resolved as the editor shows it, headings as the author chose, and the whole book's word count.
 * Nothing in the project is changed.
 */
export async function readBookForExport(
  folders: ProjectFolders,
  snapshot: ProjectSnapshot,
  reading: ExportReading,
): Promise<BookForExport> {
  const store = folders.open(snapshot.root)
  const { details } = snapshot
  const direction = directionOfLanguage(details.language)
  const titles = new Map(snapshot.chapters.flatMap((chapter) => (chapter.title ? [[chapter.file, chapter.title] as const] : [])))
  const chosen = reading.chapters
  const entries: ExportedEntry[] = []
  const missing: ProjectPath[] = []
  let wordCount = 0
  for (const entry of bookOutline(snapshot.contents, details.chapterNumbering, titles)) {
    if (entry.kind === 'part') {
      entries.push(entry)
      continue
    }
    const wanted = chosen === undefined || chosen.has(entry.file)
    const read = await store.read(entry.file)
    if (!read.ok) {
      if (wanted) missing.push(entry.file)
      continue
    }
    const blocks = readChapterForExport(splitFrontmatter(read.value.text).body)
    wordCount += countWords(plainTextOf(blocks))
    if (!wanted) continue
    const label = entry.number !== null && reading.headings === 'number-and-name' ? reading.chapterLabel(entry.number) : null
    const chapter = snapshot.chapters.find((c) => c.file === entry.file)
    const poem = chapter?.form === 'poem'
    // An untitled poem is known by its first line, and has no heading (ADR 0013).
    const untitled = poem && chapter.title === ''
    entries.push({
      kind: 'chapter',
      label,
      name: untitled ? (chapter.firstLine ?? entry.name) : entry.name,
      ...(poem ? { poem: true } : {}),
      ...(untitled ? { untitled: true } : {}),
      blocks: blocks.map((block) => resolveDirection(block, reading.directionMode, direction)),
    })
  }
  return {
    book: {
      title: details.title,
      author: details.author?.trim() ? details.author.trim() : null,
      language: details.language,
      direction,
      id: details.id ?? details.title,
      made: reading.made,
      entries: keepChosenParts(entries, chosen !== undefined),
    },
    wordCount,
    missing,
  }
}

/** Without a mark, a block takes its direction as the editor shows it: the book's, or its own first letters'. */
function resolveDirection(block: ExportBlock, mode: DirectionMode, book: Direction): ExportBlock {
  if (block.type === 'scene-break') return block
  const direction = block.direction ?? naturalDirection(plainTextOf([block]), mode, book)
  if (block.type === 'quote')
    return { ...block, direction, children: block.children.map((child) => resolveDirection(child, mode, direction)) }
  if (block.type === 'list')
    return { ...block, direction, items: block.items.map((item) => item.map((child) => resolveDirection(child, mode, direction))) }
  return { ...block, direction }
}

/** With chosen chapters, a part stays only when one of its chapters is exported. */
function keepChosenParts(entries: ExportedEntry[], chosen: boolean): ExportedEntry[] {
  if (!chosen) return entries
  return entries.filter((entry, index) => {
    if (entry.kind !== 'part') return true
    const next = entries[index + 1]
    return next !== undefined && next.kind === 'chapter'
  })
}
