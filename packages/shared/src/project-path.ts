import type { Brand } from './brand'
import { err, ok, type Result } from './result'

/**
 * A path inside a project, with forward slashes: `manuscript/the-crossing.md`. Windows rules apply on
 * every OS, because projects move between machines. Pure: no `node:path` (AGENTS.md).
 */
export type ProjectPath = Brand<string, 'ProjectPath'>

export type PathProblem =
  | 'empty'
  | 'absolute'
  | 'backslash'
  | 'parent-segment'
  | 'empty-segment'
  | 'forbidden-character'
  | 'reserved-name'
  | 'trailing-dot-or-space'
  | 'segment-too-long'

/** Characters Windows forbids in names, plus control characters. */
export const FORBIDDEN_IN_NAMES = /[<>:"|?*\u0000-\u001f]/
const RESERVED = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/i
const MAX_SEGMENT_BYTES = 255

export function parseProjectPath(raw: string): Result<ProjectPath, PathProblem[]> {
  const problems = new Set<PathProblem>()
  if (raw === '') problems.add('empty')
  if (raw.startsWith('/') || /^[A-Za-z]:/.test(raw)) problems.add('absolute')
  if (raw.includes('\\')) problems.add('backslash')
  const segments = raw.split('/')
  for (const [index, segment] of segments.entries()) {
    if (segment === '') {
      if (raw !== '' && index > 0) problems.add('empty-segment')
      continue
    }
    if (segment === '.' || segment === '..') problems.add('parent-segment')
    else {
      if (FORBIDDEN_IN_NAMES.test(segment)) problems.add('forbidden-character')
      if (RESERVED.test(segment)) problems.add('reserved-name')
      if (/[. ]$/.test(segment)) problems.add('trailing-dot-or-space')
    }
    if (utf8Length(segment) > MAX_SEGMENT_BYTES) problems.add('segment-too-long')
  }
  return problems.size === 0 ? ok(raw as ProjectPath) : err([...problems])
}

/** Whether a single file or folder name is reserved on Windows (`con`, `lpt1.md`, …). */
export const isReservedName = (name: string): boolean => RESERVED.test(name)

/** Two paths with the same key are the same file on a case-insensitive disk with mixed normalization. */
export function collisionKey(path: string): string {
  return path.normalize('NFC').toLowerCase()
}

export function dirnameOf(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? '' : path.slice(0, slash)
}

export function basenameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** The file name without its extension. */
export function stemOf(path: string): string {
  const name = basenameOf(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** Resolves `target` (as written in a link) against `fromDir`. `null` if it would leave the project. */
export function resolveRelative(fromDir: string, target: string): string | null {
  const out: string[] = []
  for (const segment of `${fromDir}/${target}`.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (out.length === 0) return null
      out.pop()
    } else out.push(segment)
  }
  return out.join('/')
}

/** The link text that leads from a file in `fromDir` to `to`. */
export function relativePath(fromDir: string, to: string): string {
  const from = fromDir === '' ? [] : fromDir.split('/')
  const target = to.split('/')
  let common = 0
  while (common < from.length && common < target.length - 1 && from[common] === target[common]) common++
  return [...from.slice(common).map(() => '..'), ...target.slice(common)].join('/')
}

function utf8Length(text: string): number {
  let bytes = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4
  }
  return bytes
}
