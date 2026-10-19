import { isDeepStrictEqual } from 'node:util'
import { isMap, isScalar, isSeq, parseDocument, type Node, type Pair, type YAMLMap } from 'yaml'
import { domainError } from '../../shared-kernel/domain-error'
import { err, ok, type Result } from '../../shared-kernel/result'
import {
  lineStart,
  scalarQuoting,
  scalarText,
  splice,
  splitHead,
  type FrontmatterEditError
} from './frontmatter-editor'
import { dominantLineEnding, type MarkdownFileParts } from './markdown-file'

/** One entry of a list like `relationships`: its fields, in the order new lines get them. */
export type MappingItem = readonly (readonly [field: string, value: string])[]

interface Edit {
  readonly from: number
  readonly to: number
  readonly text: string
}

const ITEM_INDENT = '  '

/**
 * Sets a top-level key that holds a list of mappings (such as `relationships`) by changing only
 * what differs, item by item (ADR 0007): a changed field's value is replaced, a new field gets a
 * line, a removed field or item loses its lines, and new items are appended. Comments and the
 * fields of other items stay byte-identical. An empty list removes the key.
 */
export function editMappingList(
  parts: MarkdownFileParts,
  key: string,
  items: readonly MappingItem[]
): Result<MarkdownFileParts, FrontmatterEditError> {
  const block = splitHead(parts.head)
  if (block === undefined) {
    return err(domainError('no-frontmatter', 'This file has no frontmatter to edit.'))
  }
  const eol = dominantLineEnding(parts.head) ?? '\n'
  const yaml = block.yaml
  const document = parseDocument(yaml)
  if (document.errors.length > 0) {
    return err(domainError('unparseable-frontmatter', 'The frontmatter is not valid YAML.'))
  }
  const contents = document.contents
  if (contents !== null && !isMap(contents)) {
    return err(domainError('not-a-mapping', 'The frontmatter is not a set of keys.'))
  }
  const pair = contents?.items.find((item) => isScalar(item.key) && item.key.value === key) as
    Pair<Node, Node | null> | undefined

  const edited =
    pair === undefined || pair.value === null
      ? items.length === 0
        ? yaml
        : addKey(yaml, pair, key, items, eol)
      : items.length === 0
        ? removeKeyLines(yaml, pair)
        : editItems(yaml, pair.value, items, eol)
  if (edited === undefined) {
    return err(
      domainError('unsupported-value', `"${key}" is written in a way the app can't edit safely.`)
    )
  }

  const expected: Record<string, unknown> = { ...(document.toJS() as Record<string, unknown>) }
  if (items.length === 0) Reflect.deleteProperty(expected, key)
  else expected[key] = items.map((item) => Object.fromEntries(item))
  const check = parseDocument(edited)
  if (check.errors.length > 0 || !isDeepStrictEqual(check.toJS(), expected)) {
    throw new Error(`Frontmatter edit of "${key}" changed more than that key.`)
  }
  return ok({ ...parts, head: `${block.opening}${edited}${block.closing}` })
}

/** A key that is missing (or empty, `relationships:`) gets the whole block list. */
function addKey(
  yaml: string,
  pair: Pair<Node, Node | null> | undefined,
  key: string,
  items: readonly MappingItem[],
  eol: string
): string | undefined {
  const lines = items.map((item) => itemText(item, ITEM_INDENT, eol)).join(eol)
  if (pair === undefined) {
    const prefix = yaml === '' || yaml.endsWith('\n') ? yaml : `${yaml}${eol}`
    return `${prefix}${key}:${eol}${lines}${eol}`
  }
  const keyEnd = pair.key.range?.[1]
  if (keyEnd === undefined) return undefined
  const colon = yaml.indexOf(':', keyEnd)
  const lineEnd = yaml.indexOf('\n', colon)
  if (colon === -1 || lineEnd === -1) return undefined
  return splice(yaml, lineEnd + 1, lineEnd + 1, `${lines}${eol}`)
}

function removeKeyLines(yaml: string, pair: Pair<Node, Node | null>): string | undefined {
  const keyStart = pair.key.range?.[0]
  const valueEnd = pair.value?.range?.[1]
  if (keyStart === undefined || valueEnd === undefined) return undefined
  return splice(yaml, lineStart(yaml, keyStart), endOfLine(yaml, valueEnd - 1), '')
}

function editItems(
  yaml: string,
  node: Node,
  items: readonly MappingItem[],
  eol: string
): string | undefined {
  if (!isSeq(node) || node.flow === true) return undefined
  const old = node.items
  if (!old.every((item): item is YAMLMap => isMap(item) && item.flow !== true && isSimple(item))) {
    return undefined
  }
  const first = old[0]
  if (first === undefined || first.range === null || first.range === undefined) return undefined
  const dashIndent = ' '.repeat(dashColumn(yaml, first.range[0]))

  const edits: Edit[] = []
  for (const [index, map] of old.entries()) {
    const wanted = items[index]
    if (wanted === undefined) {
      edits.push(removeItem(yaml, map))
      continue
    }
    const changed = editFields(yaml, map, wanted, eol)
    if (changed === undefined) return undefined
    edits.push(...changed)
  }
  const last = old[old.length - 1]
  if (last !== undefined && items.length > old.length) {
    const at = itemEnd(yaml, last)
    const added = items
      .slice(old.length)
      .map((item) => itemText(item, dashIndent, eol))
      .join(eol)
    edits.push({ from: at, to: at, text: `${added}${eol}` })
  }
  // Back to front, so earlier positions stay valid.
  return [...edits]
    .sort((a, b) => b.from - a.from)
    .reduce((text, edit) => splice(text, edit.from, edit.to, edit.text), yaml)
}

/** The edits that turn one item's fields into `wanted`, or `undefined` if that isn't safe. */
function editFields(
  yaml: string,
  map: YAMLMap,
  wanted: MappingItem,
  eol: string
): Edit[] | undefined {
  const pairs = map.items as Pair<Node, Node | null>[]
  const fieldOf = (pair: Pair<Node, Node | null>): string =>
    isScalar(pair.key) ? String(pair.key.value) : ''
  const wantedFields = new Map(wanted)
  const edits: Edit[] = []

  for (const [index, pair] of pairs.entries()) {
    const field = fieldOf(pair)
    const value = wantedFields.get(field)
    const node = pair.value
    if (value === undefined) {
      // The first field shares its line with the item's dash; removing it is left to a rewrite.
      if (index === 0) return undefined
      const keyStart = pair.key.range?.[0]
      const end = node?.range?.[1] ?? pair.key.range?.[1]
      if (keyStart === undefined || end === undefined) return undefined
      edits.push({ from: lineStart(yaml, keyStart), to: endOfLine(yaml, end - 1), text: '' })
      continue
    }
    if (node === null || !isScalar(node) || node.range === undefined || node.range === null) {
      return undefined
    }
    if (String(node.value) === value) continue
    edits.push({
      from: node.range[0],
      to: node.range[1],
      text: scalarText(value, scalarQuoting(node.type))
    })
  }

  const existing = new Set(pairs.map(fieldOf))
  const added = wanted.filter(([field]) => !existing.has(field))
  const firstKey = pairs[0]?.key.range?.[0]
  if (added.length > 0 && firstKey !== undefined) {
    const indent = ' '.repeat(firstKey - lineStart(yaml, firstKey))
    const at = itemEnd(yaml, map)
    const lines = added.map(([field, value]) => `${indent}${field}: ${scalarText(value, 'none')}`)
    edits.push({ from: at, to: at, text: `${lines.join(eol)}${eol}` })
  }
  return edits
}

function removeItem(yaml: string, map: YAMLMap): Edit {
  const start = map.range?.[0] ?? 0
  return { from: lineStart(yaml, start), to: itemEnd(yaml, map), text: '' }
}

/** Where the line after an item's last field starts. */
function itemEnd(yaml: string, map: YAMLMap): number {
  const end = map.range?.[1] ?? 0
  return endOfLine(yaml, end - 1)
}

/** The position after the line break that ends the line holding `position`. */
function endOfLine(yaml: string, position: number): number {
  const lineEnd = yaml.indexOf('\n', Math.max(position, 0))
  return lineEnd === -1 ? yaml.length : lineEnd + 1
}

/** The column of the `-` that starts the item whose content begins at `contentStart`. */
function dashColumn(yaml: string, contentStart: number): number {
  const start = lineStart(yaml, contentStart)
  const dash = yaml.indexOf('-', start)
  return dash === -1 || dash > contentStart ? 0 : dash - start
}

/** Only scalar keys and scalar (or empty) values: anything nested is left to the writer. */
function isSimple(map: YAMLMap): boolean {
  return (map.items as Pair<Node, Node | null>[]).every(
    (pair) => isScalar(pair.key) && (pair.value === null || isScalar(pair.value))
  )
}

function itemText(item: MappingItem, dashIndent: string, eol: string): string {
  return item
    .map(([field, value], index) =>
      index === 0
        ? `${dashIndent}- ${field}: ${scalarText(value, 'none')}`
        : `${dashIndent}  ${field}: ${scalarText(value, 'none')}`
    )
    .join(eol)
}
