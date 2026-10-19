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

/** Something the writer should know. */
export interface WarningDto {
  readonly code: string
  readonly message: string
}

/** A markdown file that another program added, changed, or removed while the project was open. */
export interface ProjectChangeDto {
  readonly path: string
  readonly kind: 'changed' | 'removed'
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
    /** The file name holds `# ^ [ ] |`, so links to it don't work. */
    | 'name-breaks-links'
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
  readonly warnings: readonly WarningDto[]
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

/** A chapter in the binder. */
export interface ChapterDto {
  readonly path: string
  readonly title: string
  /** Position in its numbered part (or the book); absent outside the sequence. */
  readonly number?: number
  /** The `order` key, when it's a whole number. */
  readonly order?: number
  readonly status?: string
  readonly synopsis?: string
  readonly wordCount: number
  /** Another chapter in the same part has the same `order`. */
  readonly duplicateOrder: boolean
}

/** A part in the binder, with its chapters in order. */
export interface PartDto {
  readonly path: string
  readonly title: string
  /** Position in the sequence; absent for parts without an `order`. */
  readonly number?: number
  readonly order?: number
  readonly synopsis?: string
  /** The part's own text plus its chapters. */
  readonly wordCount: number
  readonly chapters: readonly ChapterDto[]
}

/** Why a chapter is in the unordered tray. */
export type UnorderedReasonDto =
  'missing-order' | 'no-part' | 'part-not-a-link' | 'part-not-found' | 'part-ambiguous'

/** A chapter the book can't place. */
export interface UnorderedChapterDto {
  readonly chapter: ChapterDto
  readonly reason: UnorderedReasonDto
}

/** A file links can point to, by name, with its type for styling. */
export interface LinkTargetDto {
  /** The file name without `.md`, as on disk. */
  readonly name: string
  readonly type?: string
}

/** The book's structure. */
export interface ManuscriptDto {
  readonly parts: readonly PartDto[]
  readonly unnumberedParts: readonly PartDto[]
  /** In a book without parts: its chapters. */
  readonly chapters: readonly ChapterDto[]
  readonly unordered: readonly UnorderedChapterDto[]
  readonly warnings: readonly (WarningDto & { readonly paths: readonly string[] })[]
  readonly wordCount: number
  readonly linkTargets: readonly LinkTargetDto[]
}

/** A part's or chapter's prose for the editor. */
export interface EntryTextDto {
  readonly path: string
  /** The body, with `\n` line endings. */
  readonly text: string
  /** Pass back when saving, so the app can tell if the file changed meanwhile. */
  readonly version: string
  readonly wordCount: number
}

/** The result of a save. */
export interface SavedEntryDto {
  readonly version: string
  readonly wordCount: number
}

/** A part's or chapter's frontmatter as the inspector shows it: values as written. */
export interface EntryPropertiesDto {
  readonly path: string
  readonly kind: 'part' | 'chapter'
  readonly title?: string
  readonly status?: string
  readonly pov: readonly string[]
  readonly characters: readonly string[]
  readonly location: readonly string[]
  readonly threads: readonly string[]
  readonly storyDate?: string
  readonly storyTime?: string
  readonly synopsis?: string
  readonly part?: string
  readonly order?: string
}

/** Properties plus the file version they were read from; pass the version back when saving. */
export interface EntryPropertiesViewDto {
  readonly properties: EntryPropertiesDto
  readonly version: string
}

/**
 * What the writer changed. Only present fields change; an empty text or list removes the key.
 * Links are given as targets (file names), for example `Ilka Szabó`.
 */
export interface PropertyChangesDto {
  readonly title?: string
  readonly status?: string
  readonly pov?: readonly string[]
  readonly characters?: readonly string[]
  readonly location?: readonly string[]
  readonly threads?: readonly string[]
  readonly storyDate?: string
  readonly storyTime?: string
  readonly synopsis?: string
  /** A whole number sets the position; `null` removes `order` (to the unordered tray). */
  readonly order?: number | null
}

/** A plotline from novel.md. */
export interface ThreadDto {
  readonly key: string
  readonly name: string
  readonly color?: string
}

/** The choices the inspector offers. */
export interface InspectorVocabularyDto {
  readonly statuses: readonly string[]
  readonly threads: readonly ThreadDto[]
  readonly calendar: 'gregorian' | 'day-count'
}

/** Whether a typed story date can be used. */
export type StoryDateCheckDto =
  | { readonly kind: 'undated' }
  | { readonly kind: 'date' | 'range'; readonly description: string }
  | { readonly kind: 'invalid'; readonly message: string }

/** A newly created part or chapter. */
export interface CreatedEntryDto {
  readonly path: string
}

/** Where a dragged chapter goes: a position in a part (`null`: a book without parts). */
export interface ChapterDestinationDto {
  readonly part: string | null
  readonly index: number
}

/** What a move changed. `path` is the entry's path afterwards (its file may have moved). */
export interface MovedDto {
  readonly path: string
  readonly changed: number
  readonly failed: readonly string[]
}

/** A rename the title calls for. */
export interface RenamePlanDto {
  readonly newPath: string
  /** The new file name, for the confirmation prompt. */
  readonly newName: string
  /** `ask`: confirm first. `always`: rename without asking. */
  readonly policy: 'ask' | 'always'
  readonly linkCount: number
  readonly fileCount: number
}

/** What a rename did. */
export interface RenamedDto {
  readonly path: string
  readonly linkCount: number
  readonly fileCount: number
  /** Files that seemed to link to the entry but couldn't be updated safely. */
  readonly skipped: readonly string[]
}

/** What a renumbering changed. */
export interface RenumberedDto {
  readonly changed: number
  readonly failed: readonly string[]
}

/** The kinds of codex entry. */
export type CodexKindDto = 'character' | 'location' | 'note'

/** A character, location, or note in the codex list. */
export interface CodexEntryDto {
  readonly path: string
  readonly kind: CodexKindDto
  readonly title: string
  readonly aliases: readonly string[]
  readonly role?: string
}

/** A markdown file with no `type`, or an unknown one (`rawType`). */
export interface UntypedFileDto {
  readonly path: string
  readonly rawType?: string
}

/** A kind's template file for new entries, and whether the writer has made one yet. */
export interface CodexTemplateDto {
  readonly kind: CodexKindDto
  readonly path: string
  readonly exists: boolean
}

/** Everything the codex tab lists. */
export interface CodexListingDto {
  readonly entries: readonly CodexEntryDto[]
  readonly untyped: readonly UntypedFileDto[]
  readonly templates: readonly CodexTemplateDto[]
}

/** One of a character's relationships, as written. */
export interface RelationshipDto {
  readonly with: string
  readonly kind?: string
  readonly note?: string
}

/** A codex entry's frontmatter as the inspector shows it. */
export interface CodexPropertiesDto {
  readonly path: string
  readonly kind: CodexKindDto
  readonly title?: string
  readonly aliases: readonly string[]
  readonly role?: string
  readonly born?: string
  readonly relationships: readonly RelationshipDto[]
  /** Keys the app doesn't edit, shown read-only. */
  readonly otherKeys: readonly { readonly key: string; readonly value: string }[]
}

/** A codex entry's properties and the file version they came from. */
export interface CodexPropertiesViewDto {
  readonly properties: CodexPropertiesDto
  readonly version: string
}

/** Inspector changes to a codex entry. Only present fields change; empty removes the key. */
export interface CodexChangesDto {
  readonly title?: string
  readonly aliases?: readonly string[]
  readonly role?: string
  readonly born?: string
}

/** A chapter a character or location appears in. */
export interface AppearanceDto {
  readonly path: string
  readonly title: string
  readonly keys: readonly ('pov' | 'characters' | 'location')[]
}

/** The types an untyped file can be given. */
export type SettableTypeDto = 'part' | 'chapter' | 'character' | 'location' | 'note'
