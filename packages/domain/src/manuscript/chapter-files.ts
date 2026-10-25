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

export interface MissingChapter {
  file: ProjectPath
  linkText: string
}

export interface UnlistedChapter {
  file: ProjectPath
  title: string | undefined
  id: string | undefined
}

export interface RelinkSuggestion {
  missing: ProjectPath
  found: ProjectPath
  reason: 'same-id' | 'same-title'
}

/**
 * Suggests which unlisted file a missing chapter became after a rename outside the app: first by an
 * id the app knew for that path, then by a title equal to the contents' link text. Only unambiguous
 * matches are suggested, and the author always confirms (DOMAIN_AND_FILE_FORMAT.md: no guessing).
 */
export function suggestRelinks(
  missing: readonly MissingChapter[],
  unlisted: readonly UnlistedChapter[],
  knownIds: ReadonlyMap<ProjectPath, string> = new Map(),
): RelinkSuggestion[] {
  const suggestions: RelinkSuggestion[] = []
  const taken = new Set<ProjectPath>()
  const only = <T>(list: T[]): T | undefined => (list.length === 1 ? list[0] : undefined)
  for (const chapter of missing) {
    const id = knownIds.get(chapter.file)
    const byId = id ? only(unlisted.filter((u) => u.id === id)) : undefined
    const byTitle = only(unlisted.filter((u) => u.title?.trim() === chapter.linkText.trim()))
    const found = byId ?? byTitle
    if (!found || taken.has(found.file)) continue
    taken.add(found.file)
    suggestions.push({ missing: chapter.file, found: found.file, reason: byId ? 'same-id' : 'same-title' })
  }
  return suggestions
}

/** Chapters that share an id, for example a copied file. Reported, never fixed silently (ADR 0008). */
export function findDuplicateIds(chapters: readonly ChapterFileWithId[]): { id: string; files: ProjectPath[] }[] {
  const byId = new Map<string, ProjectPath[]>()
  for (const { file, id } of chapters) if (id) byId.set(id, [...(byId.get(id) ?? []), file])
  return [...byId].filter(([, files]) => files.length > 1).map(([id, files]) => ({ id, files }))
}
