import { parseProjectPath, projectPathSegments } from '../../../shared-kernel/project-path'
import type { ProjectWarning } from './project-warning'

/** When a title changes, whether the app renames the file to match. */
export type FileNameSync = 'ask' | 'always' | 'never'

/** The entry types the app creates files for, each with a default folder. */
export type FolderKind = 'part' | 'chapter' | 'character' | 'location' | 'note'

/** The `settings` block of novel.md, with defaults filled in. */
export interface ProjectSettings {
  readonly fileNames: FileNameSync
  readonly orderPrefix: boolean
  /** Project-relative folders where the app puts new files of each kind. */
  readonly folders: Readonly<Record<FolderKind, string>>
}

/** The defaults from docs/file-format.md, used for every key that is missing or invalid. */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  fileNames: 'ask',
  orderPrefix: false,
  folders: {
    part: 'manuscript',
    chapter: 'manuscript',
    character: 'characters',
    location: 'locations',
    note: 'notes'
  }
}

const FILE_NAME_SYNC_VALUES: readonly string[] = ['ask', 'always', 'never']
const FOLDER_KINDS: readonly FolderKind[] = ['part', 'chapter', 'character', 'location', 'note']

/** Settings plus a warning for each value that was replaced by its default. */
export interface ProjectSettingsReading {
  readonly settings: ProjectSettings
  readonly warnings: readonly ProjectWarning[]
}

/** Reads the raw `settings` value of novel.md. Never fails: invalid values fall back to defaults. */
export function readProjectSettings(value: unknown): ProjectSettingsReading {
  if (value === undefined || value === null) {
    return { settings: DEFAULT_PROJECT_SETTINGS, warnings: [] }
  }
  if (!isMapping(value)) {
    return {
      settings: DEFAULT_PROJECT_SETTINGS,
      warnings: [
        { code: 'settings-invalid', message: '"settings" should be a mapping; using defaults.' }
      ]
    }
  }

  const warnings: ProjectWarning[] = []
  const invalid = (key: string, raw: unknown, expected: string): void => {
    warnings.push({
      code: 'setting-invalid',
      message: `settings.${key} should be ${expected}, not ${JSON.stringify(raw)}; using the default.`
    })
  }

  let fileNames = DEFAULT_PROJECT_SETTINGS.fileNames
  const rawFileNames = value['file_names']
  if (rawFileNames !== undefined) {
    if (typeof rawFileNames === 'string' && FILE_NAME_SYNC_VALUES.includes(rawFileNames)) {
      fileNames = rawFileNames as FileNameSync
    } else {
      invalid('file_names', rawFileNames, 'ask, always, or never')
    }
  }

  let orderPrefix = DEFAULT_PROJECT_SETTINGS.orderPrefix
  const rawOrderPrefix = value['order_prefix']
  if (rawOrderPrefix !== undefined) {
    if (typeof rawOrderPrefix === 'boolean') orderPrefix = rawOrderPrefix
    else invalid('order_prefix', rawOrderPrefix, 'true or false')
  }

  const folders: Record<FolderKind, string> = { ...DEFAULT_PROJECT_SETTINGS.folders }
  const rawFolders = value['folders']
  if (rawFolders !== undefined && rawFolders !== null) {
    if (!isMapping(rawFolders)) {
      invalid('folders', rawFolders, 'a mapping of entry types to folders')
    } else {
      for (const kind of FOLDER_KINDS) {
        const rawFolder = rawFolders[kind]
        if (rawFolder === undefined) continue
        if (isUsableFolder(rawFolder)) folders[kind] = rawFolder
        else invalid(`folders.${kind}`, rawFolder, 'a folder inside the project, not hidden')
      }
    }
  }

  return { settings: { fileNames, orderPrefix, folders }, warnings }
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A project-relative folder that the project scan would see (no dot-folders). */
function isUsableFolder(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const path = parseProjectPath(value)
  return path.ok && projectPathSegments(path.value).every((segment) => !segment.startsWith('.'))
}
