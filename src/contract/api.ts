import type {
  UiLanguageDto,
  UiTheme,
  UiLocale,
  AppearanceDto,
  CodexChangesDto,
  CodexKindDto,
  CodexListingDto,
  CodexPropertiesViewDto,
  OutlineDto,
  OutlineItemRefDto,
  OutlinePlacementDto,
  PlotBoardDto,
  RelationshipEditDto,
  SettableTypeDto,
  TimelineDto,
  InteractionsDto,
  ApiResult,
  ChapterDestinationDto,
  ChosenFixDto,
  CreatedEntryDto,
  EntryPropertiesViewDto,
  EntryTextDto,
  InspectorVocabularyDto,
  MovedDto,
  PropertyChangesDto,
  RenamedDto,
  RenamePlanDto,
  RenumberedDto,
  StoryDateCheckDto,
  FolderChoiceDto,
  ManuscriptDto,
  ProjectChangeDto,
  ProjectSummaryDto,
  RecentProjectDto,
  SavedEntryDto
} from './dtos'

/** The persistent app theme; the window follows it at once (no notification is needed). */
export interface UiThemeApi {
  get(): Promise<UiTheme>
  set(theme: UiTheme): Promise<ApiResult<UiTheme>>
}

/** Persistent interface language and main-to-renderer synchronization. */
export interface UiLanguageApi {
  get(): Promise<UiLanguageDto>
  set(locale: UiLocale): Promise<ApiResult<UiLanguageDto>>
  onChanged(listener: (settings: UiLanguageDto) => void): () => void
}

/** Opening, initializing, and remembering projects. */
export interface WorkspaceApi {
  /** Shows the native folder dialog; successful `null` when the writer cancels. */
  chooseFolder(): Promise<ApiResult<FolderChoiceDto | null>>
  /** Opens a project. Only folders from `chooseFolder` or the recents list are accepted. */
  openProject(root: string): Promise<ApiResult<ProjectSummaryDto>>
  /** Writes novel.md into a folder from `chooseFolder`, then opens it. */
  /** Makes a folder a project; `language` is the book's language tag, written into novel.md. */
  initializeProject(
    root: string,
    title: string,
    language: string
  ): Promise<ApiResult<ProjectSummaryDto>>
  /** Sets the open book's `language` in novel.md (only that key) and returns it read again. */
  setBookLanguage(language: string): Promise<ApiResult<ProjectSummaryDto>>
  /** Closes the open project. */
  closeProject(): Promise<void>
  listRecentProjects(): Promise<ApiResult<readonly RecentProjectDto[]>>
  /** Forgets a recent project. The folder is not touched. */
  removeRecentProject(root: string): Promise<ApiResult<null>>
  /**
   * The folder the app was started with (`plotdevice ~/novels/book`, or "Open With" in a file
   * manager), inspected like a chosen folder; `null` when there was none. Answers once.
   */
  takeLaunchFolder(): Promise<ApiResult<FolderChoiceDto | null>>
  /** Called when the app is started again with a folder while already running. */
  onOpenFolder(listener: (result: ApiResult<FolderChoiceDto | null>) => void): () => void
  /** Re-reads the open project (its warnings and file problems) after files changed. */
  refreshProject(): Promise<ApiResult<ProjectSummaryDto>>
  /**
   * Called with each batch of changes other programs make to the open project's markdown files.
   * The app's own writes are never reported. Returns a function that stops listening.
   */
  onProjectChanged(listener: (changes: readonly ProjectChangeDto[]) => void): () => void
}

/** The open project's parts and chapters. */
export interface ManuscriptApi {
  getManuscript(): Promise<ApiResult<ManuscriptDto>>
  /** Only paths from the last `getManuscript` are accepted. */
  openEntry(path: string): Promise<ApiResult<EntryTextDto>>
  /**
   * Saves the body only. Fails with `changed-on-disk` if the file changed since `version`, unless
   * `overwrite` is true.
   */
  saveEntryText(
    path: string,
    text: string,
    version: string,
    overwrite: boolean
  ): Promise<ApiResult<SavedEntryDto>>
  getEntryProperties(path: string): Promise<ApiResult<EntryPropertiesViewDto>>
  /** Changes only the given keys. Fails with `changed-on-disk` if the file changed since `version`. */
  updateEntryProperties(
    path: string,
    version: string,
    changes: PropertyChangesDto
  ): Promise<ApiResult<EntryPropertiesViewDto>>
  /** A new chapter at the end of a part (`null`: a book without parts). */
  createChapter(partPath: string | null, title: string): Promise<ApiResult<CreatedEntryDto>>
  createPart(title: string): Promise<ApiResult<CreatedEntryDto>>
  /** Rewrites a part's chapter orders to 1, 2, 3… (`null`: a book without parts). */
  renumberPart(partPath: string | null): Promise<ApiResult<RenumberedDto>>
  /** Adds a status to novel.md's list and returns the new list. */
  addStatus(status: string): Promise<ApiResult<readonly string[]>>
  /**
   * Puts a chapter at a position, rewriting `order` only where it changes and `part` if it changed.
   * `null` takes it out of the book's order.
   */
  moveChapter(path: string, destination: ChapterDestinationDto | null): Promise<ApiResult<MovedDto>>
  /** Applies a warning's fix to one part or chapter; only the links concerned change. */
  fixWarning(path: string, fix: ChosenFixDto): Promise<ApiResult<null>>
  /** Puts a part at a position among the numbered parts. */
  movePart(path: string, index: number): Promise<ApiResult<MovedDto>>
  /** Whether the file should be renamed to match its title; `null` when not. */
  planRename(path: string): Promise<ApiResult<RenamePlanDto | null>>
  /** Renames the file to match its title and updates every link to it. */
  renameEntry(path: string): Promise<ApiResult<RenamedDto>>
}

/** The open project's characters, locations, notes, and untyped files. */
export interface CodexApi {
  listCodex(): Promise<ApiResult<CodexListingDto>>
  /** Only paths from the last `listCodex` (or just created) are accepted, as for the manuscript. */
  openEntry(path: string): Promise<ApiResult<EntryTextDto>>
  saveEntryText(
    path: string,
    text: string,
    version: string,
    overwrite: boolean
  ): Promise<ApiResult<SavedEntryDto>>
  getProperties(path: string): Promise<ApiResult<CodexPropertiesViewDto>>
  updateProperties(
    path: string,
    version: string,
    changes: CodexChangesDto
  ): Promise<ApiResult<CodexPropertiesViewDto>>
  /** Sets a character's relationships; only what differs changes in the file. */
  updateRelationships(
    path: string,
    version: string,
    relationships: readonly RelationshipEditDto[]
  ): Promise<ApiResult<CodexPropertiesViewDto>>
  /** A new entry from the template, in the kind's folder. */
  createEntry(kind: CodexKindDto, title: string): Promise<ApiResult<CreatedEntryDto>>
  /**
   * The template file new entries of `kind` start from, created from the default if the project
   * has none yet. It opens like an entry; only its text is edited.
   */
  editTemplate(kind: CodexKindDto): Promise<ApiResult<CreatedEntryDto>>
  /**
   * A new outline at the project root, named after its title.
   * @deprecated Use `api.outline.create`; kept for one contract version.
   */
  createOutline(title: string): Promise<ApiResult<CreatedEntryDto>>
  /** Writes `type` into an untyped file, and nothing else. */
  setEntryType(path: string, type: SettableTypeDto): Promise<ApiResult<null>>
  planRename(path: string): Promise<ApiResult<RenamePlanDto | null>>
  renameEntry(path: string): Promise<ApiResult<RenamedDto>>
  /** The chapters a character or location appears in, in book order. */
  getAppearsIn(path: string): Promise<ApiResult<readonly AppearanceDto[]>>
}

/** The writer's outlines and the beat board over them (ADR 0020). */
export interface OutlineApi {
  list(): Promise<ApiResult<readonly OutlineDto[]>>
  /** A new outline at the project root, named after its title. */
  create(title: string): Promise<ApiResult<CreatedEntryDto>>
  /** Only paths from the last `list` (or just created) are accepted. */
  openEntry(path: string): Promise<ApiResult<EntryTextDto>>
  saveEntryText(
    path: string,
    text: string,
    version: string,
    overwrite: boolean
  ): Promise<ApiResult<SavedEntryDto>>
  readBoard(path: string): Promise<ApiResult<PlotBoardDto>>
  /**
   * Appends a beat to the outline's Inbox, adding the heading if missing. `version` is the one the
   * editor holds when the outline is open there; `null` captures into the file as it is.
   */
  capture(
    path: string,
    text: string,
    version: string | null
  ): Promise<ApiResult<{ readonly version: string }>>
  /**
   * Moves a beat and its notes into a column. `version` is the board's; a changed outline is
   * refused. Returns the board as the file now reads.
   */
  moveBeat(
    path: string,
    version: string,
    beat: OutlineItemRefDto,
    column: OutlineItemRefDto,
    placement: OutlinePlacementDto
  ): Promise<ApiResult<PlotBoardDto>>
  /** Moves a column (its heading to the next `##`); returns the board as the file now reads. */
  moveColumn(
    path: string,
    version: string,
    column: OutlineItemRefDto,
    placement: OutlinePlacementDto
  ): Promise<ApiResult<PlotBoardDto>>
  /** Adds a one-line beat to a column; returns the board as the file now reads. */
  addBeat(
    path: string,
    version: string,
    column: OutlineItemRefDto,
    title: string,
    placement: OutlinePlacementDto
  ): Promise<ApiResult<PlotBoardDto>>
  /** Adds a `##` column, before another column or at the end; returns the board as the file now reads. */
  addColumn(
    path: string,
    version: string,
    title: string,
    placement: OutlinePlacementDto
  ): Promise<ApiResult<PlotBoardDto>>
  /** Replaces a beat's title, as Markdown on one line. */
  retitleBeat(
    path: string,
    version: string,
    beat: OutlineItemRefDto,
    title: string
  ): Promise<ApiResult<PlotBoardDto>>
  /** Replaces a beat's notes; empty notes remove them. */
  editNotes(
    path: string,
    version: string,
    beat: OutlineItemRefDto,
    notes: string
  ): Promise<ApiResult<PlotBoardDto>>
}

/** The timeline of the open project. */
export interface TimelineApi {
  getTimeline(): Promise<ApiResult<TimelineDto>>
}

/** Who appears with whom in the open project. */
export interface InteractionsApi {
  getInteractions(): Promise<ApiResult<InteractionsDto>>
}

/** Choices and checks for the inspector, drawn from several parts of the project. */
export interface InspectorApi {
  getVocabulary(): Promise<ApiResult<InspectorVocabularyDto>>
  checkStoryDate(text: string): Promise<ApiResult<StoryDateCheckDto>>
}

/** Layout actions requested by the native application menu. */
export type AppMenuCommand =
  | 'toggle-binder'
  | 'toggle-inspector'
  | 'toggle-outline'
  | 'toggle-focus-mode'
  | 'command-palette'
  | 'write'
  | 'overview'
  | 'timeline'
  | 'interactions'

/** The window's lifecycle and native menu. */
export interface AppApi {
  /** Subscribes to native menu actions. Returns a function that stops listening. */
  onMenuCommand(listener: (command: AppMenuCommand) => void): () => void
  /** Called when the window is about to close; save, then call `readyToClose`. */
  onBeforeClose(listener: () => void): () => void
  readyToClose(): void
  /** Keeps the window open, for example when unsaved text couldn't be saved. */
  cancelClose(): void
}

/** Explicit recovery of a draft without replacing its original file. */
export interface RecoveryApi {
  /** Pins already-read bytes by their version; no file is read from an arbitrary renderer path. */
  capture(path: string, version: string): Promise<ApiResult<string>>
  /** Creates a separate file using captured metadata and the current draft's body. */
  saveCopy(token: string, text: string): Promise<ApiResult<CreatedEntryDto>>
}

/**
 * The whole renderer↔main surface, exposed to the renderer as `window.plotDevice`.
 */
export interface PlotDeviceApi {
  /** Incremented whenever this interface changes incompatibly. */
  readonly contractVersion: 32
  readonly uiLanguage: UiLanguageApi
  readonly uiTheme: UiThemeApi
  readonly recovery: RecoveryApi
  readonly workspace: WorkspaceApi
  readonly manuscript: ManuscriptApi
  readonly codex: CodexApi
  readonly outline: OutlineApi
  readonly timeline: TimelineApi
  readonly interactions: InteractionsApi
  readonly inspector: InspectorApi
  readonly app: AppApi
}
