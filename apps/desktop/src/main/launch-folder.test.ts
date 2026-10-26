import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { folderFromArgs } from './launch-folder'

describe('the folder to open at launch', () => {
  it('takes an absolute path after the executable, in a packaged app', () => {
    expect(folderFromArgs(['/opt/Plot Device/plotdevice', '/home/ines/The Salt Orchard'], '/opt/Plot Device/resources/app.asar')).toBe('/home/ines/The Salt Orchard')
  })

  it('skips the app’s own folder in development, and switches anywhere, however they are ordered', () => {
    expect(folderFromArgs(['/usr/bin/electron', '/repo/apps/desktop', '--no-sandbox', '/home/ines/novel'], '/repo/apps/desktop')).toBe('/home/ines/novel')
    // Test tools put their own switches before the app folder.
    expect(folderFromArgs(['/usr/bin/electron', '--inspect=0', '--remote-debugging-port=0', '/repo/apps/desktop', '/home/ines/novel'], '/repo/apps/desktop')).toBe('/home/ines/novel')
    expect(folderFromArgs(['/usr/bin/electron', '--inspect=0', '/repo/apps/desktop'], '/repo/apps/desktop')).toBeNull()
    expect(folderFromArgs(['plotdevice', '--user-data-dir=/tmp/x', '/home/ines/novel'], '/opt/x/app.asar')).toBe('/home/ines/novel')
  })

  it('reads the file:// address a file manager sends, Hebrew and spaces included', () => {
    // A path native to the system the test runs on: on Windows a file address carries a drive letter.
    const folder = process.platform === 'win32' ? 'C:\\Users\\ines\\מטע המלח' : '/home/ines/מטע המלח'
    const address = pathToFileURL(folder).href
    expect(address).toContain('%D7%9E%D7%98%D7%A2%20') // encoded, as a file manager sends it
    expect(folderFromArgs(['plotdevice', address], '/opt/x/app.asar')).toBe(folder)
  })

  it('ignores relative paths and anything else', () => {
    expect(folderFromArgs(['plotdevice', 'novel', 'https://example.com'], '/opt/x/app.asar')).toBeNull()
    expect(folderFromArgs(['plotdevice'], '/opt/x/app.asar')).toBeNull()
  })
})
