import { beforeEach, describe, expect, it } from 'vitest'
import { resolveBookWords } from '../book-language/book-words'
import { outlineWordsOf } from '../book-language/context-words'
import { createCaptureBeat } from '../contexts/outline/application/commands/capture-beat'
import { createCreateOutline } from '../contexts/outline/application/commands/create-outline'
import { createMoveBeat } from '../contexts/outline/application/commands/move-beat'
import { createAddBeat } from '../contexts/outline/application/commands/add-beat'
import { createEditNotes } from '../contexts/outline/application/commands/edit-notes'
import { createRetitleBeat } from '../contexts/outline/application/commands/retitle-beat'
import { createMoveColumn } from '../contexts/outline/application/commands/move-column'
import { createSaveOutlineText } from '../contexts/outline/application/commands/save-outline-text'
import { createListOutlines } from '../contexts/outline/application/queries/list-outlines'
import { createOpenOutline } from '../contexts/outline/application/queries/open-outline'
import type { OutlineSettings } from '../contexts/outline/domain/outline-settings'
import { InMemoryOutlines } from '../contexts/outline/domain/ports/in-memory-outline.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { ok } from '../shared-kernel/result'
import {
  createOutlineHandlers,
  type OutlineHandlers,
  type OutlineUseCases
} from './outline-handlers'

const settings: OutlineSettings = {
  readOnly: false,
  ignoredFolder: 'templates' as ProjectPath,
  words: () => outlineWordsOf(resolveBookWords(null))
}

let repository: InMemoryOutlines
let session: OutlineUseCases | undefined
let handlers: OutlineHandlers

beforeEach(() => {
  repository = new InMemoryOutlines()
  repository.put('Plan.md', { type: 'outline', title: 'Plan' }, '## One\n- Beat\n')
  repository.put('notes/Secret.md', { type: 'note' }, 'Private.\n')
  const ports = { repository, settings }
  session = {
    listOutlines: createListOutlines(ports),
    createOutline: createCreateOutline(ports),
    openOutline: createOpenOutline(ports),
    saveOutlineText: createSaveOutlineText({ repository, readOnly: false }),
    getPlotBoard: (path) =>
      Promise.resolve(ok({ path, version: 'v', preamble: '', columns: [], threads: [] })),
    captureBeat: createCaptureBeat(ports),
    moveBeat: createMoveBeat(ports),
    moveColumn: createMoveColumn(ports),
    addBeat: createAddBeat(ports),
    retitleBeat: createRetitleBeat(ports),
    editNotes: createEditNotes(ports)
  }
  handlers = createOutlineHandlers(() => session)
})

describe('outline handlers', () => {
  it('accept only listed or newly created outlines', async () => {
    expect(await handlers.readBoard(['Plan.md'])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed', diagnostic: { reason: 'outline-not-allowed' } }
    })
    expect(await handlers.list()).toEqual({ ok: true, value: [{ path: 'Plan.md', title: 'Plan' }] })
    expect(await handlers.readBoard(['Plan.md'])).toMatchObject({ ok: true })
    expect(await handlers.openEntry(['notes/Secret.md'])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
    expect(await handlers.create(['Second'])).toEqual({ ok: true, value: { path: 'Second.md' } })
    expect(await handlers.openEntry(['Second.md'])).toMatchObject({ ok: true })
  })

  it('captures into the Inbox, checking the editor’s version when given', async () => {
    await handlers.list()
    const opened = await handlers.openEntry(['Plan.md'])
    if (!opened.ok) throw new Error('expected the outline to open')
    expect(await handlers.capture(['Plan.md', 'Idea', 'stale'])).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
    expect(await handlers.capture(['Plan.md', 'Idea', opened.value.version])).toMatchObject({
      ok: true
    })
    expect(repository.get('Plan.md')?.text).toBe('## One\n- Beat\n\n## Inbox\n- Idea\n')
    expect(await handlers.capture(['Plan.md', 'Another', null])).toMatchObject({ ok: true })
  })

  it('move beats and columns at the board’s version, returning the board as it now reads', async () => {
    repository.put('Two.md', { type: 'outline' }, '## A\n- One\n- Two\n## B\n')
    await handlers.list()
    const version = repository.get('Two.md')?.version ?? ''
    const one = { line: 1, title: 'One' }
    expect(
      await handlers.moveBeat(['Two.md', version, one, { line: 3, title: 'B' }, 'end'])
    ).toMatchObject({
      ok: true
    })
    expect(repository.get('Two.md')?.text).toBe('## A\n- Two\n## B\n- One\n')
    expect(
      await handlers.moveColumn(['Two.md', version, { line: 2, title: 'B' }, 'end'])
    ).toMatchObject({ ok: false, error: { code: 'changed-on-disk' } })
    const now = repository.get('Two.md')?.version ?? ''
    expect(
      await handlers.moveColumn(['Two.md', now, { line: 3, title: 'B' }, 'end'])
    ).toMatchObject({ ok: false, error: { diagnostic: { reason: 'outline-shape-changed' } } })
    expect(
      await handlers.moveBeat(['Two.md', now, { line: -1, title: 'x' }, one, 'end'])
    ).toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    expect(await handlers.moveBeat(['notes/Secret.md', now, one, one, 'end'])).toMatchObject({
      ok: false,
      error: { code: 'entry-not-allowed' }
    })
  })

  it('add, retitle and re-note beats, refusing a title that is not one line', async () => {
    await handlers.list()
    const at = (): string => repository.get('Plan.md')?.version ?? ''
    const one = { line: 0, title: 'One' }
    expect(await handlers.addBeat(['Plan.md', at(), one, 'Second', 'end'])).toMatchObject({
      ok: true
    })
    expect(
      await handlers.retitleBeat(['Plan.md', at(), { line: 1, title: 'Beat' }, 'First'])
    ).toMatchObject({ ok: true })
    expect(
      await handlers.editNotes(['Plan.md', at(), { line: 1, title: 'First' }, 'A note'])
    ).toMatchObject({ ok: true })
    expect(repository.get('Plan.md')?.text).toBe('## One\n- First\n  A note\n- Second\n')
    expect(
      await handlers.retitleBeat(['Plan.md', at(), { line: 1, title: 'First' }, 'two\nlines'])
    ).toMatchObject({ ok: false, error: { diagnostic: { reason: 'outline-invalid-beat' } } })
    expect(await handlers.addBeat(['Plan.md', at(), one, 'x'.repeat(2001), 'end'])).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
  })

  it('refuse malformed requests and a closed project semantically', async () => {
    await handlers.list()
    expect(await handlers.capture(['Plan.md', 42, null])).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' }
    })
    session = undefined
    expect(await handlers.list()).toMatchObject({ ok: false, error: { code: 'no-project' } })
  })
})
