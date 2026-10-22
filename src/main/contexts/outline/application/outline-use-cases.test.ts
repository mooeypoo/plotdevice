import { beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { resolveBookWords } from '../../../book-language/book-words'
import { outlineWordsOf } from '../../../book-language/context-words'
import type { OutlineSettings } from '../domain/outline-settings'
import { InMemoryOutlines } from '../domain/ports/in-memory-outline.fake'
import { createCreateOutline } from './commands/create-outline'
import { createSaveOutlineText } from './commands/save-outline-text'
import { createListOutlines } from './queries/list-outlines'
import { createOpenOutline } from './queries/open-outline'

const p = (value: string): ProjectPath => value as ProjectPath
const settings: OutlineSettings = {
  readOnly: false,
  ignoredFolder: p('templates'),
  words: () => outlineWordsOf(resolveBookWords(null))
}

let repository: InMemoryOutlines

beforeEach(() => {
  repository = new InMemoryOutlines()
  repository.put('characters/Ilka.md', { type: 'character', title: 'Ilka' })
})

describe('outlines', () => {
  it('creates outlines at the root and lists them by title, apart from templates', async () => {
    const create = createCreateOutline({ repository, settings })
    expect(await create('')).toEqual({ ok: true, value: { path: 'Outline.md' } })
    expect(await create('Revision plan')).toEqual({ ok: true, value: { path: 'Revision plan.md' } })
    expect(repository.get('Outline.md')?.frontmatter).toEqual({ type: 'outline', title: 'Outline' })
    repository.put('templates/old outline.md', { type: 'outline', title: 'Old' })
    expect(await createListOutlines({ repository, settings })()).toEqual([
      { path: 'Outline.md', title: 'Outline' },
      { path: 'Revision plan.md', title: 'Revision plan' }
    ])
  })

  it('never takes the name of another file, and titles a new outline in the book language', async () => {
    const hebrew = { ...settings, words: () => outlineWordsOf(resolveBookWords('he')) }
    const create = createCreateOutline({ repository, settings: hebrew })
    // Names are unique across the project, so links stay unambiguous.
    expect(await create('ilka')).toEqual({ ok: true, value: { path: 'ilka (outline).md' } })
    const untitled = await create('')
    expect(untitled.ok && repository.get(untitled.value.path)?.frontmatter['title']).toBe(
      resolveBookWords('he').seeds['untitled-outline']
    )
  })

  it('opens and saves only the body, refusing a stale version', async () => {
    const version = repository.put('Plan.md', { type: 'outline' }, '## One\n- Beat\n')
    expect(await createOpenOutline({ repository })(p('Plan.md'))).toEqual({
      ok: true,
      value: { text: '## One\n- Beat\n', version, wordCount: 2 }
    })
    const save = createSaveOutlineText({ repository, readOnly: false })
    const saved = await save(p('Plan.md'), '## One\n- Beat\n- Another\n', version, false)
    expect(saved).toMatchObject({ ok: true, value: { wordCount: 3 } })
    expect(await save(p('Plan.md'), 'Late.\n', version, false)).toMatchObject({
      ok: false,
      error: { code: 'changed-on-disk' }
    })
  })

  it('refuses to create or save in a read-only project, writing nothing', async () => {
    repository.put('Plan.md', { type: 'outline' }, 'Text.\n')
    const before = JSON.stringify([...repository.files])
    const readOnly = { ...settings, readOnly: true }
    for (const result of [
      await createCreateOutline({ repository, settings: readOnly })('New'),
      await createSaveOutlineText({ repository, readOnly: true })(p('Plan.md'), 'X', 'v2', true)
    ])
      expect(result).toMatchObject({
        ok: false,
        error: { code: 'read-only', diagnostic: { reason: 'read-only' } }
      })
    expect(JSON.stringify([...repository.files])).toBe(before)
  })
})
