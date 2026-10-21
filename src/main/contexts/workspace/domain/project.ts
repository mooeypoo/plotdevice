import { readFormatVersion } from './format-version'
import type { ProjectRoot } from './project-root'
import {
  DEFAULT_PROJECT_SETTINGS,
  readProjectSettings,
  type ProjectSettings
} from './project-settings'
import type { ProjectWarning } from './project-warning'

/**
 * An open project as the workspace context sees it: the keys of novel.md it owns. Other contexts
 * read `calendar`, `threads`, and `statuses` themselves.
 */
export interface Project {
  readonly root: ProjectRoot
  readonly title: string
  readonly author?: string
  readonly formatVersion: number
  /** True when the app must not write to this project, for example a newer format. */
  readonly readOnly: boolean
  readonly settings: ProjectSettings
  readonly warnings: readonly ProjectWarning[]
}

/** Why novel.md exists but its keys can't be read. */
export type NovelFileProblem = Extract<ProjectWarning, { code: 'novel-file-unreadable' }>['problem']

/** Reads a project from the parsed frontmatter of its novel.md. */
export function readProject(root: ProjectRoot, folderName: string, frontmatter: unknown): Project {
  const keys = isMapping(frontmatter) ? frontmatter : {}
  const warnings: ProjectWarning[] = []

  const format = readFormatVersion(keys['format'])
  if (format.warning !== undefined) warnings.push(format.warning)

  const title = readText(keys['title'], 'title-invalid', warnings)
  const author = readText(keys['author'], 'author-invalid', warnings)

  const settings = readProjectSettings(keys['settings'])
  warnings.push(...settings.warnings)

  return {
    root,
    title: title ?? folderName,
    ...(author !== undefined ? { author } : {}),
    formatVersion: format.version,
    readOnly: format.readOnly,
    settings: settings.settings,
    warnings
  }
}

/** A project whose novel.md can't be read: opened read-only with defaults, so nothing is written. */
export function readUnreadableProject(
  root: ProjectRoot,
  folderName: string,
  problem: NovelFileProblem
): Project {
  return {
    root,
    title: folderName,
    formatVersion: 1,
    readOnly: true,
    settings: DEFAULT_PROJECT_SETTINGS,
    warnings: [
      {
        code: 'novel-file-unreadable',
        problem
      }
    ]
  }
}

/** Trimmed, non-empty text, or `undefined` (with a warning if the value had the wrong type). */
function readText(
  value: unknown,
  code: 'title-invalid' | 'author-invalid',
  warnings: ProjectWarning[]
): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    warnings.push({ code })
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
