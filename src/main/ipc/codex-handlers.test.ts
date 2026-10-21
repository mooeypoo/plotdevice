import { beforeEach, describe, expect, it } from 'vitest'
import { createCreateOutline } from '../contexts/codex/application/commands/create-outline'
import { createEditTemplate } from '../contexts/codex/application/commands/edit-template'
import { createCreateCodexEntry } from '../contexts/codex/application/commands/create-codex-entry'
import {
  createPlanCodexRename,
  createRenameCodexEntry
} from '../contexts/codex/application/commands/rename-codex-entry'
import { createSaveCodexText } from '../contexts/codex/application/commands/save-codex-text'
import { createSetEntryType } from '../contexts/codex/application/commands/set-entry-type'
import { createUpdateRelationships } from '../contexts/codex/application/commands/update-relationships'
import { createUpdateCodexProperties } from '../contexts/codex/application/commands/update-codex-properties'
import { createGetCodexProperties } from '../contexts/codex/application/queries/get-codex-properties'
import { createListCodex } from '../contexts/codex/application/queries/list-codex'
import { createOpenCodexEntry } from '../contexts/codex/application/queries/open-codex-entry'
import type { CodexSettings } from '../contexts/codex/domain/codex-settings'
import { InMemoryCodex } from '../contexts/codex/domain/ports/in-memory-codex.fake'
import type { EntryRelocator } from '../shared-kernel/entry-relocator'
import type { ProjectPath } from '../shared-kernel/project-path'
import { ok } from '../shared-kernel/result'
import { createCodexHandlers, type CodexHandlers, type CodexUseCases } from './codex-handlers'

const p = (value: string): ProjectPath => value as ProjectPath
const ilka = 'characters/Ilka Szabó.md'
const settings: CodexSettings = {
  readOnly: false,
  folders: { character: p('characters'), location: p('locations'), note: p('notes') },
  templateFolder: p('templates'),
  fileNames: 'ask'
}
const relocator: EntryRelocator = {
  preview: () => Promise.resolve({ changedFiles: [], linkCount: 0, skipped: [] }),
  relocate: () => Promise.resolve(ok({ changedFiles: [], linkCount: 0, skipped: [] }))
}

let repository: InMemoryCodex
let session: CodexUseCases | undefined
let handlers: CodexHandlers

function useCasesFor(repo: InMemoryCodex): CodexUseCases {
  const ports = { repository: repo, settings }
  return {
    listCodex: createListCodex(ports),
    openEntry: createOpenCodexEntry(ports),
    saveEntryText: createSaveCodexText({ repository: repo, readOnly: false }),
    getProperties: createGetCodexProperties(ports),
    updateProperties: createUpdateCodexProperties(ports),
    updateRelationships: createUpdateRelationships(ports),
    createEntry: createCreateCodexEntry(ports),
    editTemplate: createEditTemplate(ports),
    createOutline: createCreateOutline(ports),
    setEntryType: createSetEntryType(ports),
    planRename: createPlanCodexRename({ ...ports, relocator }),
    renameEntry: createRenameCodexEntry({ ...ports, relocator }),
    getAppearsIn: (path) =>
      Promise.resolve(path === ilka ? [{ path: p('One.md'), title: 'One', keys: ['pov'] }] : [])
  }
}

beforeEach(() => {
  repository = new InMemoryCodex()
  repository.put(ilka, { type: 'character', title: 'Ilka Szabó' }, 'Bio.\n')
  repository.put('manuscript/One.md', { type: 'chapter' })
  repository.put('Loose thoughts.md', {})
  session = useCasesFor(repository)
  handlers = createCodexHandlers(() => session)
})

describe('codex handlers', () => {
  it('passes semantic property/relationship failures and shared guard diagnostics through IPC', async () => {
    await handlers.listCodex()
    const read = await handlers.getProperties([ilka])
    if (!read.ok) throw new Error('expected properties')
    repository.put(ilka, { type: 'character', groups: { main: true } })
    expect(
      await handlers.updateProperties([ilka, read.value.version, { groups: ['Main'] }])
    ).toMatchObject({
      ok: false,
      error: { diagnostic: { reason: 'groups-not-editable' } }
    })
    repository.put('locations/Marrow.md', { type: 'location' })
    await handlers.listCodex()
    expect(await handlers.updateRelationships(['locations/Marrow.md', 'v1', []])).toMatchObject({
      ok: false,
      error: { diagnostic: { reason: 'not-a-character' } }
    })
    expect(await handlers.updateProperties([ilka, 'v1', { aliases: [42] }])).toMatchObject({
      ok: false,
      error: { diagnostic: { reason: 'invalid-request' } }
    })
  })

  it('validates and round-trips character groups through properties and listing', async () => {
    await handlers.listCodex()
    const read = await handlers.getProperties([ilka])
    if (!read.ok) throw new Error('expected properties')
    expect(
      await handlers.updateProperties([ilka, read.value.version, { groups: ['Main', 'Part 2'] }])
    ).toMatchObject({ ok: true, value: { properties: { groups: ['Main', 'Part 2'] } } })
    expect(await handlers.listCodex()).toMatchObject({
      ok: true,
      value: { entries: [{ path: ilka, groups: ['Main', 'Part 2'] }] }
    })
    for (const groups of ['Main', [42], ['x'.repeat(501)], Array<string>(501).fill('Main')]) {
      expect(await handlers.updateProperties([ilka, read.value.version, { groups }])).toMatchObject(
        {
          ok: false,
          error: { code: 'invalid-request' }
        }
      )
    }
  })

  it('lists the codex and opens listed entries only', async () => {
    expect(await handlers.openEntry([ilka])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(await handlers.listCodex()).toMatchObject({
      ok: true,
      value: {
        entries: [{ path: ilka, kind: 'character' }],
        untyped: [{ path: 'Loose thoughts.md' }]
      }
    })
    expect(await handlers.openEntry([ilka])).toMatchObject({ ok: true, value: { text: 'Bio.\n' } })
    expect(await handlers.openEntry(['manuscript/One.md'])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(await handlers.getAppearsIn([ilka])).toEqual({
      ok: true,
      value: [{ path: 'One.md', title: 'One', keys: ['pov'] }]
    })
  })

  it('creates an entry and allows it right away', async () => {
    await handlers.listCodex()
    expect(await handlers.createEntry(['location', 'Marrow'])).toEqual({
      ok: true,
      value: { path: 'locations/Marrow.md' }
    })
    expect(await handlers.openEntry(['locations/Marrow.md'])).toMatchObject({ ok: true })
    expect(await handlers.createEntry(['spaceship', 'x'])).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
  })

  it('creates a template from the default and allows editing it', async () => {
    await handlers.listCodex()
    expect(await handlers.editTemplate(['character'])).toEqual({
      ok: true,
      value: { path: 'templates/character.md' }
    })
    expect(await handlers.openEntry(['templates/character.md'])).toMatchObject({
      ok: true,
      value: { text: '## Description\n\n## History\n\n## Arc\n' }
    })
  })

  it('sets the type of a listed untyped file only', async () => {
    await handlers.listCodex()
    expect(await handlers.setEntryType([ilka, 'note'])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(await handlers.setEntryType(['Loose thoughts.md', 'note'])).toEqual({
      ok: true,
      value: null
    })
    expect(await handlers.setEntryType(['Loose thoughts.md', 'scene'])).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
  })

  it('reads and updates properties, rejecting unknown fields', async () => {
    await handlers.listCodex()
    const read = await handlers.getProperties([ilka])
    if (!read.ok) throw new Error('expected properties')
    expect(
      await handlers.updateProperties([ilka, read.value.version, { role: 'narrator' }])
    ).toMatchObject({ ok: true, value: { properties: { role: 'narrator' } } })
    expect(await handlers.updateProperties([ilka, 'v1', { eyes: 'grey' }])).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
  })

  it('forgets allowed paths when another project opens', async () => {
    await handlers.listCodex()
    session = useCasesFor(repository)
    expect(await handlers.openEntry([ilka])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
  })
})
