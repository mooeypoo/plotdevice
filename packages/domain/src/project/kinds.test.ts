import { describe, expect, it } from 'vitest'
import {
  addKind,
  applyKindsChange,
  folderMismatches,
  withRenamedFolders,
  DEFAULT_KINDS,
  folderForKind,
  isDefaultKinds,
  moveKind,
  parseKinds,
  parseManuscriptUnit,
  removeKind,
  renameKind,
} from './kinds'

describe('reading kinds from project.md (ADR 0011)', () => {
  it('a project without kinds has characters, places and notes', () => {
    expect(parseKinds(undefined)).toEqual({ ok: true, value: DEFAULT_KINDS })
  })

  it('reads folders and the author’s names, in any language', () => {
    const value = [{ folder: 'characters', one: 'NPC', many: 'NPCs' }, { folder: 'פלגים', one: 'פלג', many: 'פלגים' }, { folder: 'notes' }]
    expect(parseKinds(value)).toEqual({ ok: true, value })
  })

  it.each([
    ['not a list', 'characters'],
    ['an entry without a folder', [{ one: 'NPC' }]],
    ['a folder with a slash', [{ folder: 'a/b' }]],
    ['a folder going up', [{ folder: '..' }]],
    ['the manuscript folder', [{ folder: 'manuscript' }]],
    ['the outlines folder', [{ folder: 'Outlines' }]],
    ['the same folder twice, in any case', [{ folder: 'Factions' }, { folder: 'factions' }]],
    ['a Windows reserved name', [{ folder: 'con' }]],
    ['a name that is not text', [{ folder: 'npcs', one: 3 }]],
  ])('refuses %s, so the defaults are used and the file is never rewritten', (_name, value) => {
    expect(parseKinds(value).ok).toBe(false)
  })

  it('reads what chapters are called', () => {
    expect(parseManuscriptUnit(undefined)).toEqual({ ok: true, value: null })
    expect(parseManuscriptUnit({ one: 'Session', many: 'Sessions' })).toEqual({ ok: true, value: { one: 'Session', many: 'Sessions' } })
    expect(parseManuscriptUnit({ one: 'Session' }).ok).toBe(false)
    expect(parseManuscriptUnit('Session').ok).toBe(false)
  })
})

describe('changing the kinds', () => {
  it('a new kind’s folder comes from its plural, made safe and free', () => {
    expect(folderForKind('Factions', DEFAULT_KINDS)).toBe('factions')
    expect(folderForKind('Lore & Legends', DEFAULT_KINDS)).toBe('lore-&-legends')
    expect(folderForKind('פלגים', DEFAULT_KINDS)).toBe('פלגים')
    expect(folderForKind('Characters', DEFAULT_KINDS)).toBe('characters-2')
    expect(folderForKind('CON', DEFAULT_KINDS)).toBe('con-kind')
    expect(folderForKind('Manuscript', DEFAULT_KINDS)).toBe('manuscript-2')
    expect(folderForKind('???', DEFAULT_KINDS)).toBe('kind')
  })

  it('adds a kind at the end', () => {
    const added = addKind(DEFAULT_KINDS, { one: 'Faction', many: 'Factions', folder: 'factions' })
    expect(added).toEqual({ ok: true, value: [...DEFAULT_KINDS, { folder: 'factions', one: 'Faction', many: 'Factions' }] })
  })

  it('refuses an empty name or a folder already taken', () => {
    expect(addKind(DEFAULT_KINDS, { one: ' ', many: 'Factions', folder: 'factions' })).toEqual({ ok: false, error: 'empty-name' })
    expect(addKind(DEFAULT_KINDS, { one: 'NPC', many: 'NPCs', folder: 'Characters' })).toEqual({ ok: false, error: 'folder-taken' })
    expect(addKind(DEFAULT_KINDS, { one: 'NPC', many: 'NPCs', folder: 'a/b' })).toEqual({ ok: false, error: 'invalid-folder' })
  })

  it('renaming changes the names, never the folder', () => {
    const renamed = renameKind(DEFAULT_KINDS, 'characters', { one: 'NPC', many: 'NPCs' })
    expect(renamed).toEqual({
      ok: true,
      value: [{ folder: 'characters', one: 'NPC', many: 'NPCs' }, { folder: 'places' }, { folder: 'notes' }],
    })
  })

  it('moves a kind, and removes one', () => {
    expect(moveKind(DEFAULT_KINDS, 'notes', 0)).toEqual([{ folder: 'notes' }, { folder: 'characters' }, { folder: 'places' }])
    expect(removeKind(DEFAULT_KINDS, 'places')).toEqual([{ folder: 'characters' }, { folder: 'notes' }])
  })

  it('knows the defaults, so writing them back removes the key', () => {
    expect(isDefaultKinds(DEFAULT_KINDS)).toBe(true)
    expect(isDefaultKinds([{ folder: 'characters' }, { folder: 'places' }])).toBe(false)
    expect(isDefaultKinds([{ folder: 'characters', one: 'NPC', many: 'NPCs' }, { folder: 'places' }, { folder: 'notes' }])).toBe(false)
  })
})

describe('a change from the "Kinds of pages" screen', () => {
  const book = { kinds: DEFAULT_KINDS, manuscriptUnit: null }

  it('adds, renames, moves and removes, and names the chapters', () => {
    const added = applyKindsChange(book, { kind: 'add', one: 'Faction', many: 'Factions', folder: 'factions' })
    expect(added.ok && added.value.kinds.at(-1)).toEqual({ folder: 'factions', one: 'Faction', many: 'Factions' })
    expect(applyKindsChange(book, { kind: 'move', folder: 'notes', index: 0 })).toMatchObject({
      ok: true,
      value: { kinds: [{ folder: 'notes' }, { folder: 'characters' }, { folder: 'places' }] },
    })
    expect(applyKindsChange(book, { kind: 'unit', unit: { one: ' Session ', many: 'Sessions' } })).toEqual({
      ok: true,
      value: { kinds: DEFAULT_KINDS, manuscriptUnit: { one: 'Session', many: 'Sessions' } },
    })
    expect(applyKindsChange({ ...book, manuscriptUnit: { one: 'Session', many: 'Sessions' } }, { kind: 'unit', unit: null })).toEqual({
      ok: true,
      value: { kinds: DEFAULT_KINDS, manuscriptUnit: null },
    })
  })

  it('refuses a change to a kind the book doesn’t have', () => {
    expect(applyKindsChange(book, { kind: 'remove', folder: 'factions' }).ok).toBe(false)
    expect(applyKindsChange(book, { kind: 'rename', folder: 'factions', one: 'F', many: 'Fs' }).ok).toBe(false)
  })
})

describe('folders that no longer match their names (ADR 0011, decision 7)', () => {
  it('lists the kinds whose folder isn’t their plural, made safe', () => {
    const kinds = [
      { folder: 'characters', one: 'NPC', many: 'NPCs' },
      { folder: 'places' },
      { folder: 'factions', one: 'Faction', many: 'Factions' },
      { folder: 'notes', one: 'Lore', many: 'Lore & Legends' },
      { folder: 'groups', one: 'פלג', many: 'פלגים' },
    ]
    expect(folderMismatches(kinds)).toEqual([
      { from: 'characters', to: 'npcs' },
      { from: 'notes', to: 'lore-&-legends' },
      { from: 'groups', to: 'פלגים' },
    ])
    expect(folderMismatches(DEFAULT_KINDS)).toEqual([])
  })

  it('renames the folders in the list, keeping names and order', () => {
    expect(
      withRenamedFolders([{ folder: 'characters', one: 'NPC', many: 'NPCs' }, { folder: 'notes' }], [{ from: 'characters', to: 'npcs' }]),
    ).toEqual([{ folder: 'npcs', one: 'NPC', many: 'NPCs' }, { folder: 'notes' }])
  })
})
