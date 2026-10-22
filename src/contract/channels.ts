import type {
  UiLanguageApi,
  CodexApi,
  InspectorApi,
  InteractionsApi,
  ManuscriptApi,
  OutlineApi,
  RecoveryApi,
  TimelineApi,
  WorkspaceApi
} from './api'

/** App-wide interface language requests and notifications. */
export const UI_LANGUAGE_CHANNELS = {
  get: 'ui-language:get',
  set: 'ui-language:set',
  onChanged: 'ui-language:changed'
} as const satisfies Record<keyof UiLanguageApi, string>

/** Explicit recovery requests. */
export const RECOVERY_CHANNELS = {
  capture: 'recovery:capture',
  saveCopy: 'recovery:save-copy'
} as const satisfies Record<keyof RecoveryApi, string>

/** IPC channel names, shared by the preload (which invokes) and main (which handles). */
export const WORKSPACE_CHANNELS = {
  chooseFolder: 'workspace:choose-folder',
  openProject: 'workspace:open-project',
  initializeProject: 'workspace:initialize-project',
  closeProject: 'workspace:close-project',
  listRecentProjects: 'workspace:list-recent-projects',
  removeRecentProject: 'workspace:remove-recent-project',
  refreshProject: 'workspace:refresh-project',
  setBookLanguage: 'workspace:set-book-language',
  takeLaunchFolder: 'workspace:take-launch-folder'
} as const satisfies Record<
  Exclude<keyof WorkspaceApi, 'onProjectChanged' | 'onOpenFolder'>,
  string
>

/** Main → renderer events. */
export const EVENT_CHANNELS = {
  projectChanged: 'project:changed',
  openFolder: 'workspace:open-folder'
} as const

export const MANUSCRIPT_CHANNELS = {
  getManuscript: 'manuscript:get-manuscript',
  openEntry: 'manuscript:open-entry',
  saveEntryText: 'manuscript:save-entry-text',
  getEntryProperties: 'manuscript:get-entry-properties',
  updateEntryProperties: 'manuscript:update-entry-properties',
  createChapter: 'manuscript:create-chapter',
  createPart: 'manuscript:create-part',
  renumberPart: 'manuscript:renumber-part',
  addStatus: 'manuscript:add-status',
  moveChapter: 'manuscript:move-chapter',
  fixWarning: 'manuscript:fix-warning',
  movePart: 'manuscript:move-part',
  planRename: 'manuscript:plan-rename',
  renameEntry: 'manuscript:rename-entry'
} as const satisfies Record<keyof ManuscriptApi, string>

export const CODEX_CHANNELS = {
  listCodex: 'codex:list',
  openEntry: 'codex:open-entry',
  saveEntryText: 'codex:save-entry-text',
  getProperties: 'codex:get-properties',
  updateProperties: 'codex:update-properties',
  updateRelationships: 'codex:update-relationships',
  createEntry: 'codex:create-entry',
  editTemplate: 'codex:edit-template',
  createOutline: 'codex:create-outline',
  setEntryType: 'codex:set-entry-type',
  planRename: 'codex:plan-rename',
  renameEntry: 'codex:rename-entry',
  getAppearsIn: 'codex:get-appears-in'
} as const satisfies Record<keyof CodexApi, string>

export const OUTLINE_CHANNELS = {
  list: 'outline:list',
  create: 'outline:create',
  openEntry: 'outline:open-entry',
  saveEntryText: 'outline:save-entry-text',
  readBoard: 'outline:read-board',
  capture: 'outline:capture',
  moveBeat: 'outline:move-beat',
  moveColumn: 'outline:move-column'
} as const satisfies Record<keyof OutlineApi, string>

export const TIMELINE_CHANNELS = {
  getTimeline: 'timeline:get'
} as const satisfies Record<keyof TimelineApi, string>

export const INTERACTIONS_CHANNELS = {
  getInteractions: 'interactions:get'
} as const satisfies Record<keyof InteractionsApi, string>

export const INSPECTOR_CHANNELS = {
  getVocabulary: 'inspector:get-vocabulary',
  checkStoryDate: 'inspector:check-story-date'
} as const satisfies Record<keyof InspectorApi, string>

/** Native menu commands and the window-close handshake with the renderer. */
export const APP_CHANNELS = {
  menuCommand: 'app:menu-command',
  beforeClose: 'app:before-close',
  readyToClose: 'app:ready-to-close',
  cancelClose: 'app:cancel-close'
} as const
