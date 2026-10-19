// Plain, serializable shapes that cross IPC. No classes, no methods, no imports.

/** The outcome of a request that can fail in an expected way. */
export type ApiResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError }

/** An expected failure. `code` is stable; `message` is for people. */
export interface ApiError {
  readonly code: string
  readonly message: string
  /** For `not-a-project` and `inside-project`: the project this folder is inside. */
  readonly projectAbove?: string
  /** For `contains-project`: a project inside this folder. */
  readonly projectBelow?: string
}

/** A folder the writer picked in the native dialog. */
export interface FolderChoiceDto {
  readonly root: string
  readonly name: string
  readonly isProject: boolean
  readonly projectAbove?: { readonly root: string; readonly title: string }
  readonly projectBelow?: string
}

/** Something about novel.md the writer should know. */
export interface ProjectWarningDto {
  readonly code: string
  readonly message: string
}

/** How many files of each kind the project has. */
export type EntryCountsDto = Readonly<
  Record<'part' | 'chapter' | 'character' | 'location' | 'note' | 'scene' | 'untyped', number>
>

/** A file the app found but can't fully use. */
export interface FileProblemDto {
  readonly path: string
  readonly problem:
    | 'unreadable-file'
    | 'invalid-encoding'
    | 'unclosed-frontmatter'
    | 'unparseable-frontmatter'
    | 'unknown-type'
    | 'nested-project'
  /** For `unknown-type`: the value of the `type` key. */
  readonly detail?: string
}

/** The open project, as the renderer sees it. */
export interface ProjectSummaryDto {
  readonly root: string
  readonly title: string
  readonly author?: string
  readonly formatVersion: number
  readonly readOnly: boolean
  readonly warnings: readonly ProjectWarningDto[]
  readonly counts: EntryCountsDto
  readonly problems: readonly FileProblemDto[]
}

/** An entry in the recent-projects list. */
export interface RecentProjectDto {
  readonly root: string
  readonly title: string
  readonly lastOpenedAt: string
  /** False when the folder no longer exists. */
  readonly available: boolean
}
