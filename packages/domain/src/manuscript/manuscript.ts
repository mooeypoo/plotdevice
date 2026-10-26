import { collisionKey, err, ok, type ProjectPath, type Result } from '@plotdevice/shared'

/**
 * The book's structure as `CONTENTS.md` describes it (ADR 0006): chapters in reading order, optionally
 * grouped into parts that don't nest. A chapter is identified by its file; its title lives in the
 * chapter itself, and `linkText` is the contents' copy of it.
 */
export interface ContentsChapter {
  readonly kind: 'chapter'
  readonly file: ProjectPath
  readonly linkText: string
}

export interface ContentsPart {
  readonly kind: 'part'
  readonly name: string
  readonly chapters: readonly ContentsChapter[]
}

export type ContentsEntry = ContentsChapter | ContentsPart

export interface Contents {
  readonly entries: readonly ContentsEntry[]
}

/**
 * Where a chapter goes. `part` is the top-level position of a part (as it was *before* any chapter
 * moved), or `null` for the top level; `index` counts the other entries there.
 */
export interface Placement {
  readonly part: number | null
  readonly index: number
}

export type ManuscriptProblem = 'already-in-book' | 'not-in-book' | 'no-such-position' | 'not-a-part' | 'empty-name' | 'multiline-name'

/** How chapter numbers are shown (a project setting). Numbers are never written into files. */
export type ChapterNumbering = 'continuous' | 'per-part' | 'none'

interface Location {
  part: number | null
  index: number
}

function locate(contents: Contents, file: ProjectPath): Location | null {
  const key = collisionKey(file)
  for (const [i, entry] of contents.entries.entries()) {
    if (entry.kind === 'chapter' && collisionKey(entry.file) === key) return { part: null, index: i }
    if (entry.kind === 'part') {
      const j = entry.chapters.findIndex((chapter) => collisionKey(chapter.file) === key)
      if (j !== -1) return { part: i, index: j }
    }
  }
  return null
}

function checkName(name: string): Result<string, ManuscriptProblem> {
  const trimmed = name.trim()
  if (trimmed === '') return err('empty-name')
  if (/[\r\n]/.test(trimmed)) return err('multiline-name')
  return ok(trimmed)
}

function withoutChapterAt(contents: Contents, at: Location): Contents {
  if (at.part === null) return { entries: contents.entries.filter((_, i) => i !== at.index) }
  return {
    entries: contents.entries.map((entry, i) =>
      i === at.part && entry.kind === 'part' ? { ...entry, chapters: entry.chapters.filter((_, j) => j !== at.index) } : entry,
    ),
  }
}

function insertAt(contents: Contents, chapter: ContentsChapter, placement: Placement): Result<Contents, ManuscriptProblem> {
  if (placement.part === null) {
    if (placement.index < 0 || placement.index > contents.entries.length) return err('no-such-position')
    const entries = [...contents.entries]
    entries.splice(placement.index, 0, chapter)
    return ok({ entries })
  }
  const part = contents.entries[placement.part]
  if (!part || part.kind !== 'part') return err('not-a-part')
  if (placement.index < 0 || placement.index > part.chapters.length) return err('no-such-position')
  const chapters = [...part.chapters]
  chapters.splice(placement.index, 0, chapter)
  return ok({ entries: contents.entries.map((entry, i) => (i === placement.part ? { ...part, chapters } : entry)) })
}

export function addChapter(contents: Contents, chapter: ContentsChapter, placement: Placement): Result<Contents, ManuscriptProblem> {
  if (locate(contents, chapter.file)) return err('already-in-book')
  const name = checkName(chapter.linkText)
  if (!name.ok) return name
  return insertAt(contents, { ...chapter, linkText: name.value }, placement)
}

export function moveChapter(contents: Contents, file: ProjectPath, placement: Placement): Result<Contents, ManuscriptProblem> {
  const from = locate(contents, file)
  if (!from) return err('not-in-book')
  if (placement.part !== null && contents.entries[placement.part]?.kind !== 'part') return err('not-a-part')
  const chapter = from.part === null ? contents.entries[from.index] : (contents.entries[from.part] as ContentsPart).chapters[from.index]
  if (!chapter || chapter.kind !== 'chapter') return err('not-in-book')
  // Removing a top-level chapter shifts the parts after it up by one.
  const part = placement.part !== null && from.part === null && from.index < placement.part ? placement.part - 1 : placement.part
  return insertAt(withoutChapterAt(contents, from), chapter, { part, index: placement.index })
}

export function removeChapter(contents: Contents, file: ProjectPath): Result<Contents, ManuscriptProblem> {
  const at = locate(contents, file)
  return at ? ok(withoutChapterAt(contents, at)) : err('not-in-book')
}

export function renameChapterLink(contents: Contents, file: ProjectPath, title: string): Result<Contents, ManuscriptProblem> {
  const name = checkName(title)
  if (!name.ok) return name
  return mapChapter(contents, file, (chapter) => ({ ...chapter, linkText: name.value }))
}

/** After a file rename, the contents points at the new file. */
export function replaceChapterFile(contents: Contents, from: ProjectPath, to: ProjectPath): Result<Contents, ManuscriptProblem> {
  if (collisionKey(from) !== collisionKey(to) && locate(contents, to)) return err('already-in-book')
  return mapChapter(contents, from, (chapter) => ({ ...chapter, file: to }))
}

function mapChapter(
  contents: Contents,
  file: ProjectPath,
  change: (chapter: ContentsChapter) => ContentsChapter,
): Result<Contents, ManuscriptProblem> {
  const at = locate(contents, file)
  if (!at) return err('not-in-book')
  return ok({
    entries: contents.entries.map((entry, i) => {
      if (at.part === null) return i === at.index && entry.kind === 'chapter' ? change(entry) : entry
      if (i !== at.part || entry.kind !== 'part') return entry
      return { ...entry, chapters: entry.chapters.map((chapter, j) => (j === at.index ? change(chapter) : chapter)) }
    }),
  })
}

export function addPart(contents: Contents, name: string, index: number): Result<Contents, ManuscriptProblem> {
  const checked = checkName(name)
  if (!checked.ok) return checked
  if (index < 0 || index > contents.entries.length) return err('no-such-position')
  const entries = [...contents.entries]
  entries.splice(index, 0, { kind: 'part', name: checked.value, chapters: [] })
  return ok({ entries })
}

export function renamePart(contents: Contents, part: number, name: string): Result<Contents, ManuscriptProblem> {
  const checked = checkName(name)
  if (!checked.ok) return checked
  if (contents.entries[part]?.kind !== 'part') return err('not-a-part')
  return ok({
    entries: contents.entries.map((entry, i) => (i === part && entry.kind === 'part' ? { ...entry, name: checked.value } : entry)),
  })
}

/** Every chapter in reading order. */
export function chaptersInOrder(contents: Contents): ContentsChapter[] {
  return contents.entries.flatMap((entry) => (entry.kind === 'chapter' ? [entry] : entry.chapters))
}

/**
 * The number shown for each chapter, in reading order. `per-part` restarts in each part and leaves
 * chapters outside parts (a prologue, an epilogue) unnumbered.
 */
export function chapterNumbers(contents: Contents, numbering: ChapterNumbering): Map<ProjectPath, number | null> {
  const numbers = new Map<ProjectPath, number | null>()
  let counter = 0
  for (const entry of contents.entries) {
    if (entry.kind === 'chapter') numbers.set(entry.file, numbering === 'continuous' ? ++counter : null)
    else {
      if (numbering === 'per-part') counter = 0
      for (const chapter of entry.chapters) numbers.set(chapter.file, numbering === 'none' ? null : ++counter)
    }
  }
  return numbers
}

export interface OutdatedLinkText {
  file: ProjectPath
  linkText: string
  title: string
}

/** Chapters whose contents link no longer shows their title (for example after an interrupted rename). */
export function findOutdatedLinkText(contents: Contents, titles: ReadonlyMap<ProjectPath, string>): OutdatedLinkText[] {
  return chaptersInOrder(contents).flatMap((chapter) => {
    const title = titles.get(chapter.file)
    return title !== undefined && title.trim() !== chapter.linkText.trim()
      ? [{ file: chapter.file, linkText: chapter.linkText, title: title.trim() }]
      : []
  })
}
