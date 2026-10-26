import type { List, ListItem, Nodes, Paragraph, Root, RootContent } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { collisionKey, err, ok, type Result } from '@plotdevice/shared'
import { applySplices, blankRunBefore, isBlankLineAt, lineEndAt, lineEndingOf, lineStartAt, type Splice } from './text'

/**
 * `CONTENTS.md`: the book's reading order (ADR 0006). The first list in the file is the contents: an
 * item that is exactly one link to a `.md` file is a chapter; an item without a link is a part, with
 * its chapters nested under it. Everything else is kept as written and reported.
 *
 * Offsets are UTF-16 code units into the text (ADR 0003). Edits are splices on that text.
 */
export interface Range {
  start: number
  end: number
}

interface ItemSource {
  /** Start of the item's first line. */
  lineStart: number
  /** End of the item's last line (nested items included), line ending included. */
  blockEnd: number
  indent: string
  /** `-`, `*`, `+`, `1.` or `1)`. */
  marker: string
  /** The 1-based line number, for messages. */
  line: number
}

export interface ContentsChapterItem extends ItemSource {
  kind: 'chapter'
  /** The link target relative to `CONTENTS.md`, decoded: `manuscript/the crossing.md`. */
  target: string
  linkText: string
  linkTextRange: Range
  destination: Range & { angle: boolean }
}

export interface ContentsPartItem extends ItemSource {
  kind: 'part'
  name: string
  nameRange: Range
  /** End of the part's own line, where a first chapter goes in an empty part. */
  firstLineEnd: number
  chapters: ContentsChapterItem[]
}

export type ContentsItem = ContentsChapterItem | ContentsPartItem

export type ContentsWarningCode = 'ignored-content' | 'not-a-chapter' | 'chapter-has-sub-items'

export interface ContentsWarning {
  code: ContentsWarningCode
  line: number
  text: string
}

export interface ParsedContents {
  entries: ContentsItem[]
  warnings: ContentsWarning[]
  /** End of the contents list (line ending included), or `null` when the file has no list yet. */
  listEnd: number | null
}

export function parseContents(text: string): ParsedContents {
  const root: Root = fromMarkdown(text)
  const warnings: ContentsWarning[] = []
  const warn = (code: ContentsWarningCode, offset: number): void => {
    const lineStart = lineStartAt(text, offset)
    warnings.push({ code, line: lineNumber(text, offset), text: text.slice(lineStart, lineEndAt(text, lineStart)).trim() })
  }

  let list: List | undefined
  let sawTitle = false
  for (const node of root.children) {
    if (!list && !sawTitle && node.type === 'heading' && node.depth === 1) sawTitle = true
    else if (!list && node.type === 'list') list = node
    else warn('ignored-content', startOf(node))
  }
  if (!list) return { entries: [], warnings, listEnd: null }

  const entries: ContentsItem[] = []
  for (const item of list.children) {
    const parsed = readItem(text, item, warn, true)
    if (parsed) entries.push(parsed)
  }
  warnings.sort((a, b) => a.line - b.line)
  return { entries, warnings, listEnd: lineEndAt(text, endOf(list)) }
}

function readItem(
  text: string,
  item: ListItem,
  warn: (code: ContentsWarningCode, offset: number) => void,
  topLevel: boolean,
): ContentsItem | null {
  const start = startOf(item)
  const lineStart = lineStartAt(text, start)
  const indent = text.slice(lineStart, start)
  const marker = /^(?:[-+*]|\d{1,9}[.)])/.exec(text.slice(start, start + 12))?.[0]
  if (!marker || !/^[ \t]*$/.test(indent)) {
    warn('not-a-chapter', start)
    return null
  }
  const source: ItemSource = { lineStart, blockEnd: lineEndAt(text, endOf(item)), indent, marker, line: lineNumber(text, start) }
  const [first, ...rest] = item.children
  const paragraph = first?.type === 'paragraph' ? first : undefined
  const meaningful = (paragraph?.children ?? []).filter((child) => !(child.type === 'text' && child.value.trim() === ''))
  const link = meaningful.length === 1 && meaningful[0]?.type === 'link' ? meaningful[0] : undefined
  const hasLink = (paragraph?.children ?? []).some((child) => child.type === 'link')

  if (link && paragraph) {
    const target = safeDecode(link.url)
    const chapter = /^[a-z][a-z0-9+.-]*:/i.test(target) || !/\.md$/i.test(target) ? null : readChapter(text, link, target, source)
    if (!chapter) {
      warn('not-a-chapter', start)
      return null
    }
    if (rest.length > 0) warn('chapter-has-sub-items', startOf(rest[0] as Nodes))
    return chapter
  }
  if (!topLevel || hasLink || !paragraph) {
    warn(topLevel && !paragraph ? 'ignored-content' : 'not-a-chapter', start)
    return null
  }

  const chapters: ContentsChapterItem[] = []
  for (const child of rest) {
    if (child.type !== 'list') {
      warn('ignored-content', startOf(child))
      continue
    }
    for (const nested of child.children) {
      const chapter = readItem(text, nested, warn, false)
      if (chapter?.kind === 'chapter') chapters.push(chapter)
    }
  }
  const nameRange = { start: startOf(paragraph), end: endOf(paragraph) }
  return { ...source, kind: 'part', name: plainText(paragraph).trim(), nameRange, firstLineEnd: lineEndAt(text, nameRange.end), chapters }
}

function readChapter(text: string, link: Nodes & { type: 'link' }, target: string, source: ItemSource): ContentsChapterItem | null {
  const linkStart = startOf(link)
  const children = link.children
  const textEnd = children.length > 0 ? endOf(children[children.length - 1] as Nodes) : linkStart + 1
  if (text[textEnd] !== ']' || text[textEnd + 1] !== '(') return null
  let destStart = textEnd + 2
  while (text[destStart] === ' ' || text[destStart] === '\t') destStart++
  let destEnd: number
  const angle = text[destStart] === '<'
  if (angle) {
    destEnd = text.indexOf('>', destStart) + 1
    if (destEnd === 0) return null
  } else {
    destEnd = destStart
    let depth = 0
    while (destEnd < text.length && !/\s/.test(text[destEnd] ?? '')) {
      const char = text[destEnd]
      if (char === '(') depth++
      if (char === ')' && depth-- === 0) break
      destEnd++
    }
  }
  return {
    ...source,
    kind: 'chapter',
    target,
    linkText: link.children.map(plainText).join(''),
    linkTextRange: { start: linkStart + 1, end: textEnd },
    destination: { start: destStart, end: destEnd, angle },
  }
}

// ---- Edits ----

/** Where a chapter goes, as in the domain: `part` is a part's position before the move; `index` counts the other entries. */
export interface ContentsPlacement {
  part: number | null
  index: number
}

export type ContentsEdit =
  | { kind: 'add-chapter'; file: string; linkText: string; placement: ContentsPlacement }
  | { kind: 'move-chapter'; file: string; placement: ContentsPlacement }
  | { kind: 'remove-chapter'; file: string }
  | { kind: 'set-link-text'; file: string; linkText: string }
  | { kind: 'set-target'; file: string; newFile: string }
  | { kind: 'add-part'; name: string; index: number }
  | { kind: 'rename-part'; part: number; name: string }

export type ContentsEditProblem =
  'not-in-contents' | 'already-in-contents' | 'not-a-part' | 'no-such-position' | 'empty-name' | 'multiline-name'

/**
 * Applies one change to `CONTENTS.md` as splices: the author's bullets, indentation, spacing and
 * anything else in the file stay as they were (ADR 0003). Paths are relative to `CONTENTS.md`.
 */
export function editContents(text: string, edit: ContentsEdit): Result<string, ContentsEditProblem> {
  const eol = lineEndingOf(text)
  const hasFinalNewline = text === '' || text.endsWith('\n')
  const work = hasFinalNewline ? text : text + eol
  const planned = plan(work, parseContents(work), edit, eol)
  if (!planned.ok) return planned
  const edited = applySplices(work, planned.value)
  return ok(hasFinalNewline || !edited.endsWith(eol) ? edited : edited.slice(0, -eol.length))
}

interface Located {
  part: number | null
  index: number
  item: ContentsChapterItem
}

function locate(parsed: ParsedContents, file: string): Located | null {
  const key = collisionKey(file)
  for (const [i, entry] of parsed.entries.entries()) {
    if (entry.kind === 'chapter' && collisionKey(entry.target) === key) return { part: null, index: i, item: entry }
    if (entry.kind === 'part') {
      const j = entry.chapters.findIndex((chapter) => collisionKey(chapter.target) === key)
      const item = entry.chapters[j]
      if (item) return { part: i, index: j, item }
    }
  }
  return null
}

function plan(text: string, parsed: ParsedContents, edit: ContentsEdit, eol: string): Result<Splice[], ContentsEditProblem> {
  switch (edit.kind) {
    case 'move-chapter': {
      const from = locate(parsed, edit.file)
      if (!from) return err('not-in-contents')
      if (from.part === edit.placement.part && from.index === edit.placement.index) return ok([])
      const insertion = insertionFor(text, parsed, edit.placement, from.item, eol)
      if (!insertion.ok) return insertion
      const { at, indent, marker, before, after } = insertion.value
      const block = rebase(text.slice(from.item.lineStart, from.item.blockEnd), from.item, indent, marker)
      return ok([removal(text, from.item), { start: at, end: at, text: before + block + after }])
    }
    case 'add-chapter': {
      if (locate(parsed, edit.file)) return err('already-in-contents')
      const name = checkName(edit.linkText)
      if (!name.ok) return name
      const insertion = insertionFor(text, parsed, edit.placement, null, eol)
      if (!insertion.ok) return insertion
      const { at, indent, marker, before, after } = insertion.value
      const line = `${indent}${marker} [${escapeLinkText(name.value)}](${formatDestination(edit.file, false)})${eol}`
      return ok([{ start: at, end: at, text: before + line + after }])
    }
    case 'remove-chapter': {
      const at = locate(parsed, edit.file)
      return at ? ok([removal(text, at.item)]) : err('not-in-contents')
    }
    case 'set-link-text': {
      const at = locate(parsed, edit.file)
      if (!at) return err('not-in-contents')
      const name = checkName(edit.linkText)
      if (!name.ok) return name
      return ok([{ ...at.item.linkTextRange, text: escapeLinkText(name.value) }])
    }
    case 'set-target': {
      const at = locate(parsed, edit.file)
      if (!at) return err('not-in-contents')
      if (collisionKey(edit.newFile) !== collisionKey(edit.file) && locate(parsed, edit.newFile)) return err('already-in-contents')
      return ok([
        {
          start: at.item.destination.start,
          end: at.item.destination.end,
          text: formatDestination(edit.newFile, at.item.destination.angle),
        },
      ])
    }
    case 'add-part': {
      const name = checkName(edit.name)
      if (!name.ok) return name
      if (edit.index < 0 || edit.index > parsed.entries.length) return err('no-such-position')
      const insertion = insertionAmong(text, parsed, parsed.entries, edit.index, null, eol)
      const { at, indent, marker, before, after } = insertion
      return ok([{ start: at, end: at, text: `${before}${indent}${marker} ${escapePartName(name.value)}${eol}${after}` }])
    }
    case 'rename-part': {
      const part = parsed.entries[edit.part]
      if (!part || part.kind !== 'part') return err('not-a-part')
      const name = checkName(edit.name)
      if (!name.ok) return name
      return ok([{ ...part.nameRange, text: escapePartName(name.value) }])
    }
  }
}

interface Insertion {
  at: number
  indent: string
  marker: string
  before: string
  after: string
}

function insertionFor(
  text: string,
  parsed: ParsedContents,
  placement: ContentsPlacement,
  moving: ContentsChapterItem | null,
  eol: string,
): Result<Insertion, ContentsEditProblem> {
  const part = placement.part === null ? null : parsed.entries[placement.part]
  if (placement.part !== null && part?.kind !== 'part') return err('not-a-part')
  const siblings = (part?.kind === 'part' ? part.chapters : parsed.entries).filter((entry) => entry !== moving)
  if (placement.index < 0 || placement.index > siblings.length) return err('no-such-position')
  return ok(insertionAmong(text, parsed, siblings, placement.index, part?.kind === 'part' ? part : null, eol))
}

/** Where a new line goes among `siblings`, copying their indentation, bullet style and spacing. */
function insertionAmong(
  text: string,
  parsed: ParsedContents,
  siblings: readonly ContentsItem[],
  index: number,
  part: ContentsPartItem | null,
  eol: string,
): Insertion {
  const next = siblings[index]
  if (next) {
    const spaced = index > 0 && next.lineStart > 0 && isBlankLineAt(text, lineStartAt(text, next.lineStart - 1))
    return { at: next.lineStart, indent: next.indent, marker: next.marker, before: '', after: spaced ? eol : '' }
  }
  const previous = siblings[siblings.length - 1]
  if (previous) {
    const spaced = siblings.length > 1 && previous.lineStart > 0 && isBlankLineAt(text, lineStartAt(text, previous.lineStart - 1))
    return { at: previous.blockEnd, indent: previous.indent, marker: nextMarker(previous.marker), before: spaced ? eol : '', after: '' }
  }
  if (part)
    return {
      at: part.firstLineEnd,
      indent: part.indent + childIndent(parsed, part),
      marker: /^[-+*]$/.test(part.marker) ? part.marker : '-',
      before: '',
      after: '',
    }
  if (parsed.listEnd !== null) return { at: parsed.listEnd, indent: '', marker: '-', before: '', after: '' }
  const lastLineBlank = text.length === 0 || isBlankLineAt(text, lineStartAt(text, text.length - 1))
  return { at: text.length, indent: '', marker: '-', before: text.length === 0 || lastLineBlank ? '' : eol, after: '' }
}

/** The indentation the file already uses for chapters inside parts, or the part's content column. */
function childIndent(parsed: ParsedContents, part: ContentsPartItem): string {
  for (const entry of parsed.entries) {
    const child = entry.kind === 'part' ? entry.chapters[0] : undefined
    if (entry.kind === 'part' && child?.indent.startsWith(entry.indent)) return child.indent.slice(entry.indent.length)
  }
  return ' '.repeat(part.marker.length + 1)
}

function nextMarker(marker: string): string {
  const numbered = /^(\d+)([.)])$/.exec(marker)
  return numbered ? `${Number(numbered[1]) + 1}${numbered[2]}` : marker
}

/** An item's lines; when blank lines surround it, the run before it goes too (as in ADR 0003). */
function removal(text: string, item: ItemSource): Splice {
  const blankAfter = item.blockEnd >= text.length || isBlankLineAt(text, item.blockEnd)
  const blankStart = blankRunBefore(text, item.lineStart)
  return { start: blankAfter && blankStart < item.lineStart ? blankStart : item.lineStart, end: item.blockEnd, text: '' }
}

/** Moves an item's lines to a new indentation and marker by shifting the indentation prefix only. */
function rebase(block: string, item: ItemSource, indent: string, marker: string): string {
  const [first = '', ...rest] = block.match(/[^\n]*\n|[^\n]+$/g) ?? []
  const head = indent + marker + first.slice(item.indent.length + item.marker.length)
  return (
    head +
    rest.map((line) => (line.trim() !== '' && line.startsWith(item.indent) ? indent + line.slice(item.indent.length) : line)).join('')
  )
}

function checkName(name: string): Result<string, ContentsEditProblem> {
  const trimmed = name.trim()
  if (trimmed === '') return err('empty-name')
  return /[\r\n]/.test(trimmed) ? err('multiline-name') : ok(trimmed)
}

function escapeLinkText(text: string): string {
  return text.replace(/[\\[\]*_`]/g, '\\$&')
}

/** A part name must not turn into a link, a numbered list, a heading or a quote. */
function escapePartName(name: string): string {
  const inner = name.replace(/[\\[\]]/g, '\\$&')
  const numbered = /^(\d{1,9})([.)])/.exec(inner)
  if (numbered) return `${numbered[1]}\\${inner.slice((numbered[1] ?? '').length)}`
  return /^[#>+*-]/.test(inner) ? `\\${inner}` : inner
}

/** Paths with spaces or parentheses use CommonMark's angle brackets, as does a link that already did. */
function formatDestination(path: string, angle: boolean): string {
  return angle || /[\s<>()]/.test(path) ? `<${path}>` : path
}

function plainText(node: Nodes): string {
  if ('value' in node && (node.type === 'text' || node.type === 'inlineCode')) return node.value
  if (node.type === 'break') return ' '
  return 'children' in node ? (node.children as Nodes[]).map(plainText).join('') : ''
}

function safeDecode(url: string): string {
  try {
    return decodeURI(url)
  } catch {
    return url
  }
}

function startOf(node: Nodes | RootContent | Paragraph | ListItem | List): number {
  return node.position?.start.offset ?? 0
}

function endOf(node: Nodes | RootContent | Paragraph | ListItem | List): number {
  return node.position?.end.offset ?? 0
}

function lineNumber(text: string, offset: number): number {
  let line = 1
  for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) line++
  return line
}
