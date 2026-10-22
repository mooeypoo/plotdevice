import { BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_CHANNELS } from '../contract/channels'
import { installAppMenu } from './app-menu'
import { createTranslator } from '../i18n/translator'

const electronMock = vi.hoisted(() => ({
  packaged: false,
  buildFromTemplate: vi.fn<(template: MenuItemConstructorOptions[]) => object>(() => ({})),
  setApplicationMenu: vi.fn(),
  send: vi.fn(),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  openExternal: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return electronMock.packaged
    },
    getVersion: () => '1.2.3'
  },
  BrowserWindow: vi.fn(function () {
    return { webContents: { send: electronMock.send } }
  }),
  Menu: {
    buildFromTemplate: electronMock.buildFromTemplate,
    setApplicationMenu: electronMock.setApplicationMenu
  },
  dialog: { showMessageBox: electronMock.showMessageBox },
  shell: { openExternal: electronMock.openExternal }
}))

beforeEach(() => {
  vi.clearAllMocks()
  electronMock.showMessageBox.mockResolvedValue({ response: 0, checkboxChecked: false })
})

function menuItems(packaged: boolean): {
  window: BrowserWindow
  items: MenuItemConstructorOptions[]
} {
  electronMock.packaged = packaged
  const window = new BrowserWindow()
  installAppMenu(window)
  const template = electronMock.buildFromTemplate.mock.calls[0]?.[0]
  if (template === undefined) throw new Error('No application menu was built')
  return { window, items: template }
}

function submenu(items: MenuItemConstructorOptions[], label: string): MenuItemConstructorOptions[] {
  const child = items.find((item) => item.label === label)?.submenu
  if (!Array.isArray(child)) throw new Error(`No ${label} submenu`)
  return child
}

function click(item: MenuItemConstructorOptions | undefined): void {
  if (item?.click === undefined) throw new Error('No menu click handler')
  // Electron supplies menu/window/event arguments; these handlers do not use them.
  Reflect.apply(item.click, undefined, [])
}

describe('installAppMenu', () => {
  it('rebuilds in Hebrew while preserving native edit roles and layout accelerators', () => {
    const { window } = menuItems(true)
    const translator = createTranslator('he')
    installAppMenu(window, translator)
    const items = electronMock.buildFromTemplate.mock.calls[1]?.[0]
    if (items === undefined) throw new Error('No translated menu')
    expect(items.map((item) => item.label)).toEqual(['עריכה', 'תצוגה', 'עזרה'])
    expect(submenu(items, 'עריכה')[0]).toMatchObject({ role: 'undo', label: 'ביטול' })
    const action = submenu(items, 'תצוגה')[0]
    expect(action?.accelerator).toBe('CommandOrControl+\\')
    click(action)
    expect(electronMock.send).toHaveBeenLastCalledWith(APP_CHANNELS.menuCommand, 'toggle-binder')
  })

  it('installs standard Edit roles and a visible View/Help menu', () => {
    const { items } = menuItems(true)
    expect(items.map((item) => item.label)).toEqual(['Edit', 'View', 'Help'])
    expect(submenu(items, 'Edit').flatMap((item) => item.role ?? [])).toEqual([
      'undo',
      'redo',
      'cut',
      'copy',
      'paste',
      'selectAll'
    ])
    expect(electronMock.setApplicationMenu).toHaveBeenCalledOnce()
  })

  it('sends exactly one typed command per layout action, with unique accelerators', () => {
    const { items } = menuItems(true)
    const actions = submenu(items, 'View').filter((item) => item.type !== 'separator')
    const commands = [
      'toggle-binder',
      'toggle-inspector',
      'toggle-outline',
      'toggle-focus-mode',
      'toggle-classic-layout',
      'command-palette',
      'write',
      'overview',
      'timeline',
      'interactions'
    ]
    actions.forEach((item, index) => {
      click(item)
      expect(electronMock.send).toHaveBeenNthCalledWith(
        index + 1,
        APP_CHANNELS.menuCommand,
        commands[index]
      )
    })
    expect(electronMock.send).toHaveBeenCalledTimes(10)
    expect(actions.map((item) => item.accelerator)).toEqual([
      'CommandOrControl+\\',
      'CommandOrControl+Shift+I',
      'CommandOrControl+Shift+O',
      'CommandOrControl+Shift+F',
      undefined,
      'CommandOrControl+K',
      undefined,
      undefined,
      undefined,
      undefined
    ])
  })

  it('never offers reload or developer tools in packaged builds', () => {
    const { items } = menuItems(true)
    expect(submenu(items, 'View').filter((item) => item.role !== undefined)).toEqual([])
  })

  it('offers development tools on F12 without taking the inspector shortcut', () => {
    const { items } = menuItems(false)
    const view = submenu(items, 'View')
    expect(view.filter((item) => item.role !== undefined)).toEqual([
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools', accelerator: 'F12' }
    ])
    const accelerators = view.flatMap((item) => item.accelerator ?? [])
    expect(new Set(accelerators).size).toBe(accelerators.length)
  })

  it('shows the real version, license, and project URL without opening a browser on Close', async () => {
    const { window, items } = menuItems(true)
    click(submenu(items, 'Help')[0])
    await Promise.resolve()
    expect(electronMock.showMessageBox).toHaveBeenCalledWith(
      window,
      expect.objectContaining({
        title: 'About Plot Device',
        detail:
          'Version 1.2.3\nLicense: GPL-3.0-or-later\n\nhttps://github.com/mooeypoo/plotdevice',
        buttons: ['Close', 'Open Project Page']
      })
    )
    expect(electronMock.openExternal).not.toHaveBeenCalled()
  })

  it('opens only the fixed project URL when requested in About', async () => {
    electronMock.showMessageBox.mockResolvedValue({ response: 1, checkboxChecked: false })
    const { items } = menuItems(true)
    click(submenu(items, 'Help')[0])
    await Promise.resolve()
    expect(electronMock.openExternal).toHaveBeenCalledExactlyOnceWith(
      'https://github.com/mooeypoo/plotdevice'
    )
  })
})
