import type { GetChronologySettings } from '../contexts/chronology/application/queries/get-chronology-settings'
import type { GetManuscript } from '../contexts/manuscript/application/queries/get-manuscript'
import type {
  OutlineBeat,
  ReadOutlineError,
  ReadOutlineStructure
} from '../contexts/outline/application/queries/read-outline-structure'
import { buildLinkIndex, type LinkIndex } from '../shared-kernel/link-index'
import { markdownLinkTarget } from '../shared-kernel/markdown-link'
import type { ProjectPath } from '../shared-kernel/project-path'
import { ok, type Result } from '../shared-kernel/result'

/** What a beat's card shows of the chapter its first line links to. */
export interface BoardChapter {
  readonly path: ProjectPath
  readonly title: string
  readonly status?: string
  /** `pov` as written in the chapter (`Ilka Szabó`). */
  readonly pov: readonly string[]
  readonly wordCount: number
}

/** One beat card. `line` and `title` address it in later board commands (ADR 0020). */
export interface BoardBeat {
  readonly line: number
  readonly title: string
  /** The beat's notes, without their shared indentation. */
  readonly notes: string
  readonly tags: readonly string[]
  /** Tags that are thread keys in novel.md (Q8). */
  readonly threads: readonly string[]
  readonly chapter?: BoardChapter
}

/** One column. */
export interface BoardColumn {
  readonly line: number
  readonly title: string
  /** The column captured beats go under. */
  readonly inbox: boolean
  readonly beats: readonly BoardBeat[]
}

/** The beat board over one outline: a projection of the file, never stored (ADR 0020). */
export interface PlotBoard {
  readonly path: ProjectPath
  readonly version: string
  /** Text before the first column. */
  readonly preamble: string
  readonly columns: readonly BoardColumn[]
  readonly threads: readonly {
    readonly key: string
    readonly name: string
    readonly color?: string
  }[]
}

/** Reads the board for an outline. */
export type GetPlotBoard = (path: ProjectPath) => Promise<Result<PlotBoard, ReadOutlineError>>

/** Builds the `GetPlotBoard` query from the outline, manuscript, and chronology queries. */
export function createGetPlotBoard(ports: {
  readonly readOutlineStructure: ReadOutlineStructure
  readonly getManuscript: GetManuscript
  readonly getChronologySettings: GetChronologySettings
}): GetPlotBoard {
  return async (path) => {
    const [read, view, chronology] = await Promise.all([
      ports.readOutlineStructure(path),
      ports.getManuscript(),
      ports.getChronologySettings()
    ])
    if (!read.ok) return read
    const { structure, inboxColumn, version } = read.value
    const { manuscript } = view
    const chapters = new Map(
      [
        ...manuscript.parts.flatMap((part) => part.chapters),
        ...manuscript.unnumberedParts.flatMap((part) => part.chapters),
        ...manuscript.chapters,
        ...manuscript.unordered
      ].map(({ chapter }) => [chapter.path, chapter] as const)
    )
    const links = buildLinkIndex(view.linkCandidates)
    const threadKeys = new Set(chronology.threads.map((thread) => thread.key))

    const chapterOf = (beat: OutlineBeat): BoardChapter | undefined => {
      const linked = linkedChapter(beat, links, path, (candidate) => chapters.has(candidate))
      const chapter = linked === undefined ? undefined : chapters.get(linked)
      if (chapter === undefined) return undefined
      return {
        path: chapter.path,
        title: chapter.title,
        ...(chapter.status !== undefined ? { status: chapter.status } : {}),
        pov: chapter.pov,
        wordCount: chapter.wordCount
      }
    }

    return ok({
      path,
      version,
      preamble: textOf(structure.lines.slice(structure.preamble.start, structure.preamble.end)),
      columns: structure.columns.map((column, index) => ({
        line: column.line,
        title: column.title,
        inbox: index === inboxColumn,
        beats: column.beats.map((beat) => {
          const chapter = chapterOf(beat)
          return {
            line: beat.line,
            title: beat.title,
            notes: dedent(structure.lines.slice(beat.notes.start, beat.notes.end)),
            tags: beat.tags,
            threads: beat.tags.filter((tag) => threadKeys.has(tag)),
            ...(chapter !== undefined ? { chapter } : {})
          }
        })
      })),
      threads: chronology.threads
    })
  }
}

/** The first link in a beat's first line that resolves to a chapter. */
function linkedChapter(
  beat: OutlineBeat,
  links: LinkIndex,
  outlinePath: ProjectPath,
  isChapter: (path: ProjectPath) => boolean
): ProjectPath | undefined {
  for (const link of beat.wikiLinks) {
    const resolved = links.resolve(link, 'chapter')
    if (resolved.kind === 'resolved' && isChapter(resolved.path)) return resolved.path
  }
  for (const raw of beat.markdownLinks) {
    const target = markdownLinkTarget(raw, outlinePath)
    if (target !== undefined && isChapter(target)) return target
  }
  return undefined
}

function textOf(lines: readonly { readonly text: string }[]): string {
  return lines
    .map((line) => line.text)
    .join('\n')
    .trim()
}

/** Note lines without the indentation they share, so they read as written under the title. */
function dedent(lines: readonly { readonly text: string }[]): string {
  const indents = lines
    .filter((line) => line.text.trim() !== '')
    .map((line) => /^[ \t]*/u.exec(line.text)?.[0].length ?? 0)
  const shared = indents.length === 0 ? 0 : Math.min(...indents)
  return lines
    .map((line) => line.text.slice(shared))
    .join('\n')
    .trimEnd()
}
