import { isDeepStrictEqual } from 'node:util'
import { isMap, isScalar, isSeq, parseDocument, stringify, type Node, type Pair } from 'yaml'
import { domainError, type DomainError } from '../../shared-kernel/domain-error'
import { err, ok, type Result } from '../../shared-kernel/result'
import { dominantLineEnding, type MarkdownFileParts } from './markdown-file'

/** A value the app writes into frontmatter. Lists hold scalars only. */
export type FrontmatterValue = string | number | readonly (string | number)[]

/** Set `key` to `value`, or remove it when `value` is `undefined`. */
export interface KeyEdit {
  readonly key: string
  readonly value: FrontmatterValue | undefined
}

/** Why frontmatter couldn't be edited. The file is never written in these cases. */
export type FrontmatterEditError = DomainError<
  'no-frontmatter' | 'unparseable-frontmatter' | 'not-a-mapping' | 'unsupported-value'
>

const LIST_INDENT = '  '

/**
 * Applies edits to a file's frontmatter by replacing only the characters of the edited values
 * (see ADR 0004). Comments, spacing, key order, quoting, unknown keys, line endings, and the BOM
 * of everything else stay byte-identical.
 */
export function editFrontmatter(
  parts: MarkdownFileParts,
  edits: readonly KeyEdit[]
): Result<MarkdownFileParts, FrontmatterEditError> {
  const block = splitHead(parts.head)
  if (block === undefined) {
    return err(domainError('no-frontmatter', 'This file has no frontmatter to edit.'))
  }
  const eol = dominantLineEnding(parts.head) ?? '\n'

  let yaml = block.yaml
  for (const edit of edits) {
    const edited = applyEdit(yaml, edit, eol)
    if (!edited.ok) return edited
    yaml = edited.value
  }
  return ok({ ...parts, head: `${block.opening}${yaml}${block.closing}` })
}

/** The head as its opening `---` line, the YAML between, and the closing `---` line. */
export function splitHead(
  head: string
): { readonly opening: string; readonly yaml: string; readonly closing: string } | undefined {
  const firstBreak = head.indexOf('\n')
  if (firstBreak === -1) return undefined
  const opening = head.slice(0, firstBreak + 1)
  const closingStart = head.lastIndexOf('---')
  if (closingStart < opening.length) return undefined
  return {
    opening,
    yaml: head.slice(opening.length, closingStart),
    closing: head.slice(closingStart)
  }
}

function applyEdit(yaml: string, edit: KeyEdit, eol: string): Result<string, FrontmatterEditError> {
  const document = parseDocument(yaml)
  if (document.errors.length > 0) {
    return err(domainError('unparseable-frontmatter', 'The frontmatter is not valid YAML.'))
  }
  const before: unknown = document.toJS()
  const contents = document.contents
  if (contents !== null && !isMap(contents)) {
    return err(domainError('not-a-mapping', 'The frontmatter is not a set of keys.'))
  }

  const pair = contents?.items.find((item) => isScalar(item.key) && item.key.value === edit.key) as
    Pair<Node, Node | null> | undefined
  const result =
    pair === undefined
      ? edit.value === undefined
        ? yaml
        : appendKey(yaml, edit.key, edit.value, eol)
      : edit.value === undefined
        ? removeKey(yaml, pair)
        : replaceValue(yaml, pair, edit.value, eol)
  if (result === undefined) {
    return err(
      domainError(
        'unsupported-value',
        `"${edit.key}" is written in a way the app can't edit safely.`
      )
    )
  }

  verify(before, result, edit)
  return ok(result)
}

/** Replaces the value of an existing key, keeping its shape where possible (see "Values with a different shape"). */
function replaceValue(
  yaml: string,
  pair: Pair<Node, Node | null>,
  value: FrontmatterValue,
  eol: string
): string | undefined {
  const keyRange = pair.key.range
  const node = pair.value
  if (keyRange === undefined || keyRange === null) return undefined
  const colon = yaml.indexOf(':', keyRange[1])
  if (colon === -1) return undefined
  const afterColon = colon + 1

  // An empty value (`pov:`): insert after the colon.
  if (
    node === null ||
    node.range === undefined ||
    node.range === null ||
    node.range[0] === node.range[1]
  ) {
    return splice(yaml, afterColon, afterColon, valueAfterColon(value, LIST_INDENT, eol))
  }
  const [start, valueEnd] = node.range
  const region = yaml.slice(afterColon, valueEnd)
  const endsWithBreak = /\r?\n$/u.test(region)
  const multiLine = region.trimEnd().includes('\n')

  const wasFlowList = isSeq(node) && node.flow === true
  const wasBlockList = isSeq(node) && node.flow !== true
  if (isSeq(node) && node.items.some((item) => !isScalar(item))) return undefined

  if (Array.isArray(value)) {
    if (wasFlowList) return splice(yaml, start, valueEnd, flowList(value))
    const indent = wasBlockList ? ' '.repeat(start - lineStart(yaml, start)) : LIST_INDENT
    const list = blockList(value as readonly (string | number)[], indent, eol)
    // Whatever followed the old value on its line (a comment) now follows the last item.
    return splice(yaml, afterColon, valueEnd, `${eol}${list}${endsWithBreak ? eol : ''}`)
  }

  const quoting = isScalar(node) ? scalarQuoting(node.type) : 'none'
  const text = scalarText(value as string | number, quoting)
  if (!multiLine && !wasBlockList && !(isScalar(node) && isBlockScalar(node.type))) {
    return splice(yaml, start, valueEnd, text)
  }
  return splice(yaml, afterColon, valueEnd, ` ${text}${endsWithBreak ? eol : ''}`)
}

function appendKey(yaml: string, key: string, value: FrontmatterValue, eol: string): string {
  const prefix = yaml === '' || yaml.endsWith('\n') ? yaml : `${yaml}${eol}`
  return `${prefix}${key}:${valueAfterColon(value, LIST_INDENT, eol)}${eol}`
}

/** Removes the key's lines: the key, its value (all lines of a block value), and its comment. */
function removeKey(yaml: string, pair: Pair<Node, Node | null>): string | undefined {
  const keyRange = pair.key.range
  if (keyRange === undefined || keyRange === null) return undefined
  const from = lineStart(yaml, keyRange[0])
  const valueEnd = pair.value?.range?.[1] ?? keyRange[1]
  if (yaml.slice(from, valueEnd).endsWith('\n')) return splice(yaml, from, valueEnd, '')
  const lineEnd = yaml.indexOf('\n', valueEnd)
  return splice(yaml, from, lineEnd === -1 ? yaml.length : lineEnd + 1, '')
}

/** A value as it follows `key:`: ` text` for a scalar, or the list's lines for a list. */
function valueAfterColon(value: FrontmatterValue, indent: string, eol: string): string {
  if (!Array.isArray(value)) return ` ${scalarText(value as string | number, 'none')}`
  return `${eol}${blockList(value as readonly (string | number)[], indent, eol)}`
}

/** A block list's lines, without a final line ending. */
function blockList(items: readonly (string | number)[], indent: string, eol: string): string {
  return items.map((item) => `${indent}- ${scalarText(item, 'none')}`).join(eol)
}

function flowList(items: readonly (string | number)[]): string {
  return `[${items.map((item) => scalarText(item, 'none')).join(', ')}]`
}

export type Quoting = 'none' | 'double' | 'single'

export function scalarQuoting(type: string | undefined): Quoting {
  if (type === 'QUOTE_DOUBLE') return 'double'
  if (type === 'QUOTE_SINGLE') return 'single'
  return 'none'
}

function isBlockScalar(type: string | undefined): boolean {
  return type === 'BLOCK_LITERAL' || type === 'BLOCK_FOLDED'
}

/** One scalar as YAML text. Wikilinks are always double-quoted (see "Links" in docs/file-format.md). */
export function scalarText(value: string | number, quoting: Quoting): string {
  if (typeof value === 'number') return String(value)
  const wanted: Quoting = value.startsWith('[[') || value.startsWith('![[') ? 'double' : quoting
  return stringify(value, {
    lineWidth: 0,
    blockQuote: false,
    defaultStringType:
      wanted === 'double' ? 'QUOTE_DOUBLE' : wanted === 'single' ? 'QUOTE_SINGLE' : 'PLAIN'
  }).replace(/\n$/u, '')
}

export function lineStart(text: string, position: number): number {
  return text.lastIndexOf('\n', position - 1) + 1
}

export function splice(text: string, from: number, to: number, insert: string): string {
  return `${text.slice(0, from)}${insert}${text.slice(to)}`
}

/** The edit must change exactly the one key. Anything else is a bug; never write such a result. */
function verify(before: unknown, yaml: string, edit: KeyEdit): void {
  const document = parseDocument(yaml)
  if (document.errors.length > 0) {
    throw new Error(`Frontmatter edit of "${edit.key}" produced invalid YAML.`)
  }
  const after = asRecord(document.toJS())
  const expected = Object.fromEntries(
    Object.entries(asRecord(before)).filter(([key]) => key !== edit.key)
  )
  if (edit.value !== undefined) {
    expected[edit.key] = typeof edit.value === 'object' ? [...edit.value] : edit.value
  }
  if (!isDeepStrictEqual(after, expected)) {
    throw new Error(`Frontmatter edit of "${edit.key}" changed more than that key.`)
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
