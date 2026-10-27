import type { FileStore } from '@plotdevice/application'
import { kindOfFile, OUTLINES_FOLDER, REFERENCE_FOLDERS, unresolvedLink, type ReferenceKind } from '@plotdevice/domain'
import { locateLinks, parseContents, readFrontmatter } from '@plotdevice/markdown'
import { dirnameOf, type ProjectPath } from '@plotdevice/shared'
import { CONTENTS_FILE, MANUSCRIPT_FOLDER, PROJECT_FILE, readProject } from './read-project'

/**
 * `fix`: the app can't use something as written (a missing chapter, a broken link, unreadable details).
 * `know`: the app copes, but the author may not expect what it shows (a chapter "Not in the book yet").
 */
export type CheckSeverity = 'fix' | 'know'

export type CheckCode =
  | 'missing-file'
  | 'unreadable-file'
  | 'unreadable-project-file'
  | 'newer-format'
  | 'missing-chapter'
  | 'unreadable-details'
  | 'broken-link'
  | 'ambiguous-link'
  | 'not-in-book'
  | 'outdated-link-text'
  | 'outside-folders'
  | 'duplicate-id'
  /** Any of the contents' and project file's own warnings, by their code (`ignored-content`…). */
  | (string & {})

export interface CheckFinding {
  severity: CheckSeverity
  code: CheckCode
  file: ProjectPath
  line?: number
  /** The link target, the other file, or the text concerned. */
  detail?: string
}

export interface ProjectCheck {
  title: string | null
  counts: { chapters: number; characters: number; places: number; notes: number; outlines: number }
  findings: CheckFinding[]
}

const BOOK_FOLDERS = [MANUSCRIPT_FOLDER, OUTLINES_FOLDER, ...Object.values(REFERENCE_FOLDERS)]

/**
 * What the app would make of a book folder, as a list to act on: for an author or an assistant who
 * wrote the files outside the app (Milestone 13). It reads the folder the way opening it does, and
 * only reads: no file is written, repaired or created.
 */
export async function checkProject(store: FileStore): Promise<ProjectCheck> {
  const counts = { chapters: 0, characters: 0, places: 0, notes: 0, outlines: 0 }
  const findings: CheckFinding[] = []
  const fix = (code: CheckCode, file: ProjectPath, more: Partial<CheckFinding> = {}) =>
    findings.push({ severity: 'fix', code, file, ...more })
  const know = (code: CheckCode, file: ProjectPath, more: Partial<CheckFinding> = {}) =>
    findings.push({ severity: 'know', code, file, ...more })

  const contentsText = await store.read(CONTENTS_FILE)
  const opened = await readProject('', store, [])
  if (!opened.ok) {
    if (opened.error === 'not-a-project') {
      if (!(await store.read(PROJECT_FILE)).ok) fix('missing-file', PROJECT_FILE)
      if (!contentsText.ok) fix(contentsText.error === 'missing' ? 'missing-file' : 'unreadable-file', CONTENTS_FILE)
    } else if (opened.error === 'unreadable-contents') fix('unreadable-file', CONTENTS_FILE)
    else if (opened.error === 'newer-format') fix('newer-format', PROJECT_FILE)
    else fix('unreadable-project-file', PROJECT_FILE)
    return { title: null, counts, findings }
  }
  const project = opened.value

  // Lines in CONTENTS.md, so a problem there can say where.
  const contentsLines = new Map<string, number>()
  if (contentsText.ok)
    for (const entry of parseContents(contentsText.value.text).entries)
      for (const chapter of entry.kind === 'chapter' ? [entry] : entry.chapters) contentsLines.set(chapter.target, chapter.line)
  const lineInContents = (file: string) => {
    const line = contentsLines.get(file)
    return line === undefined ? {} : { line }
  }

  for (const warning of project.warnings)
    know(warning.code, warning.file, {
      ...(warning.line ? { line: warning.line } : {}),
      ...(warning.detail ? { detail: warning.detail } : {}),
    })
  for (const file of project.missing) fix('missing-chapter', CONTENTS_FILE, { ...lineInContents(file), detail: file })
  for (const chapter of project.chapters) if (!chapter.listed) know('not-in-book', chapter.file)
  for (const outdated of project.outdatedLinkText)
    know('outdated-link-text', CONTENTS_FILE, { ...lineInContents(outdated.file), detail: outdated.file })
  for (const duplicate of project.duplicateIds) for (const file of duplicate.files) know('duplicate-id', file, { detail: duplicate.id })
  counts.chapters = project.chapters.filter((chapter) => chapter.listed).length

  const files = await store.listMarkdownFiles()
  const chapters = new Set(project.chapters.map((chapter) => chapter.file))
  const kindCount: Record<ReferenceKind, 'characters' | 'places' | 'notes'> = { character: 'characters', place: 'places', note: 'notes' }
  for (const file of files) {
    if (file === PROJECT_FILE || file === CONTENTS_FILE) continue
    const kind = kindOfFile(file)
    if (kind) counts[kindCount[kind]]++
    else if (file.startsWith(`${OUTLINES_FOLDER}/`)) counts.outlines++
    else if (!chapters.has(file) && !BOOK_FOLDERS.some((folder) => file.startsWith(`${folder}/`))) know('outside-folders', file)

    const read = await store.read(file)
    if (!read.ok) {
      fix('unreadable-file', file)
      continue
    }
    if (!readFrontmatter(read.value.text).ok) fix('unreadable-details', file)
    for (const { link, line } of locateLinks(read.value.text, dirnameOf(file))) {
      const problem = unresolvedLink(link, files)
      if (problem)
        fix(problem === 'missing' ? 'broken-link' : 'ambiguous-link', file, {
          line,
          detail: link.kind === 'path' ? link.target : link.name,
        })
    }
  }

  // Things to fix first, then by file; within a file, as found.
  const order = (finding: CheckFinding) => (finding.severity === 'fix' ? 0 : 1)
  findings.sort((a, b) => order(a) - order(b) || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || (a.line ?? 0) - (b.line ?? 0))
  return { title: project.details.title, counts, findings }
}
