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

const PROJECT_URL = 'https://github.com/mooeypoo/plotdevice'

/** Replaces Electron's default menu with writing, layout, and application information. */
export function installAppMenu(window: BrowserWindow): void {
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
    command('Toggle Binder', 'toggle-binder', 'CommandOrControl+\\'),
    command('Toggle Inspector', 'toggle-inspector', 'CommandOrControl+Shift+I'),
    command('Toggle Outline Panel', 'toggle-outline', 'CommandOrControl+Shift+O'),
    command('Focus Mode', 'toggle-focus-mode', 'CommandOrControl+Shift+F'),
    { type: 'separator' },
    command('Write', 'write'),
    command('Overview', 'overview'),
    command('Timeline', 'timeline'),
    command('Interactions', 'interactions')
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
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { type: 'separator' },
          { role: 'selectAll' }
        ]
      },
      { label: 'View', submenu: view },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Plot Device',
            click: () => {
              void showAbout(window).catch((error: unknown) => {
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

async function showAbout(window: BrowserWindow): Promise<void> {
  const { response } = await dialog.showMessageBox(window, {
    type: 'info',
    title: 'About Plot Device',
    message: 'Plot Device',
    detail: `Version ${app.getVersion()}\nLicense: GPL-3.0-or-later\n\n${PROJECT_URL}`,
    buttons: ['Close', 'Open Project Page'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  })
  if (response === 1) await shell.openExternal(PROJECT_URL)
}
