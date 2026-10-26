import { err, ok, type Result } from '@plotdevice/shared'
import type {
  ItemDestination,
  ItemPath,
  ListMarker,
  OutlineEdit,
  OutlineItemSource,
  OutlineRefusal,
  ParsedOutline,
  TextRange,
} from './outline-model'
import { readOutline } from './read-outline'
import { blankRunBefore, indentColumns, isBlankLineAt, lineEndingOf, lineStartAt, splitKeepingEndings, type Splice } from './text'

export interface OutlineEditOptions {
  /**
   * One level of nesting, for when the file no longer shows any (everything was moved to the top
   * level). The app remembers it from when the outline was opened. Defaults to two spaces.
   */
  nestingUnit?: string
  /**
   * The outline already read from this exact text, to skip reading it again (a 2,000-card outline
   * takes about 300 ms). Used only if its source is the text being edited; otherwise ignored.
   */
  parsed?: ParsedOutline
}

/**
 * Applies one edit to an outline as splices on its text (ADR 0003): everything outside the touched
 * lines keeps its exact bytes. An edit that can't be applied safely is refused with a reason, never
 * applied lossily. Moving an item to where it already is changes nothing.
 */
export function editOutline(source: string, edit: OutlineEdit, options: OutlineEditOptions = {}): Result<string, OutlineRefusal> {
  // Work on text that ends with a line ending, so every item owns whole lines; then restore the
  // file's "no final newline" if it had one.
  const eol = lineEndingOf(source)
  const hasFinalNewline = source === '' || source.endsWith('\n')
  const work = hasFinalNewline ? source : source + eol
  const parsed = options.parsed?.source === work ? options.parsed : readOutline(work)
  const outline = { ...parsed, nestingUnit: parsed.nestingUnit ?? options.nestingUnit ?? '  ' }
  const splices = planSplices(outline, edit, eol)
  if (!splices.ok) return splices
  const edited = applySafely(work, splices.value)
  return ok(hasFinalNewline || !edited.endsWith(eol) ? edited : edited.slice(0, -eol.length))
}

type Outline = ParsedOutline & { nestingUnit: string }

const isMultiline = (text: string): boolean => /[\r\n]/.test(text)

function planSplices(outline: Outline, edit: OutlineEdit, eol: string): Result<Splice[], OutlineRefusal> {
  const text = outline.source
  switch (edit.kind) {
    case 'move-item': {
      const item = findItem(outline, edit.from)
      if (!item.ok) return item
      if (!item.value.movable) return err('unmovable-item')
      if (isSamePosition(edit.from, edit.to)) return ok([])
      const destination = planInsertion(outline, edit.to, item.value, eol)
      if (!destination.ok) return destination
      const { indent, marker, before, after, at } = destination.value
      const block = rebaseBlock(text.slice(item.value.lineRange.start, item.value.lineRange.end), item.value, indent, marker)
      return ok([...removalSplices(text, item.value), { start: at, end: at, text: before + block + after }])
    }
    case 'delete-item': {
      const item = findItem(outline, edit.at)
      if (!item.ok) return item
      return item.value.movable ? ok(removalSplices(text, item.value)) : err('unmovable-item')
    }
    case 'add-item': {
      if (isMultiline(edit.text)) return err('multiline-text')
      const destination = planInsertion(outline, edit.to, null, eol)
      if (!destination.ok) return destination
      const { indent, marker, before, after, at } = destination.value
      return ok([{ start: at, end: at, text: `${before}${indent}${markerText(marker)} ${escapeLineStart(edit.text)}${eol}${after}` }])
    }
    case 'rename-item': {
      if (isMultiline(edit.text)) return err('multiline-text')
      const item = findItem(outline, edit.at)
      if (!item.ok) return item
      const { textRange } = item.value
      const needsSpace = textRange.start > 0 && !/[ \t]/.test(text[textRange.start - 1] ?? '')
      return ok([{ ...textRange, text: (needsSpace ? ' ' : '') + escapeLineStart(edit.text) }])
    }
    case 'rename-section': {
      if (isMultiline(edit.text)) return err('multiline-text')
      const section = outline.sections[edit.section]
      if (!section) return err('no-such-section')
      if (!section.heading) return err('unnamed-section')
      return renameHeading(text, section.heading, edit.text)
    }
    case 'add-section': {
      if (isMultiline(edit.text)) return err('multiline-text')
      if (edit.index < 0 || edit.index > outline.sections.length) return err('index-out-of-range')
      const target = outline.sections[edit.index]
      if (target) {
        // A heading above the unnamed section would capture its cards.
        if (!target.heading) return err('unnamed-section')
        return ok([{ start: target.range.start, end: target.range.start, text: `## ${edit.text}${eol}${eol}` }])
      }
      return ok([{ start: text.length, end: text.length, text: `${endsWithBlankLine(text) ? '' : eol}## ${edit.text}${eol}` }])
    }
    case 'move-section':
      return moveSection(outline, edit.section, edit.index, eol)
    case 'delete-section': {
      const section = outline.sections[edit.section]
      if (!section) return err('no-such-section')
      if (!section.heading) return err('unnamed-section')
      const isLast = edit.section === outline.sections.length - 1
      // The last section takes the blank lines before it along, so the file doesn't end in a gap.
      const start = isLast ? blankRunBefore(text, section.range.start) : section.range.start
      return ok([{ start, end: section.range.end, text: '' }])
    }
    case 'set-title': {
      if (isMultiline(edit.text)) return err('multiline-text')
      if (outline.title) return renameHeading(text, outline.title, edit.text)
      const at = outline.frontmatter?.range.end ?? 0
      return ok([{ start: at, end: at, text: `# ${edit.text}${eol}${at < text.length ? eol : ''}` }])
    }
  }
}

function renameHeading(
  text: string,
  heading: { textRange: TextRange; lineRange: TextRange },
  name: string,
): Result<Splice[], OutlineRefusal> {
  if (
    text
      .slice(heading.lineRange.start, heading.lineRange.end)
      .replace(/\r?\n$/, '')
      .includes('\n')
  )
    return err('multiline-heading')
  return ok([{ ...heading.textRange, text: name }])
}

/** Moves a whole section, heading and everything under it, before the section now at `index` among the others. */
function moveSection(outline: Outline, from: number, index: number, eol: string): Result<Splice[], OutlineRefusal> {
  const text = outline.source
  const section = outline.sections[from]
  if (!section) return err('no-such-section')
  const others = outline.sections.filter((_, i) => i !== from)
  if (index < 0 || index > others.length) return err('index-out-of-range')
  if (index === from) return ok([])
  // The unnamed section, when there is one, is always first: it has no heading to move with, and
  // nothing can go above it.
  if (!section.heading || (index === 0 && others[0]?.heading === null)) return err('unnamed-section')

  const block = text.slice(section.range.start, section.range.end)
  // Moving the last section takes the blank lines before it along, so the file doesn't end in a gap.
  const removalStart = from === outline.sections.length - 1 ? blankRunBefore(text, section.range.start) : section.range.start
  const removal = { start: removalStart, end: section.range.end, text: '' }
  const target = others[index]
  if (target) {
    const separated = endsWithBlankLine(block) ? block : block.endsWith('\n') ? block + eol : block + eol + eol
    return ok([removal, { start: target.range.start, end: target.range.start, text: separated }])
  }
  // To the end: the section that used to end the file may lack a blank line before the moved one.
  const last = others.at(-1)
  const lead = last && !endsWithBlankLine(text.slice(last.range.start, last.range.end)) ? eol : ''
  return ok([removal, { start: text.length, end: text.length, text: lead + block.replace(/(?:\r?\n)+$/, '') + eol }])
}

const endsWithBlankLine = (text: string): boolean => text === '' || /\n[ \t]*\r?\n$/.test(text)

interface Insertion {
  at: number
  indent: string
  marker: ListMarker
  before: string
  after: string
}

function planInsertion(
  outline: Outline,
  to: ItemDestination,
  moving: OutlineItemSource | null,
  eol: string,
): Result<Insertion, OutlineRefusal> {
  const section = outline.sections[to.section]
  if (!section) return err('no-such-section')

  let parent: OutlineItemSource | null = null
  if (to.parentPath.length > 0) {
    const found = findItem(outline, { section: to.section, path: to.parentPath })
    if (!found.ok) return found
    parent = found.value
    if (!parent.movable) return err('unmovable-item')
    if (moving && contains(moving, parent)) return err('into-own-subtree')
  }

  const siblings = (parent ? parent.children : section.items).filter((item) => item !== moving)
  if (to.index < 0 || to.index > siblings.length) return err('index-out-of-range')
  const fallbackMarker: ListMarker = moving ? freshMarker(moving.marker) : { kind: 'bullet', char: '-' }

  const next = siblings[to.index]
  if (next) {
    // Copy the spacing actually used before `next`: one list can mix tight and loose items.
    const spaced =
      to.index > 0 && next.lineRange.start > 0 && isBlankLineAt(outline.source, lineStartAt(outline.source, next.lineRange.start - 1))
    return ok({ at: next.lineRange.start, indent: next.indent, marker: markerLike(next.marker, 0), before: '', after: spaced ? eol : '' })
  }
  const previous = siblings.at(-1)
  if (previous)
    return ok({
      at: previous.lineRange.end,
      indent: previous.indent,
      marker: markerLike(previous.marker, 1),
      before: previous.listIsLoose ? eol : '',
      after: '',
    })
  if (parent) return ok({ at: parent.lineRange.end, indent: childIndent(outline, parent), marker: fallbackMarker, before: '', after: '' })
  return ok({ at: section.contentEnd, indent: '', marker: fallbackMarker, before: eol, after: '' })
}

/**
 * Removing the first item of a numbered list hands its number to the next item. Only a list numbered
 * `1.` may interrupt a paragraph in CommonMark, so a nested list left starting at `2.` would silently
 * become part of its parent's text (Spike A, finding 6).
 */
function removalSplices(text: string, item: OutlineItemSource): Splice[] {
  const splices: Splice[] = [{ ...removalRange(text, item), text: '' }]
  const next = item.nextInList
  if (item.isFirstInList && next && item.marker.kind === 'ordered' && next.marker.kind === 'ordered') {
    const start = next.lineRange.start + next.indent.length
    splices.push({ start, end: start + String(next.marker.number).length, text: String(item.marker.number) })
  }
  return splices
}

/** With blank lines on both sides (a loose list, or a section's only card), the blank lines before it go too. */
function removalRange(text: string, item: OutlineItemSource): TextRange {
  const { start, end } = item.lineRange
  const blankAfter = end >= text.length || isBlankLineAt(text, end)
  const blankStart = blankRunBefore(text, start)
  return { start: blankAfter && blankStart < start ? blankStart : start, end }
}

/**
 * Moves an item's lines to a new indentation and marker. Only the leading indentation changes:
 * nested lines shift by the same prefix, so tabs, extra spaces and code-block indentation survive.
 */
function rebaseBlock(block: string, item: OutlineItemSource, indent: string, marker: ListMarker): string {
  const [first = '', ...rest] = splitKeepingEndings(block)
  const oldMarker = markerText(item.marker)
  const newMarker = markerText(marker)
  const markerShift = newMarker.length - oldMarker.length
  const contentColumn = indentColumns(item.indent) + oldMarker.length + item.gap.length
  const head = indent + newMarker + first.slice(item.indent.length + oldMarker.length)
  const shifted = rest.map((line) => {
    const leading = /^[ \t]*/.exec(line)?.[0] ?? ''
    // Lazy continuation lines (indented less than the content) and blank lines are left alone.
    if (/^[ \t]*\r?\n?$/.test(line) || !line.startsWith(item.indent) || indentColumns(leading) < contentColumn) return line
    const body = line.slice(item.indent.length)
    if (markerShift > 0) return indent + ' '.repeat(markerShift) + body
    if (markerShift < 0) return indent + body.replace(new RegExp(`^ {0,${-markerShift}}`), '')
    return indent + body
  })
  return head + shifted.join('')
}

function childIndent(outline: Outline, parent: OutlineItemSource): string {
  const contentWidth = markerText(parent.marker).length + parent.gap.length
  const unit = outline.nestingUnit
  // A unit narrower than the parent's marker (two spaces under `10. `) would not nest.
  return parent.indent + (unit.includes('\t') || unit.length >= contentWidth ? unit : ' '.repeat(contentWidth))
}

const markerText = (marker: ListMarker): string => (marker.kind === 'bullet' ? marker.char : `${marker.number}${marker.delimiter}`)

/** A marker that keeps the destination list whole: a different bullet character would start a new list. */
const markerLike = (neighbor: ListMarker, numberOffset: number): ListMarker =>
  neighbor.kind === 'bullet' ? neighbor : { ...neighbor, number: neighbor.number + numberOffset }

const freshMarker = (marker: ListMarker): ListMarker => (marker.kind === 'bullet' ? marker : { ...marker, number: 1 })

/** Text that would turn into block syntax at the start of a line is escaped. */
function escapeLineStart(text: string): string {
  return /^(?:#{1,6}(?:[ \t]|$)|>|[-+*](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$)|\[[ xX]\]|`{3}|~{3})/.test(text) ? `\\${text}` : text
}

function isSamePosition(from: ItemPath, to: ItemDestination): boolean {
  const parentPath = from.path.slice(0, -1)
  return (
    from.section === to.section &&
    parentPath.length === to.parentPath.length &&
    parentPath.every((index, i) => index === to.parentPath[i]) &&
    from.path.at(-1) === to.index
  )
}

function findItem(outline: ParsedOutline, at: ItemPath): Result<OutlineItemSource, OutlineRefusal> {
  let siblings = outline.sections[at.section]?.items
  let item: OutlineItemSource | undefined
  for (const index of at.path) {
    item = siblings?.[index]
    siblings = item?.children
  }
  return item ? ok(item) : err('no-such-item')
}

const contains = (ancestor: OutlineItemSource, candidate: OutlineItemSource): boolean =>
  ancestor === candidate || ancestor.children.some((child) => contains(child, candidate))

/** Applies splices from the end, refusing (as a bug) any that would split an emoji or detach a combining mark. */
function applySafely(text: string, splices: Splice[]): string {
  const ordered = [...splices].sort((a, b) => b.start - a.start || b.end - b.start - (a.end - a.start))
  return ordered.reduce((result, splice) => {
    assertSafeBoundary(result, splice.start)
    assertSafeBoundary(result, splice.end)
    return result.slice(0, splice.start) + splice.text + result.slice(splice.end)
  }, text)
}

/** A splice must never split a surrogate pair (emoji) or separate a letter from its combining marks (niqqud). */
export function assertSafeBoundary(text: string, offset: number): void {
  const before = text.charCodeAt(offset - 1)
  const after = text.charCodeAt(offset)
  if (before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff)
    throw new Error(`a splice at ${offset} would split a surrogate pair`)
  if (offset > 0 && offset < text.length && /^\p{M}/u.test(text.slice(offset, offset + 2)))
    throw new Error(`a splice at ${offset} would detach a combining mark`)
}
