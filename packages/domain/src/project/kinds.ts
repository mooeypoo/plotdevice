import { collisionKey, err, FORBIDDEN_IN_NAMES, freeFolderName, isReservedName, ok, safeFileStem, type Result } from '@plotdevice/shared'

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
  return freeFolderName(plural, [...kinds.map((kind) => kind.folder), ...BOOK_FOLDERS])
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

/** A change the author makes on the "Kinds of pages" screen (Milestone 18). */
export type KindsChange =
  | { kind: 'add'; one: string; many: string; folder: string }
  | { kind: 'rename'; folder: string; one: string; many: string }
  | { kind: 'move'; folder: string; index: number }
  | { kind: 'remove'; folder: string }
  | { kind: 'unit'; unit: ManuscriptUnit | null }
  /** What the book calls a part (ADR 0013); `null` for the app's own word. */
  | { kind: 'part-unit'; unit: ManuscriptUnit | null }

/** What the "Kinds of pages" screen changes in `project.md`. */
export interface BookNames {
  kinds: readonly PageKind[]
  manuscriptUnit: ManuscriptUnit | null
  partUnit: ManuscriptUnit | null
}

/** Both names trimmed, or `empty-name`; `null` goes back to the app's own word. */
function cleanUnit(unit: ManuscriptUnit | null): Result<ManuscriptUnit | null, KindProblem> {
  if (unit === null) return ok(null)
  const clean = { one: unit.one.trim(), many: unit.many.trim() }
  return clean.one === '' || clean.many === '' ? err('empty-name') : ok(clean)
}

/**
 * Applies one change to a book's kinds and the names of its chapters and parts. "Make this a kind…"
 * for an unsorted folder is an `add` with that folder. Nothing here touches a folder or a page.
 */
export function applyKindsChange(current: BookNames, change: KindsChange): Result<BookNames, KindProblem> {
  const names = { kinds: current.kinds, manuscriptUnit: current.manuscriptUnit, partUnit: current.partUnit }
  const unchanged = (kinds: readonly PageKind[]) => ok({ ...names, kinds })
  const known = (folder: string) => current.kinds.some((kind) => kind.folder === folder)
  switch (change.kind) {
    case 'add': {
      const added = addKind(current.kinds, change)
      return added.ok ? unchanged(added.value) : added
    }
    case 'rename': {
      if (!known(change.folder)) return err('invalid-kinds')
      const renamed = renameKind(current.kinds, change.folder, change)
      return renamed.ok ? unchanged(renamed.value) : renamed
    }
    case 'move':
      return known(change.folder) ? unchanged(moveKind(current.kinds, change.folder, change.index)) : err('invalid-kinds')
    case 'remove':
      return known(change.folder) ? unchanged(removeKind(current.kinds, change.folder)) : err('invalid-kinds')
    case 'unit': {
      const unit = cleanUnit(change.unit)
      return unit.ok ? ok({ ...names, manuscriptUnit: unit.value }) : unit
    }
    case 'part-unit': {
      const unit = cleanUnit(change.unit)
      return unit.ok ? ok({ ...names, partUnit: unit.value }) : unit
    }
  }
}

/** A folder to rename so it matches what the author calls its kind (ADR 0011, decision 7). */
export interface FolderRename {
  from: string
  to: string
}

/**
 * The kinds whose folder no longer matches their plural: "Match folder names…" offers to rename these.
 * The default kinds, unrenamed, always match. Only the names decide; whether a rename can happen
 * (a folder in the way, a name some system refuses) is checked when it is planned.
 */
export function folderMismatches(kinds: readonly PageKind[]): FolderRename[] {
  return kinds.flatMap((kind) => {
    if (kind.many === undefined) return []
    const to = safeFileStem(kind.many, 'kind')
    return to === kind.folder ? [] : [{ from: kind.folder, to }]
  })
}

/** The kinds after their folders are renamed: the same names and order, new folders. */
export function withRenamedFolders(kinds: readonly PageKind[], renames: readonly FolderRename[]): PageKind[] {
  return kinds.map((kind) => {
    const rename = renames.find((each) => each.from === kind.folder)
    return rename ? { ...kind, folder: rename.to } : kind
  })
}
