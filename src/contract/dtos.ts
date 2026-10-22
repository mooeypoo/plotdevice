// Plain, serializable shapes that cross IPC. No classes, no methods, no imports.

/** Bundled interface languages; manuscript language is independent. */
export type UiLocale = 'en' | 'he'

/** App-wide language settings, never project metadata. */
export interface UiLanguageDto {
  readonly locale: UiLocale
  readonly notice?: 'load-failed' | 'invalid-settings'
}

/** The outcome of a request that can fail in an expected way. */
export type ApiResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError }

/** An expected failure. `code` is stable; `message` is for people. */
export interface ApiError {
  readonly code: string
  readonly message: string
  /** Semantic presentation for migrated operations; message remains the explicit legacy fallback. */
  readonly diagnostic?: ErrorDiagnosticDto
  /** For `not-a-project` and `inside-project`: the project this folder is inside. */
  readonly projectAbove?: string
  /** For `contains-project`: a project inside this folder. */
  readonly projectBelow?: string
}

/** Language-independent failure details for migrated operations; technical details stay untranslated. */
export type ErrorDiagnosticDto =
  | {
      readonly reason: 'workspace-folder-inspection-failed'
      readonly path: string
      readonly detail: string
    }
  | {
      readonly reason: 'workspace-folder-search-limit'
      readonly path: string
      readonly limit: number
    }
  | { readonly reason: 'workspace-folder-dialog-failed'; readonly detail: string }
  | {
      readonly reason: 'recents-read-failed' | 'recents-save-failed' | 'recents-invalid'
      readonly path: string
      readonly detail: string
    }
  | {
      readonly reason:
        | 'read-only'
        | 'workspace-folder-not-allowed'
        | 'template-folder-unusable'
        | 'entry-already-typed'
        | 'frontmatter-links-unsafe'
        | 'name-matches'
        | 'part-required'
        | 'chapter-missing'
        | 'part-missing'
        | 'groups-not-editable'
        | 'not-a-character'
        | 'no-project'
        | 'invalid-request'
        | 'manuscript-entry-not-allowed'
        | 'codex-entry-not-allowed'
        | 'outline-not-allowed'
        | 'invalid-recovery-request'
        | 'snapshot-unavailable'
        | 'snapshot-invalid'
        | 'recovery-outside-project'
        | 'recovery-nested-project'
        | 'recovery-invalid-destination'
        | 'recovery-collisions'
    }
  | {
      readonly reason:
        | 'file-outside-project'
        | 'workspace-folder-missing'
        | 'workspace-not-project'
        | 'workspace-already-project'
        | 'workspace-inside-project'
        | 'workspace-contains-project'
        | 'file-missing'
        | 'file-unreadable'
        | 'file-changed'
        | 'file-exists'
        | 'file-move-failed'
        | 'manuscript-type-unreadable'
        | 'codex-type-unreadable'
      readonly path: string
    }
  | {
      readonly reason: 'file-unsafe'
      readonly path: string
      readonly operation: 'read' | 'write'
      readonly problem: 'invalid-encoding' | 'unclosed' | 'unparseable' | 'none'
    }
  | {
      readonly reason: 'file-write-failed' | 'file-create-failed'
      readonly path: string
      readonly detail: string
    }
  | { readonly reason: 'recovery-write-failed' | 'recovery-create-failed'; readonly detail: string }
  | {
      readonly reason: 'frontmatter-missing' | 'frontmatter-unparseable' | 'frontmatter-not-mapping'
    }
  | { readonly reason: 'frontmatter-unsupported'; readonly key: string }
  | { readonly reason: 'link-needs-no-folder'; readonly name: string }
  | { readonly reason: 'key-needs-no-quotes'; readonly key: string }
  | { readonly reason: 'outline-shape-changed' | 'outline-invalid-beat' | 'outline-invalid-notes' }

/** A folder the writer picked in the native dialog. */
export interface FolderChoiceDto {
  readonly root: string
  readonly name: string
  readonly isProject: boolean
  readonly projectAbove?: { readonly root: string; readonly title: string }
  readonly projectBelow?: string
}

/** A novel.md warning with semantic parameters, formatted only when displayed. */
export type WarningDto =
  | {
      readonly code: 'novel-file-unreadable'
      readonly problem:
        'unreadable-file' | 'invalid-encoding' | 'unclosed-frontmatter' | 'unparseable-frontmatter'
    }
  | { readonly code: 'format-missing' | 'title-invalid' | 'author-invalid' | 'settings-invalid' }
  | { readonly code: 'format-invalid'; readonly value: string }
  | { readonly code: 'format-newer'; readonly version: number }
  /** `language` isn't a language tag such as `en` or `he`; the book is read as English. */
  | { readonly code: 'language-invalid'; readonly value: string }
  | {
      readonly code: 'setting-invalid'
      readonly key: string
      readonly value: string
      readonly expected:
        'file-name-sync' | 'boolean' | 'folder-mapping' | 'visible-folder' | 'vocabulary-mapping'
    }

/** A markdown file that another program added, changed, or removed while the project was open. */
export interface ProjectChangeDto {
  readonly path: string
  readonly kind: 'changed' | 'removed'
}

/** How many files of each kind the project has. */
export type EntryCountsDto = Readonly<
  Record<
    'part' | 'chapter' | 'character' | 'location' | 'note' | 'outline' | 'scene' | 'untyped',
    number
  >
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
  /** Opening succeeded, but recording the project in per-user recents failed. */
  readonly recentProjectsError?: ApiError
  readonly root: string
  readonly title: string
  readonly author?: string
  readonly formatVersion: number
  /** The book's language (ADR 0019): as written in novel.md, and the direction it is written in. */
  readonly language: {
    readonly declared: string | null
    readonly direction: 'ltr' | 'rtl' | null
  }
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
  /** The `pov` link targets, as written. */
  readonly pov: readonly string[]
  /** The `threads` keys. */
  readonly threads: readonly string[]
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
  /** The project-relative path, for path-form links and for opening the file. */
  readonly path: string
  readonly type?: string
}

/** What a warning's one-click fix offers. */
export type WarningFixDto =
  | { readonly kind: 'path-form'; readonly name: string; readonly choices: readonly string[] }
  | { readonly kind: 'quote'; readonly key: string }

/** A fix as the writer chose it (for an ambiguous link: which file it means). */
export type ChosenFixDto =
  | { readonly kind: 'path-form'; readonly name: string; readonly choice: string }
  | { readonly kind: 'quote'; readonly key: string }

/** A warning about the manuscript, with the files it concerns and, sometimes, a fix. */
export type ManuscriptWarningDto = (
  | {
      readonly code: 'duplicate-chapter-order' | 'duplicate-part-order'
      readonly order: number
      readonly titles: readonly string[]
    }
  | { readonly code: 'part-without-order'; readonly titles: readonly string[] }
  | {
      readonly code: 'ambiguous-link'
      readonly title: string
      readonly link: string
      readonly location: { readonly kind: 'body' } | { readonly kind: 'key'; readonly key: string }
      readonly choices: readonly string[]
    }
  | {
      readonly code: 'unusable-value'
      readonly title: string
      readonly reason: 'unquoted-link' | 'not-link' | 'not-integer'
      readonly key: string
      readonly value: string
    }
) & {
  readonly paths: readonly string[]
  readonly fix?: WarningFixDto
}

/** The book's structure. */
export interface ManuscriptDto {
  readonly parts: readonly PartDto[]
  readonly unnumberedParts: readonly PartDto[]
  /** In a book without parts: its chapters. */
  readonly chapters: readonly ChapterDto[]
  readonly unordered: readonly UnorderedChapterDto[]
  readonly warnings: readonly ManuscriptWarningDto[]
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

/** A story date's calendar and original precision, independent of UI language. */
export type StoryDateDto =
  | {
      readonly calendar: 'gregorian'
      readonly year: number
      readonly month?: number
      readonly day?: number
    }
  | { readonly calendar: 'day-count'; readonly day: number }

/** Validation reason and source value; the renderer provides localized explanations. */
export type StoryDateIssueDto =
  | {
      readonly reason: 'not-day-number' | 'too-large' | 'not-date' | 'invalid-day'
      readonly value: string
    }
  | { readonly reason: 'invalid-month'; readonly value: string; readonly month: number }

/** Whether a typed story date can be used, without preformatted presentation text. */
export type StoryDateCheckDto =
  | { readonly kind: 'undated' }
  | { readonly kind: 'date'; readonly date: StoryDateDto }
  | { readonly kind: 'range'; readonly from: StoryDateDto; readonly to: StoryDateDto }
  | { readonly kind: 'invalid'; readonly issue: StoryDateIssueDto }

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
  /** Overlapping memberships, only for characters. */
  readonly groups?: readonly string[]
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
  /**
   * The writer's outlines (`type: outline`), by title.
   * @deprecated Use `api.outline.list`; kept for one contract version (ADR 0020).
   */
  readonly outlines: readonly OutlineDto[]
}

/** An outline (`type: outline`), by title. */
export interface OutlineDto {
  readonly path: string
  readonly title: string
}

/** What a beat's card shows of the chapter its first line links to. */
export interface BoardChapterDto {
  readonly path: string
  readonly title: string
  readonly status?: string
  /** `pov` as written in the chapter. */
  readonly pov: readonly string[]
  readonly wordCount: number
  readonly synopsis?: string
}

/** A beat card. `line` and `title` address it in board commands (ADR 0020). */
export interface BoardBeatDto {
  readonly line: number
  readonly title: string
  /** The beat's notes, without their shared indentation. */
  readonly notes: string
  readonly tags: readonly string[]
  /** Tags that are thread keys in novel.md. */
  readonly threads: readonly string[]
  readonly chapter?: BoardChapterDto
}

/** A board column: a `##` heading and its beats. */
export interface BoardColumnDto {
  readonly line: number
  readonly title: string
  /** The column captured beats go under. */
  readonly inbox: boolean
  readonly beats: readonly BoardBeatDto[]
}

/** A beat or column as the board last saw it: its line and title (ADR 0020). */
export interface OutlineItemRefDto {
  readonly line: number
  readonly title: string
}

/** Where a moved beat or column goes: before another one, or at the end. */
export type OutlinePlacementDto = { readonly before: OutlineItemRefDto } | 'end'

/** The beat board over one outline, read from the file each time (ADR 0020). */
export interface PlotBoardDto {
  readonly path: string
  readonly version: string
  /** Text before the first column. */
  readonly preamble: string
  readonly columns: readonly BoardColumnDto[]
  readonly threads: readonly {
    readonly key: string
    readonly name: string
    readonly color?: string
  }[]
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
  readonly groups?: readonly string[]
  readonly groupsEditable?: boolean
  readonly relationships: readonly RelationshipDto[]
  /** False when the file writes `relationships` in a shape the app can't edit safely. */
  readonly relationshipsEditable: boolean
  /** Keys the app doesn't edit, shown read-only. */
  readonly otherKeys: readonly { readonly key: string; readonly value: string }[]
}

/** Another character's relationship to this one. */
export interface ListedByDto {
  readonly path: string
  readonly title: string
  readonly kind?: string
  readonly note?: string
}

/** A codex entry's properties and the file version they came from. */
export interface CodexPropertiesViewDto {
  readonly properties: CodexPropertiesDto
  readonly version: string
  /** Characters whose relationships point to this one (one-way, shown read-only). */
  readonly listedBy: readonly ListedByDto[]
}

/** A relationship as the inspector edits it: the other character by name. */
export interface RelationshipEditDto {
  readonly with: string
  readonly kind?: string
  readonly note?: string
}

/** Inspector changes to a codex entry. Only present fields change; empty removes the key. */
export interface CodexChangesDto {
  readonly title?: string
  readonly aliases?: readonly string[]
  readonly role?: string
  readonly born?: string
  readonly groups?: readonly string[]
}

/** A chapter a character or location appears in. */
export interface AppearanceDto {
  readonly path: string
  readonly title: string
  readonly keys: readonly ('pov' | 'characters' | 'location')[]
}

/** The types an untyped file can be given. */
export type SettableTypeDto = 'part' | 'chapter' | 'character' | 'location' | 'note' | 'outline'

/** A chapter's story date on the timeline: its span in days, or why it has none. */
export type TimelineDateDto =
  | { readonly kind: 'undated' }
  | { readonly kind: 'invalid'; readonly issue: StoryDateIssueDto }
  | {
      readonly kind: 'dated'
      /** Endpoints retain precision; formatting must not reconstruct them from the span. */
      readonly reading: Extract<StoryDateCheckDto, { kind: 'date' | 'range' }>
      /** Days from 1 January 1970 (Gregorian) or the day number (day-count), inclusive. */
      readonly start: number
      readonly end: number
      readonly precision: 'year' | 'month' | 'day'
    }

/** A chapter on the timeline, in reading order. */
export interface TimelineChapterDto {
  readonly path: string
  readonly title: string
  readonly number?: number
  readonly partNumber?: number
  readonly partTitle?: string
  readonly status?: string
  readonly synopsis?: string
  readonly storyTime?: string
  readonly threads: readonly string[]
  readonly characters: readonly { readonly path: string; readonly pov: boolean }[]
  readonly date: TimelineDateDto
}

/** A row the timeline can show: a thread (by key) or a character (by path). */
export interface TimelineRowDto {
  readonly key: string
  readonly name: string
  readonly color?: string
}

/** Everything the timeline draws. */
export interface TimelineDto {
  readonly calendar: 'gregorian' | 'day-count'
  readonly threads: readonly TimelineRowDto[]
  readonly characters: readonly TimelineRowDto[]
  readonly chapters: readonly TimelineChapterDto[]
  /** Chapters outside the reading order, not shown. */
  readonly outside: number
}

/** A character who appears in the book, and which chapters (indexes into `chapters`). */
export interface InteractingCharacterDto {
  readonly path: string
  readonly name: string
  readonly chapters: readonly number[]
  /** The chapters where this character is the point of view. */
  readonly povChapters: readonly number[]
}

/** Who appears with whom, from chapters' `pov` and `characters`. */
export interface InteractionsDto {
  readonly chapters: readonly { readonly path: string; readonly title: string }[]
  readonly characters: readonly InteractingCharacterDto[]
  /** Chapters outside the reading order, not counted. */
  readonly outside: number
}
