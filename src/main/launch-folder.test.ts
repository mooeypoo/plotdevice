import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { launchFolder, userArguments } from './launch-folder'

const cwd = resolve('/home/ines')

describe('launchFolder', () => {
  it('takes the first argument that isn’t a flag, resolving it from the current folder', () => {
    expect(launchFolder(['--enable-logging', 'novels/salt-orchard'], cwd)).toBe(
      join(cwd, 'novels', 'salt-orchard')
    )
    const absolute = resolve('/srv/books/הספר')
    expect(launchFolder([absolute], cwd)).toBe(absolute)
  })

  it('reads a file manager’s file:// address, with spaces and Hebrew', () => {
    const folder = resolve('/home/ines/My Novels/הספר')
    expect(launchFolder([pathToFileURL(folder).href], cwd)).toBe(folder)
  })

  it('opens nothing without a folder argument', () => {
    expect(launchFolder([], cwd)).toBeUndefined()
    expect(launchFolder(['--inspect=9339', '-v'], cwd)).toBeUndefined()
  })
})

describe('userArguments', () => {
  it('skips the executable, and the app path when unpackaged', () => {
    expect(userArguments(['/opt/Plot Device/plotdevice', 'novel'], true)).toEqual(['novel'])
    expect(userArguments(['electron', '.', 'novel'], false)).toEqual(['novel'])
    // A second launch, unpackaged: Chromium's switches come before the app path.
    expect(
      userArguments(['electron', '--allow-file-access-from-files', '.', '/novels/new'], false)
    ).toEqual(['--allow-file-access-from-files', '/novels/new'])
  })
})
