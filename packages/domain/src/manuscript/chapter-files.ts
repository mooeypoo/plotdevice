import { collisionKey, isReservedName, type ProjectPath } from '@plotdevice/shared'

const MANUSCRIPT = 'manuscript'
const MAX_STEM_CHARACTERS = 100
/** Forbidden on Windows, plus characters that would complicate Markdown links (`[]()#%{}`). */
const UNSAFE_IN_FILE_NAMES = /[<>:"/\\|?*\u0000-\u001f[\]()#%{}]/g
const UNSAFE_IN_FOLDER_NAMES = /[<>:"/\\|?*\u0000-\u001f]/g

/**
 * The file for a new chapter, from its title: "The Crossing" → `manuscript/the-crossing.md`. Letters
 * of any script are kept (Hebrew stays Hebrew); taken names get `-2`, `-3`… The file is never renamed
 * automatically afterwards (owner decision); the author can rename it explicitly.
 */
export function chapterFileFor(title: string, existing: readonly ProjectPath[]): ProjectPath {
  const stem = safeStem(title)
  const taken = new Set(existing.map(collisionKey))
  for (let n = 1; ; n++) {
    const candidate = `${MANUSCRIPT}/${n === 1 ? stem : `${stem}-${n}`}.md`
    if (!taken.has(collisionKey(candidate))) return candidate as ProjectPath
  }
}

function safeStem(title: string): string {
  const slug = title
    .normalize('NFC')
    .toLowerCase()
    .replace(UNSAFE_IN_FILE_NAMES, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  const short = Array.from(slug).slice(0, MAX_STEM_CHARACTERS).join('').replace(/[-.]+$/, '')
  if (short === '') return 'chapter'
  return isReservedName(short) ? `${short}-chapter` : short
}

/** The folder for a new project: the title as written, minus characters no file system accepts. */
export function projectFolderName(title: string): string {
  const name = title
    .normalize('NFC')
    .replace(UNSAFE_IN_FOLDER_NAMES, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  if (name === '') return 'Untitled project'
  return isReservedName(name) ? `${name} project` : name
}

export interface ChapterFileWithId {
  file: ProjectPath
  id: string | undefined
}

export interface RenameSuggestion {
  missing: ProjectPath
  found: ProjectPath
}

/**
 * Suggests which unlisted file a missing chapter became after a rename outside the app, by matching
 * ids only (never names). Ambiguous ids suggest nothing; the author always confirms.
 */
export function matchRenamedChapters(missing: readonly ChapterFileWithId[], unlisted: readonly ChapterFileWithId[]): RenameSuggestion[] {
  const count = (list: readonly ChapterFileWithId[], id: string): number => list.filter((c) => c.id === id).length
  return missing.flatMap(({ file, id }) => {
    if (!id || count(missing, id) !== 1 || count(unlisted, id) !== 1) return []
    const found = unlisted.find((c) => c.id === id)
    return found ? [{ missing: file, found: found.file }] : []
  })
}
