import { countWords } from '../compile/word-count'
import { authorLine, chapterLine, isSceneBreakText, partLine } from './chapter-lines'

/** A paragraph of a Word manuscript, with what Word says about it (Milestone 23). */
export interface ManuscriptParagraph {
  /** The paragraph's text, with line breaks as `\n`. */
  text: string
  /** 1–6 for Word's heading styles, 0 otherwise. */
  heading: number
  /** Word's Title style. */
  title: boolean
  /** A page break comes just before it. */
  pageBreakBefore: boolean
}

export type SplitBy = 'headings' | 'chapter-lines' | 'page-breaks'

/** What the author changed in the preview; every chapter is known by the paragraph it starts at. */
export interface SplitEdits {
  /** Paragraphs that start a chapter ("＋ New chapter here"). */
  starts?: readonly number[]
  /** Chapters joined to the one above. */
  joins?: readonly number[]
  names?: Readonly<Record<number, string>>
  /** Chapters left out (unticked). */
  leftOut?: readonly number[]
}

export interface PlannedChapter {
  /** The paragraph it starts at: how the preview names it. */
  start: number
  part: string | null
  name: string
  /** The paragraphs of its text, in order: its heading and name lines aren't among them. */
  body: number[]
  words: number
  included: boolean
}

export interface ImportPlan {
  split: SplitBy
  chapters: PlannedChapter[]
  /** The title page: everything before the first chapter. It isn't imported. */
  frontMatter: number[]
  /** From the title page, to fill in the book's details. */
  title: string | null
  author: string | null
}

interface Marker {
  index: number
  kind: 'chapter' | 'part'
  name: string
  /** Paragraphs the marker uses up: its heading, and a name line below a bare number. */
  uses: number[]
}

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim()
const isBlank = (paragraph: ManuscriptParagraph | undefined) => paragraph === undefined || paragraph.text.trim() === ''

/** The first words of a paragraph, to name a chapter that has no heading. */
function firstWords(text: string): string {
  const words = oneLine(text).split(/\s+/)
  return words.length <= 6 ? words.join(' ') : `${words.slice(0, 6).join(' ')}…`
}

/** A short line that can be a chapter's name: no sentence ending, a few words, not itself a marker. */
function isNameLine(paragraph: ManuscriptParagraph): boolean {
  const text = oneLine(paragraph.text)
  return (
    text !== '' &&
    text.split(/\s+/).length <= 8 &&
    !/[.!?…,;"”„]$/.test(text) &&
    !isSceneBreakText(text) &&
    chapterLine(text) === null &&
    partLine(text) === null
  )
}

/** A chapter's name from its opening line; a bare number takes the short line below it, if there is one. */
function chapterMarker(paragraphs: readonly ManuscriptParagraph[], index: number, headingLevel: number | null): Marker {
  const paragraph = paragraphs[index] as ManuscriptParagraph
  const line = chapterLine(paragraph.text)
  if (line && line.name !== '') return { index, kind: 'chapter', name: line.name, uses: [index] }
  if (line) {
    let next = index + 1
    while (next < paragraphs.length && isBlank(paragraphs[next])) next++
    const below = paragraphs[next]
    const fits =
      below !== undefined &&
      !below.pageBreakBefore &&
      (headingLevel === null ? below.heading === 0 : below.heading > headingLevel || below.heading === 0)
    if (below && fits && isNameLine(below)) return { index, kind: 'chapter', name: oneLine(below.text), uses: [index, next] }
  }
  return { index, kind: 'chapter', name: oneLine(paragraph.text), uses: [index] }
}

function headingMarkers(paragraphs: readonly ManuscriptParagraph[]): Marker[] {
  const headings = paragraphs.flatMap((p, index) => (p.heading > 0 && !p.title && !isBlank(p) ? [{ index, level: p.heading }] : []))
  const levels = [...new Set(headings.map((h) => h.level))].sort((a, b) => a - b)
  const [top, next] = levels
  if (top === undefined) return []
  const tops = headings.filter((h) => h.level === top)
  // The bigger headings are parts only when each opens straight onto a chapter heading.
  const opensOnto = (index: number) => {
    let after = index + 1
    while (after < paragraphs.length && isBlank(paragraphs[after])) after++
    return paragraphs[after]?.heading === next
  }
  const partsLevel =
    next !== undefined && tops.length <= headings.filter((h) => h.level === next).length && tops.every((h) => opensOnto(h.index))
      ? top
      : null
  const chapterLevel = partsLevel === null ? top : (next as number)
  const markers: Marker[] = []
  for (const { index, level } of headings) {
    const text = (paragraphs[index] as ManuscriptParagraph).text
    if (level === partsLevel || (level === chapterLevel && partLine(text) && !chapterLine(text)))
      markers.push({ index, kind: 'part', name: oneLine(text), uses: [index] })
    else if (level === chapterLevel && !markers.some((m) => m.uses.includes(index)))
      markers.push(chapterMarker(paragraphs, index, chapterLevel))
  }
  return markers
}

function lineMarkers(paragraphs: readonly ManuscriptParagraph[]): Marker[] {
  const markers: Marker[] = []
  paragraphs.forEach((paragraph, index) => {
    if (markers.some((m) => m.uses.includes(index))) return
    if (chapterLine(paragraph.text)) markers.push(chapterMarker(paragraphs, index, null))
    else if (partLine(paragraph.text) && oneLine(paragraph.text).split(/\s+/).length <= 8)
      markers.push({ index, kind: 'part', name: oneLine(paragraph.text), uses: [index] })
  })
  return markers
}

function pageMarkers(paragraphs: readonly ManuscriptParagraph[]): Marker[] {
  const firsts = paragraphs.flatMap((p, index) => (index === 0 || p.pageBreakBefore ? [index] : []))
  const markers: Marker[] = []
  firsts.forEach((first, k) => {
    const end = firsts[k + 1] ?? paragraphs.length
    let index = first
    while (index < end && isBlank(paragraphs[index])) index++
    if (index >= end) return
    const paragraph = paragraphs[index] as ManuscriptParagraph
    const pageIsOnlyAPart =
      partLine(paragraph.text) && !chapterLine(paragraph.text) && paragraphs.slice(index + 1, end).every((p) => isBlank(p))
    if (pageIsOnlyAPart) markers.push({ index, kind: 'part', name: oneLine(paragraph.text), uses: [index] })
    else if (chapterLine(paragraph.text) || paragraph.heading > 0) markers.push(chapterMarker(paragraphs, index, paragraph.heading || null))
    else markers.push({ index, kind: 'chapter', name: firstWords(paragraph.text), uses: [] })
  })
  // A title page: a first page of a few short lines that aren't sentences (or Word's Title style), with more pages after it.
  const first = markers[0]
  if (first?.kind === 'chapter' && markers.length > 1) {
    const end = markers[1]?.index ?? paragraphs.length
    const page = paragraphs.slice(first.index, end).filter((p) => !isBlank(p))
    const titleLike = (p: ManuscriptParagraph) =>
      authorLine(p.text) !== null || (oneLine(p.text).split(/\s+/).length <= 8 && !/[.!?…]["”]?$/.test(oneLine(p.text)))
    if (page.some((p) => p.title) || (page.length <= 6 && page.every(titleLike))) markers.shift()
  }
  return markers
}

const MARKERS: Record<SplitBy, (paragraphs: readonly ManuscriptParagraph[]) => Marker[]> = {
  headings: headingMarkers,
  'chapter-lines': lineMarkers,
  'page-breaks': pageMarkers,
}

/**
 * How a Word manuscript becomes parts and chapters (Milestone 23): split by its headings, its
 * "Chapter" lines or its page breaks, then changed by the author in the preview. Everything before
 * the first chapter is the title page, which isn't imported but gives the book's title and author.
 */
export function splitManuscript(paragraphs: readonly ManuscriptParagraph[], split: SplitBy, edits: SplitEdits = {}): ImportPlan {
  const found = MARKERS[split](paragraphs)
  const used = new Set(found.flatMap((m) => m.uses))
  // The first chapter has no chapter above it to join.
  const firstFound = found.find((m) => m.kind === 'chapter')?.index
  const joins = new Set((edits.joins ?? []).filter((index) => index !== firstFound))
  let markers = found.filter((m) => !(m.kind === 'chapter' && joins.has(m.index)))
  // A joined chapter's heading stays, as text in the chapter above.
  for (const m of found) if (m.kind === 'chapter' && joins.has(m.index)) for (const index of m.uses) used.delete(index)

  // Nothing to split by: the whole text after a title line and byline is one chapter, named after the book.
  let implicit: Marker | null = null
  if (!markers.some((m) => m.kind === 'chapter')) {
    let index = leadingFrontMatter(paragraphs)
    while (index < paragraphs.length && (isBlank(paragraphs[index]) || used.has(index))) index++
    if (index < paragraphs.length) markers.push((implicit = { index, kind: 'chapter', name: '', uses: [] }))
  }
  const frontEnd = markers.find((m) => m.kind === 'chapter')?.index ?? paragraphs.length
  const isFront = (index: number) => index < frontEnd && !markers.some((m) => m.index === index && m.kind === 'part')
  for (const start of edits.starts ?? []) {
    const paragraph = paragraphs[start]
    if (!paragraph || isBlank(paragraph) || used.has(start) || isFront(start) || markers.some((m) => m.index === start)) continue
    markers.push({ index: start, kind: 'chapter', name: firstWords(paragraph.text), uses: [] })
  }
  markers = markers.sort((a, b) => a.index - b.index)
  // A part with no chapter after it (its chapters were joined away) isn't a part: its line stays as text.
  markers = markers.filter((marker, k) => {
    if (marker.kind !== 'part') return true
    const next = markers.slice(k + 1).find((m) => m.kind === 'chapter' || m.kind === 'part')
    if (next?.kind === 'chapter') return true
    for (const index of marker.uses) used.delete(index)
    return false
  })

  const frontMatter = paragraphs.flatMap((p, index) => (isFront(index) && !isBlank(p) && !used.has(index) ? [index] : []))
  const titleParagraph = frontMatter.map((i) => paragraphs[i] as ManuscriptParagraph).find((p) => p.title)
  const author = frontMatter.map((i) => authorLine((paragraphs[i] as ManuscriptParagraph).text)).find((name) => name !== null) ?? null
  const firstLine = frontMatter.map((i) => oneLine((paragraphs[i] as ManuscriptParagraph).text)).find((text) => authorLine(text) === null)
  const title = titleParagraph ? oneLine(titleParagraph.text) : (firstLine ?? null)

  const leftOut = new Set(edits.leftOut ?? [])
  const chapters: PlannedChapter[] = []
  let part: string | null = null
  if (implicit) implicit.name = title ?? firstWords((paragraphs[implicit.index] as ManuscriptParagraph).text)
  markers.forEach((marker, k) => {
    if (marker.kind === 'part') {
      part = marker.name
      return
    }
    const end = markers[k + 1]?.index ?? paragraphs.length
    const body: number[] = []
    for (let index = marker.index; index < end; index++) if (!isBlank(paragraphs[index]) && !used.has(index)) body.push(index)
    chapters.push(planned(paragraphs, marker.index, part, marker.name, body, edits, leftOut))
  })
  return { split, chapters, frontMatter, title, author }
}

function planned(
  paragraphs: readonly ManuscriptParagraph[],
  start: number,
  part: string | null,
  name: string,
  body: number[],
  edits: SplitEdits,
  leftOut: ReadonlySet<number>,
): PlannedChapter {
  const words = body.reduce((sum, index) => {
    const text = (paragraphs[index] as ManuscriptParagraph).text
    return isSceneBreakText(text) ? sum : sum + countWords(text)
  }, 0)
  const renamed = edits.names?.[start]?.trim()
  return { start, part, name: renamed || name, body, words, included: !leftOut.has(start) }
}

/** With nothing to split by, only a Title-style line and a byline at the start are the title page. */
function leadingFrontMatter(paragraphs: readonly ManuscriptParagraph[]): number {
  let index = 0
  while (
    index < paragraphs.length &&
    (isBlank(paragraphs[index]) || paragraphs[index]?.title || authorLine(paragraphs[index]?.text ?? '') !== null)
  )
    index++
  return index
}

/** How to split, as Plot Device first guesses: headings, then "Chapter" lines, then page breaks. */
export function chooseSplit(paragraphs: readonly ManuscriptParagraph[]): SplitBy {
  for (const split of ['headings', 'chapter-lines', 'page-breaks'] as const)
    if (splitManuscript(paragraphs, split).chapters.length > 1) return split
  return 'headings'
}
