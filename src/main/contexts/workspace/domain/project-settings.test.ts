import { describe, expect, it } from 'vitest'
import { DEFAULT_PROJECT_SETTINGS, readProjectSettings } from './project-settings'

describe('readProjectSettings', () => {
  it('uses every default when settings are missing', () => {
    expect(readProjectSettings(undefined)).toEqual({
      settings: DEFAULT_PROJECT_SETTINGS,
      warnings: []
    })
  })

  it('has the defaults from docs/file-format.md', () => {
    expect(DEFAULT_PROJECT_SETTINGS).toEqual({
      fileNames: 'ask',
      orderPrefix: false,
      folders: {
        part: 'manuscript',
        chapter: 'manuscript',
        character: 'characters',
        location: 'locations',
        note: 'notes',
        template: 'templates'
      }
    })
  })

  it('reads every valid value', () => {
    const result = readProjectSettings({
      file_names: 'always',
      order_prefix: true,
      folders: {
        part: 'book',
        chapter: 'book/chapters',
        character: 'people',
        location: 'מקומות',
        note: 'notes/misc',
        template: 'tpl'
      }
    })
    expect(result).toEqual({
      settings: {
        fileNames: 'always',
        orderPrefix: true,
        folders: {
          part: 'book',
          chapter: 'book/chapters',
          character: 'people',
          location: 'מקומות',
          note: 'notes/misc',
          template: 'tpl'
        }
      },
      warnings: []
    })
  })

  it('fills in keys that are missing, without warning', () => {
    const result = readProjectSettings({ folders: { character: 'people' } })
    expect(result.settings.folders.character).toBe('people')
    expect(result.settings.folders.note).toBe('notes')
    expect(result.warnings).toEqual([])
  })

  it('warns and uses the default for each invalid value', () => {
    const result = readProjectSettings({
      file_names: 'sometimes',
      order_prefix: 'yes',
      folders: { part: '/absolute', chapter: '../outside', character: '.hidden', location: 42 }
    })
    expect(result.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      Array.from({ length: 6 }, () => 'setting-invalid')
    )
    expect(result.warnings[0]).toEqual({
      code: 'setting-invalid',
      key: 'file_names',
      value: '"sometimes"',
      expected: 'file-name-sync'
    })
    expect(result.warnings[1]).toEqual({
      code: 'setting-invalid',
      key: 'order_prefix',
      value: '"yes"',
      expected: 'boolean'
    })
    expect(result.warnings[0]).not.toHaveProperty('message')
  })

  it('warns when settings is not a mapping', () => {
    const result = readProjectSettings(['ask'])
    expect(result.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
    expect(result.warnings).toMatchObject([{ code: 'settings-invalid' }])
  })

  it('warns when folders is not a mapping', () => {
    const result = readProjectSettings({ folders: 'everything' })
    expect(result.settings.folders).toEqual(DEFAULT_PROJECT_SETTINGS.folders)
    expect(result.warnings).toMatchObject([{ code: 'setting-invalid' }])
  })

  it('ignores keys it does not own', () => {
    expect(readProjectSettings({ theme: 'dark', folders: { scene: 'x' } }).warnings).toEqual([])
  })
})
