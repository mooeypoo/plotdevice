import type {
  AppearanceDto,
  CodexChangesDto,
  CodexKindDto,
  CodexListingDto,
  CodexPropertiesViewDto,
  SettableTypeDto,
  ApiResult,
  ChapterDestinationDto,
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

/** Opening, initializing, and remembering projects. */
export interface WorkspaceApi {
  /** Shows the native folder dialog. `null` when the writer cancels. */
  chooseFolder(): Promise<FolderChoiceDto | null>
  /** Opens a project. Only folders from `chooseFolder` or the recents list are accepted. */
  openProject(root: string): Promise<ApiResult<ProjectSummaryDto>>
  /** Writes novel.md into a folder from `chooseFolder`, then opens it. */
  initializeProject(root: string, title: string): Promise<ApiResult<ProjectSummaryDto>>
  /** Closes the open project. */
  closeProject(): Promise<void>
  listRecentProjects(): Promise<readonly RecentProjectDto[]>
  /** Forgets a recent project. The folder is not touched. */
  removeRecentProject(root: string): Promise<void>
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
  /** A new entry from the template, in the kind's folder. */
  createEntry(kind: CodexKindDto, title: string): Promise<ApiResult<CreatedEntryDto>>
  /**
   * The template file new entries of `kind` start from, created from the default if the project
   * has none yet. It opens like an entry; only its text is edited.
   */
  editTemplate(kind: CodexKindDto): Promise<ApiResult<CreatedEntryDto>>
  /** Writes `type` into an untyped file, and nothing else. */
  setEntryType(path: string, type: SettableTypeDto): Promise<ApiResult<null>>
  planRename(path: string): Promise<ApiResult<RenamePlanDto | null>>
  renameEntry(path: string): Promise<ApiResult<RenamedDto>>
  /** The chapters a character or location appears in, in book order. */
  getAppearsIn(path: string): Promise<ApiResult<readonly AppearanceDto[]>>
}

/** Choices and checks for the inspector, drawn from several parts of the project. */
export interface InspectorApi {
  getVocabulary(): Promise<ApiResult<InspectorVocabularyDto>>
  checkStoryDate(text: string): Promise<ApiResult<StoryDateCheckDto>>
}

/** The window's lifecycle. */
export interface AppApi {
  /** Called when the window is about to close; save, then call `readyToClose`. */
  onBeforeClose(listener: () => void): () => void
  readyToClose(): void
  /** Keeps the window open, for example when unsaved text couldn't be saved. */
  cancelClose(): void
}

/**
 * The whole renderer↔main surface, exposed to the renderer as `window.plotDevice`.
 */
export interface PlotDeviceApi {
  /** Incremented whenever this interface changes incompatibly. */
  readonly contractVersion: 7
  readonly workspace: WorkspaceApi
  readonly manuscript: ManuscriptApi
  readonly codex: CodexApi
  readonly inspector: InspectorApi
  readonly app: AppApi
}
