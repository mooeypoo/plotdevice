import type { MenuItemConstructorOptions } from 'electron'

/**
 * The native application menu (Milestone 9, decision 6). Every command lives in the app's own menus,
 * so this holds only what the system needs. Linux and Windows show no menu bar: their hidden menu
 * keeps the zoom shortcuts, which Electron's default menu used to provide. macOS always shows a menu
 * bar, so it also gets the app menu, Edit (the clipboard shortcuts need it) and Window.
 */
export function applicationMenu(
  platform: NodeJS.Platform,
  options: { developer: boolean; viewLabel: string },
): MenuItemConstructorOptions[] {
  const view: MenuItemConstructorOptions = {
    label: options.viewLabel,
    submenu: [
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      // Ctrl+= as well as Ctrl++, since "+" needs Shift on most keyboards.
      { role: 'zoomIn', accelerator: 'CommandOrControl+=', visible: false },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      ...(options.developer ? ([{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }] as const) : []),
    ],
  }
  if (platform !== 'darwin') return [view]
  return [{ role: 'appMenu' }, { role: 'editMenu' }, view, { role: 'windowMenu' }]
}
