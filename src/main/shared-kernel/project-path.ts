import { domainError, type DomainError } from './domain-error'
import type { FileName } from './file-name'
import { nameComparisonKey } from './name-comparison-key'
import { err, ok, type Result } from './result'

declare const projectPathBrand: unique symbol

/**
 * The path of a file or folder relative to the project root, with forward slashes on every OS.
 * It is an entry's identity, so it keeps the exact spelling found on disk.
 */
export type ProjectPath = string & { readonly [projectPathBrand]: true }

/** Why a string was rejected by `parseProjectPath`. */
export type ProjectPathErrorCode =
  'empty' | 'absolute' | 'backslash' | 'empty-segment' | 'dot-segment' | 'control-character'

const DRIVE_LETTER = /^[A-Za-z]:/u
const CONTROL_CHARACTER = /[\u0000-\u001F]/u

/**
 * Checks a project-relative path. It accepts any name the OS allows, because the project may hold
 * files the app didn't create; `parseFileName` is the stricter check for names the app writes.
 */
export function parseProjectPath(
  raw: string
): Result<ProjectPath, DomainError<ProjectPathErrorCode>> {
  if (raw === '') return err(domainError('empty', 'A path cannot be empty.'))
  if (raw.startsWith('/') || DRIVE_LETTER.test(raw)) {
    return err(domainError('absolute', `"${raw}" must be relative to the project folder.`))
  }
  if (raw.includes('\\')) {
    return err(domainError('backslash', `"${raw}" must use forward slashes.`))
  }
  if (CONTROL_CHARACTER.test(raw)) {
    return err(domainError('control-character', 'A path cannot contain control characters.'))
  }

  const segments = raw.split('/')
  if (segments.includes('')) {
    return err(domainError('empty-segment', `"${raw}" has an empty folder name.`))
  }
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return err(domainError('dot-segment', `"${raw}" cannot contain "." or "..".`))
  }
  return ok(raw as ProjectPath)
}

/** The folder and file names that make up the path, from the root down. */
export function projectPathSegments(path: ProjectPath): readonly string[] {
  return path.split('/')
}

/** The last segment: the file or folder name, with its extension. */
export function projectPathName(path: ProjectPath): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** The name without its last extension, which is how wikilinks refer to a file. */
export function projectPathStem(path: ProjectPath): string {
  const name = projectPathName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** The containing folder, or `undefined` for an entry at the project root. */
export function projectPathParent(path: ProjectPath): ProjectPath | undefined {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? undefined : (path.slice(0, slash) as ProjectPath)
}

/** The path of `name` inside `parent`, or at the project root when `parent` is `undefined`. */
export function joinProjectPath(parent: ProjectPath | undefined, name: FileName): ProjectPath {
  return (parent === undefined ? name : `${parent}/${name}`) as ProjectPath
}

/** Whether two paths point to the same entry on a case-insensitive, normalization-blind system. */
export function isSameProjectPath(a: ProjectPath, b: ProjectPath): boolean {
  return nameComparisonKey(a) === nameComparisonKey(b)
}
