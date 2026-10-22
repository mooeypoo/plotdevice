import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'
import {
  defaultProjectBindings,
  parseWorkbenchProjects,
  parseWorkbenchSettings
} from './workbench-settings'

const wide = { ...PRESETS.write, end: { ...PRESETS.write.end, size: 600 } }
const broken = { ...PRESETS.write, center: { view: 'binder', splits: [] } }

describe('parseWorkbenchSettings', () => {
  it('reads valid settings unchanged', () => {
    const value = {
      version: 1,
      arrangements: { write: wide, 'user-1': wide },
      saved: [{ id: 'user-1', name: 'Wide' }]
    }
    expect(parseWorkbenchSettings(value)).toEqual({
      settings: { ...value, shell: 'workbench', cardFields: {} },
      dropped: 0
    })
  })

  it('remembers the classic shell, and treats older settings as the workbench', () => {
    const classic = { version: 1, shell: 'classic', arrangements: {}, saved: [] }
    expect(parseWorkbenchSettings(classic)?.settings.shell).toBe('classic')
    expect(parseWorkbenchSettings({ ...classic, shell: 'tiles' })).toBeUndefined()
  })

  it('rejects an unusable envelope or another version', () => {
    expect(parseWorkbenchSettings('nope')).toBeUndefined()
    expect(parseWorkbenchSettings({ version: 2, arrangements: {}, saved: [] })).toBeUndefined()
  })

  it('leaves out each invalid entry on its own and keeps the rest', () => {
    const parsed = parseWorkbenchSettings({
      version: 1,
      arrangements: {
        write: broken,
        plot: wide, // a Writing arrangement can't replace a Plotting preset
        'user-1': wide,
        'user-2': broken,
        'user-3': wide,
        orphan: wide
      },
      saved: [
        { id: 'user-1', name: 'Wide' },
        { id: 'user-2', name: 'Broken' },
        { id: 'user-3', name: 'WIDE' }, // clashes with user-1
        { id: 'user-4', name: 'No arrangement' },
        { id: 'write', name: 'Preset id' },
        { name: 'No id' }
      ]
    })
    expect(parsed?.settings).toEqual({
      version: 1,
      shell: 'workbench',
      cardFields: {},
      arrangements: { 'user-1': wide },
      saved: [{ id: 'user-1', name: 'Wide' }]
    })
    // write, plot, orphan, and five unusable saved entries.
    expect(parsed?.dropped).toBe(8)
  })
})

describe('parseWorkbenchProjects', () => {
  it('reads valid bindings', () => {
    const value = { version: 1, projects: { '/novels/salt': defaultProjectBindings() } }
    const older: Record<string, unknown> = { ...defaultProjectBindings() }
    delete older['collapsedCards']
    // Bindings saved before collapsed cards existed still read, with none collapsed.
    expect(
      parseWorkbenchProjects({ version: 1, projects: { '/a': older } })?.projects['/a']
        ?.collapsedCards
    ).toEqual([])
    expect(parseWorkbenchProjects(value)).toEqual(value)
  })

  it('rejects anything else', () => {
    expect(
      parseWorkbenchProjects({ version: 1, projects: { '/x': { active: {} } } })
    ).toBeUndefined()
    expect(parseWorkbenchProjects(null)).toBeUndefined()
  })
})
