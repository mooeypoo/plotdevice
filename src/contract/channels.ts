import type { InspectorApi, ManuscriptApi, WorkspaceApi } from './api'

/** IPC channel names, shared by the preload (which invokes) and main (which handles). */
export const WORKSPACE_CHANNELS = {
  chooseFolder: 'workspace:choose-folder',
  openProject: 'workspace:open-project',
  initializeProject: 'workspace:initialize-project',
  closeProject: 'workspace:close-project',
  listRecentProjects: 'workspace:list-recent-projects',
  removeRecentProject: 'workspace:remove-recent-project'
} as const satisfies Record<keyof WorkspaceApi, string>

export const MANUSCRIPT_CHANNELS = {
  getManuscript: 'manuscript:get-manuscript',
  openEntry: 'manuscript:open-entry',
  saveEntryText: 'manuscript:save-entry-text',
  getEntryProperties: 'manuscript:get-entry-properties',
  updateEntryProperties: 'manuscript:update-entry-properties',
  createChapter: 'manuscript:create-chapter',
  createPart: 'manuscript:create-part',
  renumberPart: 'manuscript:renumber-part',
  addStatus: 'manuscript:add-status'
} as const satisfies Record<keyof ManuscriptApi, string>

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
