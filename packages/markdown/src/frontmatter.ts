import { err, ok, type Result } from '@plotdevice/shared'
import { isMap, isScalar, parseDocument, type Scalar } from 'yaml'
import { applySplices, lineEndAt, lineEndingOf, lineStartAt, type Splice } from './text'

/** The frontmatter block at the very start of a file, with offsets into the whole text. */
export interface Frontmatter {
  /** From the opening `---` through the closing line, including its line ending. */
  text: string
  /** The YAML between the fences. */
  yamlStart: number
  yamlEnd: number
}

export type FrontmatterProblem = 'invalid-yaml' | 'not-a-map' | 'not-a-plain-value'

const OPENING = /^---[ \t]*\r?\n/
const CLOSING = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m

export function splitFrontmatter(text: string): { frontmatter: Frontmatter | null; body: string } {
  const opening = OPENING.exec(text)
  if (!opening) return { frontmatter: null, body: text }
  const yamlStart = opening[0].length
  const closing = CLOSING.exec(text.slice(yamlStart))
  if (!closing) return { frontmatter: null, body: text }
  const yamlEnd = yamlStart + closing.index
  const end = yamlEnd + closing[0].length
  return { frontmatter: { text: text.slice(0, end), yamlStart, yamlEnd }, body: text.slice(end) }
}

/** The frontmatter as plain values. A file without frontmatter reads as `{}`. */
export function readFrontmatter(text: string): Result<Record<string, unknown>, 'invalid-yaml'> {
  const { frontmatter } = splitFrontmatter(text)
  if (!frontmatter) return ok({})
  const doc = parseDocument(text.slice(frontmatter.yamlStart, frontmatter.yamlEnd))
  if (doc.errors.length > 0) return err('invalid-yaml')
  const value: unknown = doc.toJS()
  if (value === null || value === undefined) return ok({})
  return typeof value === 'object' && !Array.isArray(value) ? ok(value as Record<string, unknown>) : err('invalid-yaml')
}

/**
 * Sets top-level frontmatter values by splicing the YAML source, never re-serializing it (ADR 0005):
 * comments, key order, quoting style and line endings stay as they were. Missing keys are added at
 * the end; a file without frontmatter gets one.
 */
export function setFrontmatterValues(text: string, values: Readonly<Record<string, string | number>>): Result<string, FrontmatterProblem> {
  const eol = lineEndingOf(text)
  const { frontmatter } = splitFrontmatter(text)
  if (!frontmatter) {
    const lines = Object.entries(values).map(([key, value]) => `${key}: ${formatScalar(value)}${eol}`)
    return ok(`---${eol}${lines.join('')}---${eol}${text}`)
  }

  const doc = parseDocument(text.slice(frontmatter.yamlStart, frontmatter.yamlEnd))
  if (doc.errors.length > 0) return err('invalid-yaml')
  const map = doc.contents
  if (map !== null && !isMap(map)) return err('not-a-map')

  const splices: Splice[] = []
  const missing: string[] = []
  for (const [key, value] of Object.entries(values)) {
    const pair = map?.items.find((item) => isScalar(item.key) && item.key.value === key)
    if (!pair) {
      missing.push(`${key}: ${formatScalar(value)}${eol}`)
      continue
    }
    if (!isScalar(pair.value) || !pair.value.range) return err('not-a-plain-value')
    const [start, end] = pair.value.range
    const absolute = frontmatter.yamlStart + start
    const needsSpace = pair.value.value === null && text[absolute - 1] === ':'
    splices.push({ start: absolute, end: frontmatter.yamlStart + end, text: (needsSpace ? ' ' : '') + formatScalar(value, pair.value) })
  }
  if (missing.length > 0) splices.push({ start: frontmatter.yamlEnd, end: frontmatter.yamlEnd, text: missing.join('') })
  return ok(applySplices(text, splices))
}

/**
 * Sets one top-level list, such as `tags`, by replacing only its lines with a flow list
 * (`tags: [a, b]`); an empty list removes the key. Everything else stays byte for byte (ADR 0005).
 */
export function setFrontmatterList(text: string, key: string, values: readonly string[]): Result<string, FrontmatterProblem> {
  const eol = lineEndingOf(text)
  const line = values.length > 0 ? `${key}: [${values.map(formatFlowItem).join(', ')}]${eol}` : ''
  const { frontmatter } = splitFrontmatter(text)
  if (!frontmatter) return ok(line === '' ? text : `---${eol}${line}---${eol}${text}`)

  const doc = parseDocument(text.slice(frontmatter.yamlStart, frontmatter.yamlEnd))
  if (doc.errors.length > 0) return err('invalid-yaml')
  const map = doc.contents
  if (map !== null && !isMap(map)) return err('not-a-map')
  const pair = map?.items.find((item) => isScalar(item.key) && item.key.value === key)
  if (!pair) return ok(line === '' ? text : applySplices(text, [{ start: frontmatter.yamlEnd, end: frontmatter.yamlEnd, text: line }]))

  const keyRange = isScalar(pair.key) ? pair.key.range : null
  const valueRange = (pair.value as { range?: [number, number, number] } | null)?.range ?? keyRange
  if (!keyRange || !valueRange) return err('not-a-plain-value')
  const start = lineStartAt(text, frontmatter.yamlStart + keyRange[0])
  // A block list ends just past its last line ending; anything else ends on the line it is written on.
  const end = lineEndAt(text, frontmatter.yamlStart + Math.max(valueRange[1], keyRange[1]) - 1)
  return ok(applySplices(text, [{ start, end, text: line }]))
}

/** An entry of a flow list: plain when that is safe there too, double-quoted otherwise. */
function formatFlowItem(value: string): string {
  const plain = formatScalar(value)
  return plain === value && !/[,[\]{}]/.test(value) ? value : JSON.stringify(value)
}

const YAML_SPECIAL = /^(?:true|false|null|yes|no|on|off|~|[-+]?(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?|\.inf|\.nan)$/i

/** A value written the way the existing one was quoted; plain when that is safe, double-quoted otherwise. */
export function formatScalar(value: string | number, existing?: Scalar): string {
  if (typeof value === 'number') return String(value)
  if (existing?.type === 'QUOTE_SINGLE') return `'${value.replace(/'/g, "''")}'`
  if (existing?.type === 'QUOTE_DOUBLE') return JSON.stringify(value)
  const plainIsSafe =
    value !== '' && !/^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(value) && !/[\r\n]|: |\s#|:$|\s$/.test(value) && !YAML_SPECIAL.test(value)
  return plainIsSafe ? value : JSON.stringify(value)
}
