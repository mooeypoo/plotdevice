import { parseProjectPath, projectPathSegments } from '../../../shared-kernel/project-path'
import type { ProjectWarning } from './project-warning'
import { describeFrontmatterValue } from '../../../shared-kernel/frontmatter-values'

/** When a title changes, whether the app renames the file to match. */
export type FileNameSync = 'ask' | 'always' | 'never'

/** The entry types the app creates files for, each with a default folder, plus the templates for new entries. */
export type FolderKind = 'part' | 'chapter' | 'character' | 'location' | 'note' | 'template'

/** The `settings` block of novel.md, with defaults filled in. */
export interface ProjectSettings {
  readonly fileNames: FileNameSync
  readonly orderPrefix: boolean
  /** Project-relative folders where the app puts new files of each kind. */
  readonly folders: Readonly<Record<FolderKind, string>>
  /**
   * `settings.vocabulary`: the writer's own word for a word the app recognizes, by its name. The
   * app reads these and never writes them; which names it knows is the composition root's concern.
   */
  readonly vocabulary: Readonly<Record<string, string>>
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
    note: 'notes',
    template: 'templates'
  },
  vocabulary: {}
}

const FILE_NAME_SYNC_VALUES: readonly string[] = ['ask', 'always', 'never']
const FOLDER_KINDS: readonly FolderKind[] = [
  'part',
  'chapter',
  'character',
  'location',
  'note',
  'template'
]

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
      warnings: [{ code: 'settings-invalid' }]
    }
  }

  const warnings: ProjectWarning[] = []
  const invalid = (
    key: string,
    raw: unknown,
    expected: Extract<ProjectWarning, { code: 'setting-invalid' }>['expected']
  ): void => {
    warnings.push({
      code: 'setting-invalid',
      key,
      value: describeFrontmatterValue(raw),
      expected
    })
  }

  let fileNames = DEFAULT_PROJECT_SETTINGS.fileNames
  const rawFileNames = value['file_names']
  if (rawFileNames !== undefined) {
    if (typeof rawFileNames === 'string' && FILE_NAME_SYNC_VALUES.includes(rawFileNames)) {
      fileNames = rawFileNames as FileNameSync
    } else {
      invalid('file_names', rawFileNames, 'file-name-sync')
    }
  }

  let orderPrefix = DEFAULT_PROJECT_SETTINGS.orderPrefix
  const rawOrderPrefix = value['order_prefix']
  if (rawOrderPrefix !== undefined) {
    if (typeof rawOrderPrefix === 'boolean') orderPrefix = rawOrderPrefix
    else invalid('order_prefix', rawOrderPrefix, 'boolean')
  }

  const folders: Record<FolderKind, string> = { ...DEFAULT_PROJECT_SETTINGS.folders }
  const rawFolders = value['folders']
  if (rawFolders !== undefined && rawFolders !== null) {
    if (!isMapping(rawFolders)) {
      invalid('folders', rawFolders, 'folder-mapping')
    } else {
      for (const kind of FOLDER_KINDS) {
        const rawFolder = rawFolders[kind]
        if (rawFolder === undefined) continue
        if (isUsableFolder(rawFolder)) folders[kind] = rawFolder
        else invalid(`folders.${kind}`, rawFolder, 'visible-folder')
      }
    }
  }

  const vocabulary: Record<string, string> = {}
  const rawVocabulary = value['vocabulary']
  if (rawVocabulary !== undefined && rawVocabulary !== null) {
    if (!isMapping(rawVocabulary)) {
      invalid('vocabulary', rawVocabulary, 'vocabulary-mapping')
    } else {
      for (const [name, word] of Object.entries(rawVocabulary)) {
        if (typeof word === 'string' && word.trim() !== '') vocabulary[name] = word.trim()
        else invalid(`vocabulary.${name}`, word, 'vocabulary-mapping')
      }
    }
  }

  return { settings: { fileNames, orderPrefix, folders, vocabulary }, warnings }
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
