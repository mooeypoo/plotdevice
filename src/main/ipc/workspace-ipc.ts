import { BrowserWindow, dialog } from 'electron'
import { WORKSPACE_CHANNELS } from '../../contract/channels'
import { createTranslator } from '../../i18n/translator'
import type { UiLanguageService } from '../ui-language'
import { handleTrusted } from './handle-trusted'
import type { LaunchFolders } from './launch-folders'
import type { WorkspaceHandlers } from './workspace-handlers'

/** Registers the workspace handlers on their fixed channels. */
export function registerWorkspaceIpc(
  handlers: WorkspaceHandlers,
  launch: LaunchFolders,
  language: UiLanguageService
): void {
  handleTrusted(WORKSPACE_CHANNELS.takeLaunchFolder, () => launch.take())
  handleTrusted(WORKSPACE_CHANNELS.chooseFolder, (event) =>
    handlers.chooseFolder(() =>
      showFolderDialog(BrowserWindow.fromWebContents(event.sender), language)
    )
  )
  handleTrusted(WORKSPACE_CHANNELS.openProject, (_, args) => handlers.openProject(args))
  handleTrusted(WORKSPACE_CHANNELS.initializeProject, (_, args) => handlers.initializeProject(args))
  handleTrusted(WORKSPACE_CHANNELS.setBookLanguage, (_, args) => handlers.setBookLanguage(args))
  handleTrusted(WORKSPACE_CHANNELS.closeProject, () => handlers.closeProject())
  handleTrusted(WORKSPACE_CHANNELS.refreshProject, () => handlers.refreshProject())
  handleTrusted(WORKSPACE_CHANNELS.listRecentProjects, () => handlers.listRecentProjects())
  handleTrusted(WORKSPACE_CHANNELS.removeRecentProject, (_, args) =>
    handlers.removeRecentProject(args)
  )
}

/** Shows the native folder picker with the current interface language. */
export async function showFolderDialog(
  window: BrowserWindow | null,
  language: UiLanguageService
): Promise<string | undefined> {
  const options: Electron.OpenDialogOptions = {
    title: createTranslator(language.current().locale).t('workspace-folder-dialog-title'),
    properties: ['openDirectory', 'createDirectory']
  }
  const result =
    window === null
      ? await dialog.showOpenDialog(options)
      : await dialog.showOpenDialog(window, options)
  return result.canceled ? undefined : result.filePaths[0]
}
