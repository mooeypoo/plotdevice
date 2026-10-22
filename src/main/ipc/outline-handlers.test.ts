import { beforeEach, describe, expect, it } from 'vitest'
import { resolveBookWords } from '../book-language/book-words'
import { outlineWordsOf } from '../book-language/context-words'
import { createCaptureBeat } from '../contexts/outline/application/commands/capture-beat'
import { createCreateOutline } from '../contexts/outline/application/commands/create-outline'
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
    captureBeat: createCaptureBeat(ports)
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
