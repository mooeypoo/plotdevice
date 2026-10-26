import type { MenuItemConstructorOptions } from 'electron'
import { describe, expect, it } from 'vitest'
import { applicationMenu } from './app-menu'

const roles = (items: MenuItemConstructorOptions[]): string[] =>
  items.flatMap((item) => [...(item.role ? [item.role] : []), ...(Array.isArray(item.submenu) ? roles(item.submenu) : [])])

describe('the native application menu', () => {
  it('on Linux and Windows holds only zoom and full screen, with no File, Edit or Window menu', () => {
    for (const platform of ['linux', 'win32'] as const) {
      const menu = applicationMenu(platform, { developer: false, viewLabel: 'View' })
      expect(menu).toHaveLength(1)
      expect(new Set(roles(menu))).toEqual(new Set(['resetZoom', 'zoomIn', 'zoomOut', 'togglefullscreen']))
    }
  })

  it('on macOS adds only the app, Edit and Window menus the system expects', () => {
    const menu = applicationMenu('darwin', { developer: false, viewLabel: 'View' })
    expect(menu.map((item) => item.role ?? item.label)).toEqual(['appMenu', 'editMenu', 'View', 'windowMenu'])
  })

  it('offers reload and developer tools only in development builds', () => {
    expect(roles(applicationMenu('linux', { developer: false, viewLabel: 'View' }))).not.toContain('toggleDevTools')
    expect(roles(applicationMenu('linux', { developer: true, viewLabel: 'View' }))).toContain('toggleDevTools')
  })
})
