// Test support for the outline reader and editor. Not exported from the package. It throws instead of
// importing Vitest, so it stays within the package's own dependency rules.
import basicEn from '../../../tests/fixtures/outlines/basic-en.md?raw'
import basicHe from '../../../tests/fixtures/outlines/basic-he.md?raw'
import bom from '../../../tests/fixtures/outlines/bom.md?raw'
import crlf from '../../../tests/fixtures/outlines/crlf.md?raw'
import deepNesting from '../../../tests/fixtures/outlines/deep-nesting.md?raw'
import embeddedBlocks from '../../../tests/fixtures/outlines/embedded-blocks.md?raw'
import emptySections from '../../../tests/fixtures/outlines/empty-sections.md?raw'
import frontmatterInvalid from '../../../tests/fixtures/outlines/frontmatter-invalid.md?raw'
import frontmatter from '../../../tests/fixtures/outlines/frontmatter.md?raw'
import indentFourSpaces from '../../../tests/fixtures/outlines/indent-four-spaces.md?raw'
import indentTabs from '../../../tests/fixtures/outlines/indent-tabs.md?raw'
import looseLists from '../../../tests/fixtures/outlines/loose-lists.md?raw'
import mixedDirection from '../../../tests/fixtures/outlines/mixed-direction.md?raw'
import mixedMarkers from '../../../tests/fixtures/outlines/mixed-markers.md?raw'
import noFinalNewline from '../../../tests/fixtures/outlines/no-final-newline.md?raw'
import noH2 from '../../../tests/fixtures/outlines/no-h2.md?raw'
import orderedAndTaskLists from '../../../tests/fixtures/outlines/ordered-and-task-lists.md?raw'
import preambleAndH3 from '../../../tests/fixtures/outlines/preamble-and-h3.md?raw'
import sectionIntroParagraphs from '../../../tests/fixtures/outlines/section-intro-paragraphs.md?raw'
import unicodeNiqqudEmoji from '../../../tests/fixtures/outlines/unicode-niqqud-emoji.md?raw'
import type { ItemPath, OutlineEdit, OutlineItemSource, ParsedOutline } from './outline-model'
import { readOutline } from './read-outline'

/** The outline fixtures as decoded text: a byte-order mark is dropped, as the file store does (ADR 0003). */
export const outlineFixtures: Record<string, string> = Object.fromEntries(
  Object.entries({
  'basic-en.md': basicEn,
  'basic-he.md': basicHe,
  'bom.md': bom,
  'crlf.md': crlf,
  'deep-nesting.md': deepNesting,
  'embedded-blocks.md': embeddedBlocks,
  'empty-sections.md': emptySections,
  'frontmatter-invalid.md': frontmatterInvalid,
  'frontmatter.md': frontmatter,
  'indent-four-spaces.md': indentFourSpaces,
  'indent-tabs.md': indentTabs,
  'loose-lists.md': looseLists,
  'mixed-direction.md': mixedDirection,
  'mixed-markers.md': mixedMarkers,
  'no-final-newline.md': noFinalNewline,
  'no-h2.md': noH2,
  'ordered-and-task-lists.md': orderedAndTaskLists,
  'preamble-and-h3.md': preambleAndH3,
  'section-intro-paragraphs.md': sectionIntroParagraphs,
  'unicode-niqqud-emoji.md': unicodeNiqqudEmoji,
  }).map(([name, text]) => [name, text.replace(/^\uFEFF/, '')]),
)

export const fixtureNames = Object.keys(outlineFixtures).sort()

export function fixture(name: string): string {
  const text = outlineFixtures[name]
  if (text === undefined) throw new Error(`no fixture ${name}`)
  return text
}

/**
 * Fixtures with one indentation style, one marker style and regular spacing: random moves and their
 * reversals must restore these byte for byte. The others must restore the same structure (Spike A).
 */
export const uniformFixtures = [
  'basic-en.md',
  'basic-he.md',
  'bom.md',
  'crlf.md',
  'deep-nesting.md',
  'empty-sections.md',
  'frontmatter.md',
  'indent-four-spaces.md',
  'indent-tabs.md',
  'mixed-direction.md',
  'no-final-newline.md',
  'unicode-niqqud-emoji.md',
]

// ---- The reference model: what every view shows, and what each edit should do to it ----

export interface ItemShape {
  id?: number
  text: string
  children: ItemShape[]
}

export interface OutlineShape {
  title: string | null
  sections: { heading: string | null; items: ItemShape[] }[]
}

export const normalizeText = (raw: string): string =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .join('\n')

export function shapeOf(outline: ParsedOutline, withIds = false): OutlineShape {
  let nextId = 0
  const item = (parsed: OutlineItemSource): ItemShape => ({ ...(withIds ? { id: nextId++ } : {}), text: normalizeText(parsed.text), children: parsed.children.map(item) })
  return {
    title: outline.title ? normalizeText(outline.title.text) : null,
    sections: outline.sections.map((section) => ({ heading: section.heading ? normalizeText(section.heading.text) : null, items: section.items.map(item) })),
  }
}

export function withoutIds(shape: OutlineShape): OutlineShape {
  const strip = ({ text, children }: ItemShape): ItemShape => ({ text, children: children.map(strip) })
  return { title: shape.title, sections: shape.sections.map((s) => ({ heading: s.heading, items: s.items.map(strip) })) }
}

function siblingsAt(shape: OutlineShape, section: number, parentPath: readonly number[]): ItemShape[] {
  let siblings = shape.sections[section]?.items
  for (const index of parentPath) siblings = siblings?.[index]?.children
  if (!siblings) throw new Error(`no container at ${section}/${parentPath.join('/')}`)
  return siblings
}

function itemAt(shape: OutlineShape, at: ItemPath) {
  const siblings = siblingsAt(shape, at.section, at.path.slice(0, -1))
  const index = at.path.at(-1) ?? -1
  const item = siblings[index]
  if (!item) throw new Error(`no item at ${at.section}/${at.path.join('/')}`)
  return { siblings, index, item }
}

/** The edit applied to the model. Reading the edited text must give the same shape (commutation). Mutates `shape`. */
export function applyToShape(shape: OutlineShape, edit: OutlineEdit): OutlineShape {
  switch (edit.kind) {
    case 'move-item': {
      const source = itemAt(shape, edit.from)
      const destination = siblingsAt(shape, edit.to.section, edit.to.parentPath) // read before the move
      source.siblings.splice(source.index, 1)
      destination.splice(edit.to.index, 0, source.item)
      break
    }
    case 'rename-item':
      itemAt(shape, edit.at).item.text = normalizeText(edit.text)
      break
    case 'add-item':
      siblingsAt(shape, edit.to.section, edit.to.parentPath).splice(edit.to.index, 0, { text: normalizeText(edit.text), children: [] })
      break
    case 'delete-item': {
      const { siblings, index } = itemAt(shape, edit.at)
      siblings.splice(index, 1)
      break
    }
    case 'rename-section': {
      const section = shape.sections[edit.section]
      if (!section) throw new Error(`no section ${edit.section}`)
      section.heading = normalizeText(edit.text)
      break
    }
    case 'add-section':
      shape.sections.splice(edit.index, 0, { heading: normalizeText(edit.text), items: [] })
      break
    case 'move-section': {
      const [moved] = shape.sections.splice(edit.section, 1)
      if (!moved) throw new Error(`no section ${edit.section}`)
      shape.sections.splice(edit.index, 0, moved)
      break
    }
    case 'delete-section':
      shape.sections.splice(edit.section, 1)
      break
    case 'set-title':
      shape.title = normalizeText(edit.text)
      break
  }
  // The unnamed section exists only while it holds cards.
  shape.sections = shape.sections.filter((section) => section.heading !== null || section.items.length > 0)
  return shape
}

export function pathOfId(shape: OutlineShape, id: number): ItemPath | null {
  const search = (items: ItemShape[], prefix: number[]): number[] | null => {
    for (const [index, item] of items.entries()) {
      if (item.id === id) return [...prefix, index]
      const found = search(item.children, [...prefix, index])
      if (found) return found
    }
    return null
  }
  for (const [section, { items }] of shape.sections.entries()) {
    const path = search(items, [])
    if (path) return { section, path }
  }
  return null
}

// ---- Locating and preserving ----

export interface LocatedItem {
  item: OutlineItemSource
  section: number
  path: number[]
}

export function allItems(outline: ParsedOutline): LocatedItem[] {
  const found: LocatedItem[] = []
  const visit = (items: OutlineItemSource[], section: number, prefix: number[]): void => {
    for (const [index, item] of items.entries()) {
      found.push({ item, section, path: [...prefix, index] })
      visit(item.children, section, [...prefix, index])
    }
  }
  for (const [section, { items }] of outline.sections.entries()) visit(items, section, [])
  return found
}

/** Text the views don't edit: frontmatter, title, intros, preamble and every kept block. It must survive. */
export function keptTexts(outline: ParsedOutline): string[] {
  const texts: string[] = []
  const add = (start: number, end: number): void => void texts.push(normalizeText(outline.source.slice(start, end)))
  if (outline.frontmatter) add(outline.frontmatter.range.start, outline.frontmatter.range.end)
  if (outline.title) add(outline.title.lineRange.start, outline.title.lineRange.end)
  for (const block of outline.preamble) add(block.range.start, block.range.end)
  for (const section of outline.sections) for (const range of [...section.intro, ...section.kept.map((b) => b.range)]) add(range.start, range.end)
  for (const { item } of allItems(outline)) for (const block of item.kept) add(block.range.start, block.range.end)
  return texts.sort()
}

/** The kept text inside an item and its details: what deleting it removes, by definition. */
export function keptTextsInside(source: string, item: OutlineItemSource): string[] {
  return [...item.kept.map((block) => normalizeText(source.slice(block.range.start, block.range.end))), ...item.children.flatMap((child) => keptTextsInside(source, child))]
}

const nonBlank = (lines: string[]): string[] => lines.filter((line) => line.trim() !== '')
const stripMarker = (line: string): string => line.trim().replace(/^(?:[-+*]|\d{1,9}[.)])[ \t]*/, '')
// Renumbering a list's first item is a legitimate edit outside the moved lines (finding 6).
const ignoreListNumbers = (line: string): string => line.replace(/^([ \t]*)\d{1,9}([.)])/, '$1#$2')

/**
 * Locality for a move: every non-blank line outside the moved block is byte-identical and in the same
 * order. Inside the block, only indentation and the first line's marker may change. Returns whether it holds.
 */
export function moveIsLocal(before: string, moved: OutlineItemSource, after: string): boolean {
  const all = (before.endsWith('\n') ? before : before + '\n').split('\n')
  const startLine = before.slice(0, moved.lineRange.start).split('\n').length - 1
  const blockLines = before.slice(moved.lineRange.start, moved.lineRange.end).replace(/\n$/, '').split('\n')
  const outside = nonBlank([...all.slice(0, startLine), ...all.slice(startLine + blockLines.length)]).map(ignoreListNumbers)
  const expectedBlock = blockLines.map((line, i) => (i === 0 ? stripMarker(line) : line.trim())).join('\n')
  const result = after.split('\n')
  for (let i = 0; i + blockLines.length <= result.length; i++) {
    const candidate = result.slice(i, i + blockLines.length).map((line, j) => (j === 0 ? stripMarker(line) : line.trim()))
    if (candidate.join('\n') !== expectedBlock) continue
    const rest = nonBlank([...result.slice(0, i), ...result.slice(i + blockLines.length)]).map(ignoreListNumbers)
    if (rest.join('\n') === outside.join('\n')) return true
  }
  return false
}

export const nonBlankLines = (text: string): string[] => nonBlank(text.split('\n')).map(ignoreListNumbers)

/** Mulberry32: a tiny deterministic generator, so random tests replay identically. */
export function seededRandom(seed: number): (limit: number) => number {
  let state = seed >>> 0
  return (limit) => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * limit)
  }
}

export const read = (source: string): ParsedOutline => readOutline(source)
