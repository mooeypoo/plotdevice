import {
  app,
  dialog,
  Menu,
  shell,
  type BrowserWindow,
  type MenuItemConstructorOptions
} from 'electron'
import type { AppMenuCommand } from '../contract/api'
import { APP_CHANNELS } from '../contract/channels'
import { createTranslator, type Translator } from '../i18n/translator'

const PROJECT_URL = 'https://github.com/mooeypoo/plotdevice'

/** Replaces Electron's default menu with writing, layout, and application information. */
export function installAppMenu(
  window: BrowserWindow,
  translator: Translator = createTranslator('en')
): void {
  const { t } = translator
  const command = (
    label: string,
    action: AppMenuCommand,
    accelerator?: string
  ): MenuItemConstructorOptions => ({
    label,
    ...(accelerator === undefined ? {} : { accelerator }),
    click: () => {
      window.webContents.send(APP_CHANNELS.menuCommand, action)
    }
  })

  const view: MenuItemConstructorOptions[] = [
    command(t('menu-toggle-binder'), 'toggle-binder', 'CommandOrControl+\\'),
    command(t('menu-toggle-inspector'), 'toggle-inspector', 'CommandOrControl+Shift+I'),
    command(t('menu-toggle-outline'), 'toggle-outline', 'CommandOrControl+Shift+O'),
    command(t('menu-focus'), 'toggle-focus-mode', 'CommandOrControl+Shift+F'),
    command(t('menu-command-palette'), 'command-palette', 'CommandOrControl+K'),
    { type: 'separator' },
    command(t('view-write'), 'write'),
    command(t('view-overview'), 'overview'),
    command(t('view-timeline'), 'timeline'),
    command(t('view-interactions'), 'interactions')
  ]
  if (!app.isPackaged) {
    view.push(
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      // Electron's default Ctrl+Shift+I conflicts with Toggle Inspector.
      { role: 'toggleDevTools', accelerator: 'F12' }
    )
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: t('menu-edit'),
        submenu: [
          { role: 'undo', label: t('menu-undo') },
          { role: 'redo', label: t('menu-redo') },
          { type: 'separator' },
          { role: 'cut', label: t('menu-cut') },
          { role: 'copy', label: t('menu-copy') },
          { role: 'paste', label: t('menu-paste') },
          { type: 'separator' },
          { role: 'selectAll', label: t('menu-select-all') }
        ]
      },
      { label: t('menu-view'), submenu: view },
      {
        label: t('menu-help'),
        submenu: [
          {
            label: t('menu-about'),
            click: () => {
              void showAbout(window, translator).catch((error: unknown) => {
                console.error(
                  'Could not show Plot Device information or open its project page.',
                  error
                )
              })
            }
          }
        ]
      }
    ])
  )
}

async function showAbout(window: BrowserWindow, { t }: Translator): Promise<void> {
  const { response } = await dialog.showMessageBox(window, {
    type: 'info',
    title: t('menu-about'),
    message: 'Plot Device',
    detail: t('about-detail', app.getVersion()),
    buttons: [t('about-close'), t('about-project-page')],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  })
  if (response === 1) await shell.openExternal(PROJECT_URL)
}
