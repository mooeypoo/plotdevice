import type { ProjectPath } from '@plotdevice/shared'
import { chaptersInOrder, type Contents } from '../manuscript/index'

export type ExportFormat = 'word' | 'pdf' | 'epub' | 'markdown'
/** "Chapter 1" and its name, or only its name. Books without chapter numbers always get the name. */
export type ChapterHeadings = 'number-and-name' | 'name'
export type PaperSize = 'a4' | 'letter'

/** What the author chose in the Export window, remembered for each book (Milestone 22). */
export interface ExportChoices {
  format: ExportFormat
  /** Word and PDF only. */
  titlePage: boolean
  /** On the title page. */
  wordCount: boolean
  headings: ChapterHeadings
  /** Word and PDF only; 1.5 lines when off. */
  doubleSpaced: boolean
  /** Word and PDF only. */
  paper: PaperSize
  /** The whole book, or chapters by file, so renaming a chapter keeps its tick. */
  chapters: 'all' | readonly ProjectPath[]
  /** E-book only: a picture on the author's computer, never copied into the book. */
  cover: string | null
}

// Regions that use US Letter, from CLDR's paper-size data; everywhere else uses A4.
const LETTER_REGIONS = new Set(['US', 'CA', 'MX', 'BZ', 'CL', 'CO', 'CR', 'GT', 'NI', 'PA', 'PH', 'PR', 'SV', 'VE'])

/**
 * The paper the author's region uses, from a region code (`US`) or a locale (`en-US`); A4 when
 * unknown. A lone lowercase code is a language (`ca` is Catalan, not Canada), so it gives A4.
 */
export function paperForRegion(locale: string | null): PaperSize {
  const [first = '', ...rest] = locale?.split(/[-_]/) ?? []
  const region = rest.length === 0 ? (/^[A-Z]{2}$/.test(first) ? first : '') : (rest.find((part) => /^[A-Za-z]{2}$/.test(part)) ?? '')
  return LETTER_REGIONS.has(region.toUpperCase()) ? 'letter' : 'a4'
}

export function defaultExportChoices(locale: string | null): ExportChoices {
  return {
    format: 'word',
    titlePage: true,
    wordCount: true,
    headings: 'number-and-name',
    doubleSpaced: true,
    paper: paperForRegion(locale),
    chapters: 'all',
    cover: null,
  }
}

/** The chapters to export: `undefined` for the whole book; remembered chapters no longer in it are dropped. */
export function chosenChapters(contents: Contents, chapters: ExportChoices['chapters']): ReadonlySet<ProjectPath> | undefined {
  if (chapters === 'all') return undefined
  const wanted = new Set(chapters)
  return new Set(chaptersInOrder(contents).flatMap((chapter) => (wanted.has(chapter.file) ? [chapter.file] : [])))
}

/** "First three", for sending a sample: the book's first chapters in reading order. */
export function firstChapters(contents: Contents, count = 3): ProjectPath[] {
  return chaptersInOrder(contents)
    .slice(0, count)
    .map((chapter) => chapter.file)
}
