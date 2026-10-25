// IPC channel names. Kept free of zod so the preload script stays tiny.
export const channels = {
  getAppInfo: 'plotdevice:get-app-info',
  getPreferences: 'plotdevice:get-preferences',
  setPreferences: 'plotdevice:set-preferences',
  getRecentProjects: 'plotdevice:get-recent-projects',
  forgetRecentProject: 'plotdevice:forget-recent-project',
  getOpenProject: 'plotdevice:get-open-project',
  openProject: 'plotdevice:open-project',
  createProject: 'plotdevice:create-project',
  changeContents: 'plotdevice:change-contents',
  renameChapter: 'plotdevice:rename-chapter',
  renameChapterFile: 'plotdevice:rename-chapter-file',
  openChapter: 'plotdevice:open-chapter',
  saveChapter: 'plotdevice:save-chapter',
  resolveConflict: 'plotdevice:resolve-conflict',
  leftOff: 'plotdevice:left-off',
  flushed: 'plotdevice:flushed',
  listOutlines: 'plotdevice:list-outlines',
  createOutline: 'plotdevice:create-outline',
  openOutline: 'plotdevice:open-outline',
  editOutline: 'plotdevice:edit-outline',
  undoOutline: 'plotdevice:undo-outline',
  rememberPlace: 'plotdevice:remember-place',
} as const

/** The one channel the host uses to send events to the page. */
export const eventChannel = 'plotdevice:event'
