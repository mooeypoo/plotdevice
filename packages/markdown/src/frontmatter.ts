import { err, ok, type Result } from '@plotdevice/shared'
import { isMap, isScalar, parseDocument, type Scalar } from 'yaml'
import { applySplices, lineEndingOf, type Splice } from './text'

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

const YAML_SPECIAL = /^(?:true|false|null|yes|no|on|off|~|[-+]?(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?|\.inf|\.nan)$/i

/** A value written the way the existing one was quoted; plain when that is safe, double-quoted otherwise. */
export function formatScalar(value: string | number, existing?: Scalar): string {
  if (typeof value === 'number') return String(value)
  if (existing?.type === 'QUOTE_SINGLE') return `'${value.replace(/'/g, "''")}'`
  if (existing?.type === 'QUOTE_DOUBLE') return JSON.stringify(value)
  const plainIsSafe =
    value !== '' &&
    !/^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(value) &&
    !/[\r\n]|: |\s#|:$|\s$/.test(value) &&
    !YAML_SPECIAL.test(value)
  return plainIsSafe ? value : JSON.stringify(value)
}
