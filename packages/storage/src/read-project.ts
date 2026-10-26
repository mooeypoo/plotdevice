import type {
  ChapterFile,
  FileStore,
  OpenProblem,
  ProjectSnapshot,
  ProjectWarning,
  RecoveryOutcome,
  Revision,
} from '@plotdevice/application'
import {
  CURRENT_SCHEMA_VERSION,
  findDuplicateIds,
  findOutdatedLinkText,
  suggestRelinks,
  type ChapterNumbering,
  type Contents,
  type ContentsChapter,
  type ContentsEntry,
  type ProjectDetails,
  type ProjectId,
} from '@plotdevice/domain'
import { parseContents, readFrontmatter, type ContentsChapterItem } from '@plotdevice/markdown'
import { collisionKey, err, ok, parseProjectPath, resolveRelative, type ProjectPath, type Result } from '@plotdevice/shared'

export const PROJECT_FILE = 'project.md' as ProjectPath
export const CONTENTS_FILE = 'CONTENTS.md' as ProjectPath
export const MANUSCRIPT_FOLDER = 'manuscript'

const NUMBERING: readonly ChapterNumbering[] = ['continuous', 'per-part', 'none']

/** Reads `project.md`'s details. Missing optional values get their defaults; an unknown numbering style is reported. */
export async function readDetails(store: FileStore, warnings: ProjectWarning[]): Promise<Result<ProjectDetails, OpenProblem>> {
  const file = await store.read(PROJECT_FILE)
  if (!file.ok) return err(file.error === 'missing' ? 'not-a-project' : file.error === 'io' ? 'io' : 'unreadable-project-file')
  const values = readFrontmatter(file.value.text)
  if (!values.ok) return err('unreadable-project-file')
  const { title, author, language, chapterNumbering, id, schemaVersion } = values.value
  if (typeof title !== 'string' || title.trim() === '') return err('unreadable-project-file')
  const version = typeof schemaVersion === 'number' ? schemaVersion : 1
  if (version > CURRENT_SCHEMA_VERSION) return err('newer-format')
  const numbering = NUMBERING.find((n) => n === chapterNumbering)
  if (chapterNumbering !== undefined && !numbering)
    warnings.push({ file: PROJECT_FILE, code: 'unknown-chapter-numbering', detail: String(chapterNumbering) })
  return ok({
    title: title.trim(),
    ...(typeof author === 'string' && author.trim() ? { author: author.trim() } : {}),
    language: typeof language === 'string' ? language : 'en',
    chapterNumbering: numbering ?? 'continuous',
    ...(typeof id === 'string' ? { id: id as ProjectId } : {}),
    schemaVersion: version,
  })
}

/** `CONTENTS.md` as domain contents, with warnings for anything that isn't a chapter or a part. */
export function contentsFromText(text: string, warnings: ProjectWarning[]): Contents {
  const parsed = parseContents(text)
  for (const warning of parsed.warnings)
    warnings.push({ file: CONTENTS_FILE, code: warning.code, line: warning.line, detail: warning.text })
  const chapter = (item: ContentsChapterItem): ContentsChapter[] => {
    const resolved = resolveRelative('', item.target)
    const path = resolved === null ? null : parseProjectPath(resolved)
    if (!path?.ok) {
      warnings.push({ file: CONTENTS_FILE, code: 'invalid-path', line: item.line, detail: item.target })
      return []
    }
    return [{ kind: 'chapter', file: path.value, linkText: item.linkText }]
  }
  return {
    entries: parsed.entries.flatMap<ContentsEntry>((entry) =>
      entry.kind === 'chapter' ? chapter(entry) : [{ kind: 'part', name: entry.name, chapters: entry.chapters.flatMap(chapter) }],
    ),
  }
}

/** Reads the whole project into a snapshot. Opening never changes a file (recovery aside, which runs before). */
export async function readProject(
  root: string,
  store: FileStore,
  recovered: RecoveryOutcome[],
): Promise<Result<ProjectSnapshot, OpenProblem>> {
  const warnings: ProjectWarning[] = []
  const details = await readDetails(store, warnings)
  if (!details.ok) return details
  const contentsFile = await store.read(CONTENTS_FILE)
  if (!contentsFile.ok) return err(contentsFile.error === 'missing' ? 'not-a-project' : 'unreadable-contents')
  const contents = contentsFromText(contentsFile.value.text, warnings)

  const listed = contents.entries.flatMap((e) => (e.kind === 'chapter' ? [e] : e.chapters))
  const listedKeys = new Set(listed.map((c) => collisionKey(c.file)))
  const files = await store.listMarkdownFiles()
  const fileKeys = new Set(files.map(collisionKey))
  const chapterPaths = files.filter((file) => file.startsWith(`${MANUSCRIPT_FOLDER}/`) || listedKeys.has(collisionKey(file)))

  const chapters: ChapterFile[] = []
  for (const file of chapterPaths) chapters.push(await readChapterFile(store, file, listedKeys.has(collisionKey(file))))

  const missing = listed.filter((c) => !fileKeys.has(collisionKey(c.file)))
  const titles = new Map(chapters.flatMap((c) => (c.title !== undefined ? [[c.file, c.title] as const] : [])))
  const unlisted = chapters.filter((c) => !c.listed)

  return ok({
    root,
    details: details.value,
    contents,
    contentsRevision: contentsFile.value.revision,
    chapters,
    missing: missing.map((c) => c.file),
    outdatedLinkText: findOutdatedLinkText(contents, titles),
    relinkSuggestions: suggestRelinks(
      missing.map((c) => ({ file: c.file, linkText: c.linkText })),
      unlisted.map((c) => ({ file: c.file, title: c.title, id: c.id })),
    ),
    duplicateIds: findDuplicateIds(chapters.map((c) => ({ file: c.file, id: c.id }))),
    warnings,
    recovered,
  })
}

async function readChapterFile(store: FileStore, file: ProjectPath, listed: boolean): Promise<ChapterFile> {
  const read = await store.read(file)
  if (!read.ok) return { file, status: 'unreadable', listed }
  const values = readFrontmatter(read.value.text)
  if (!values.ok) return { file, status: 'unreadable', listed, revision: read.value.revision }
  const { title, id } = values.value
  return {
    file,
    status: 'ok',
    listed,
    revision: read.value.revision as Revision,
    ...(typeof title === 'string' ? { title: title.trim() } : {}),
    ...(typeof id === 'string' ? { id } : {}),
  }
}
