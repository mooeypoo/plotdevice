import type {
  CodexApi,
  InspectorApi,
  InteractionsApi,
  ManuscriptApi,
  TimelineApi,
  WorkspaceApi
} from './api'

/** IPC channel names, shared by the preload (which invokes) and main (which handles). */
export const WORKSPACE_CHANNELS = {
  chooseFolder: 'workspace:choose-folder',
  openProject: 'workspace:open-project',
  initializeProject: 'workspace:initialize-project',
  closeProject: 'workspace:close-project',
  listRecentProjects: 'workspace:list-recent-projects',
  removeRecentProject: 'workspace:remove-recent-project',
  refreshProject: 'workspace:refresh-project'
} as const satisfies Record<Exclude<keyof WorkspaceApi, 'onProjectChanged'>, string>

/** Main → renderer events. */
export const EVENT_CHANNELS = {
  projectChanged: 'project:changed'
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

/** Main → renderer: the window wants to close. Renderer → main: done saving. */
export const APP_CHANNELS = {
  beforeClose: 'app:before-close',
  readyToClose: 'app:ready-to-close',
  cancelClose: 'app:cancel-close'
} as const
