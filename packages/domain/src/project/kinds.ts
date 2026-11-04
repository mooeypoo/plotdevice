import { collisionKey, err, FORBIDDEN_IN_NAMES, isReservedName, ok, type Result } from '@plotdevice/shared'
import { safeStem } from '../manuscript/chapter-files'

/**
 * The kinds of pages a book has (ADR 0011), read from `project.md`. A kind is its folder; `one` and
 * `many` are the names the author gave it, in any language. The default kinds have none: the app's
 * own names, in the interface's language, are used for them.
 */
export interface PageKind {
  folder: string
  one?: string
  many?: string
}

/** What the interface calls a chapter in this book ("Session", "Sessions"); files are unchanged. */
export interface ManuscriptUnit {
  one: string
  many: string
}

export const DEFAULT_KINDS: readonly PageKind[] = [{ folder: 'characters' }, { folder: 'places' }, { folder: 'notes' }]

/** Folders that belong to the book itself and can never be a kind of page. */
const BOOK_FOLDERS = new Set(['manuscript', 'outlines'])

export type KindProblem = 'invalid-kinds' | 'empty-name' | 'folder-taken' | 'invalid-folder'

const isText = (value: unknown): value is string => typeof value === 'string'

/** A single folder name the app can create on every system, and not one of the book's own. */
export function isValidKindFolder(folder: string): boolean {
  const name = folder.trim()
  return (
    name !== '' &&
    name === folder &&
    !/[\\/]/.test(name) &&
    !FORBIDDEN_IN_NAMES.test(name) &&
    !/^\.|\.$/.test(name) &&
    !isReservedName(name) &&
    !BOOK_FOLDERS.has(collisionKey(name))
  )
}

/** `kinds` from `project.md`: absent means the defaults; anything the app can't use safely is refused. */
export function parseKinds(value: unknown): Result<readonly PageKind[], 'invalid-kinds'> {
  if (value === undefined || value === null) return ok(DEFAULT_KINDS)
  if (!Array.isArray(value)) return err('invalid-kinds')
  const kinds: PageKind[] = []
  const seen = new Set<string>()
  for (const entry of value as unknown[]) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return err('invalid-kinds')
    const { folder, one, many } = entry as Record<string, unknown>
    if (!isText(folder) || !isValidKindFolder(folder) || seen.has(collisionKey(folder))) return err('invalid-kinds')
    if ((one !== undefined && !isText(one)) || (many !== undefined && !isText(many))) return err('invalid-kinds')
    seen.add(collisionKey(folder))
    kinds.push({ folder, ...(isText(one) ? { one } : {}), ...(isText(many) ? { many } : {}) })
  }
  return ok(kinds)
}

/** `manuscriptUnit` from `project.md`: both names, or none. */
export function parseManuscriptUnit(value: unknown): Result<ManuscriptUnit | null, 'invalid-unit'> {
  if (value === undefined || value === null) return ok(null)
  if (typeof value !== 'object' || Array.isArray(value)) return err('invalid-unit')
  const { one, many } = value as Record<string, unknown>
  return isText(one) && isText(many) && one.trim() !== '' && many.trim() !== '' ? ok({ one, many }) : err('invalid-unit')
}

/** True when the list is exactly the defaults, so `project.md` needs no `kinds` key at all. */
export function isDefaultKinds(kinds: readonly PageKind[]): boolean {
  return (
    kinds.length === DEFAULT_KINDS.length &&
    kinds.every((kind, i) => kind.folder === DEFAULT_KINDS[i]?.folder && kind.one === undefined && kind.many === undefined)
  )
}

/** A new kind's folder, from its plural: made safe for every system, and free ("characters-2"). */
export function folderForKind(plural: string, kinds: readonly PageKind[]): string {
  const stem = safeStem(plural, 'kind')
  const taken = new Set([...kinds.map((kind) => collisionKey(kind.folder)), ...BOOK_FOLDERS])
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? stem : `${stem}-${n}`
    if (!taken.has(collisionKey(candidate))) return candidate
  }
}

export function addKind(kinds: readonly PageKind[], kind: { one: string; many: string; folder: string }): Result<PageKind[], KindProblem> {
  const one = kind.one.trim()
  const many = kind.many.trim()
  if (one === '' || many === '') return err('empty-name')
  if (!isValidKindFolder(kind.folder)) return err('invalid-folder')
  if (kinds.some((each) => collisionKey(each.folder) === collisionKey(kind.folder))) return err('folder-taken')
  return ok([...kinds, { folder: kind.folder, one, many }])
}

/** New names for a kind; its folder stays (ADR 0011, decision 6). */
export function renameKind(
  kinds: readonly PageKind[],
  folder: string,
  names: { one: string; many: string },
): Result<PageKind[], KindProblem> {
  const one = names.one.trim()
  const many = names.many.trim()
  if (one === '' || many === '') return err('empty-name')
  return ok(kinds.map((kind) => (kind.folder === folder ? { folder, one, many } : kind)))
}

export function moveKind(kinds: readonly PageKind[], folder: string, index: number): PageKind[] {
  const kind = kinds.find((each) => each.folder === folder)
  if (!kind) return [...kinds]
  const rest = kinds.filter((each) => each.folder !== folder)
  rest.splice(Math.max(0, Math.min(index, rest.length)), 0, kind)
  return rest
}

/** Takes a kind off the list; its folder and pages stay, and show as "Not sorted yet" (ADR 0011, decision 5). */
export function removeKind(kinds: readonly PageKind[], folder: string): PageKind[] {
  return kinds.filter((kind) => kind.folder !== folder)
}
