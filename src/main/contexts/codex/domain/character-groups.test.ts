import { describe, expect, it } from 'vitest'
import { canEditCharacterGroups, characterGroups } from './character-groups'
import { readCodexEntry } from './codex-entry'
import { readCodexProperties } from './codex-properties'
import { codexWrites } from './codex-changes'
import type { ProjectPath } from '../../../shared-kernel/project-path'

const path = 'characters/Ilka.md' as ProjectPath

describe('character groups', () => {
  it('reads a scalar or list, normalizes names, and deduplicates without case sensitivity', () => {
    expect(characterGroups(' Main cast ')).toEqual(['Main cast'])
    expect(
      characterGroups([' Main cast ', 'main CAST', 'Cafe\u0301', 'Café', '', 'Part 2'])
    ).toEqual(['Main cast', 'Café', 'Part 2'])
    expect(characterGroups(undefined)).toEqual([])
  })

  it('marks unusable shapes read-only without discarding valid memberships', () => {
    for (const value of [42, { main: true }, ['Main cast', 42]]) {
      expect(canEditCharacterGroups(value)).toBe(false)
    }
    expect(characterGroups(['Main cast', 42])).toEqual(['Main cast'])
    expect(canEditCharacterGroups(undefined)).toBe(true)
    expect(canEditCharacterGroups(null)).toBe(true)
    expect(canEditCharacterGroups(['Main cast'])).toBe(true)
  })

  it('owns groups only on characters and retains malformed metadata in other keys', () => {
    expect(readCodexEntry(path, 'character', { groups: 'Main cast' }).groups).toEqual(['Main cast'])
    expect(readCodexEntry(path, 'note', { groups: 'Main cast' }).groups).toBeUndefined()
    const bad = readCodexProperties(path, 'character', { groups: { main: true } })
    expect(bad.groupsEditable).toBe(false)
    expect(bad.otherKeys).toContainEqual({ key: 'groups', value: '{"main":true}' })
    expect(readCodexProperties(path, 'note', { groups: ['Main cast'] }).otherKeys).toContainEqual({
      key: 'groups',
      value: 'Main cast'
    })
  })

  it('writes only groups, normalizes duplicates, and removes empty membership', () => {
    expect(codexWrites({ groups: [' Main cast ', 'main cast', 'Part 2'] })).toEqual([
      { key: 'groups', value: ['Main cast', 'Part 2'] }
    ])
    expect(codexWrites({ groups: [] })).toEqual([{ key: 'groups', value: undefined }])
  })
})
