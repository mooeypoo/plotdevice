import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryWorkspace } from '../../domain/ports/in-memory-workspace.fake'
import { createReadProject } from './open-project'
import { createSetBookLanguage, type SetBookLanguage } from './set-book-language'

let workspace: InMemoryWorkspace
let setBookLanguage: SetBookLanguage

beforeEach(() => {
  workspace = new InMemoryWorkspace()
  const readProject = createReadProject({
    folders: workspace,
    novelFiles: workspace,
    scanner: workspace
  })
  setBookLanguage = createSetBookLanguage({ novelFiles: workspace, readProject })
})

describe('SetBookLanguage', () => {
  it('writes the language and returns the project with it', async () => {
    const root = workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { format: 1, title: 'The Salt Orchard' } }
    })
    expect(await setBookLanguage(root, ' he ')).toMatchObject({
      ok: true,
      value: { project: { language: 'he', title: 'The Salt Orchard' } }
    })
  })

  it('refuses something that is not a language tag', async () => {
    const root = workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { format: 1 } }
    })
    expect(await setBookLanguage(root, 'Hebrew')).toMatchObject({
      ok: false,
      error: { code: 'invalid-language' }
    })
  })

  it('refuses a project open read-only, leaving novel.md alone', async () => {
    const frontmatter = { format: 2, language: 'en' }
    const root = workspace.addFolder('/novels/future', { novel: { kind: 'read', frontmatter } })
    expect(await setBookLanguage(root, 'he')).toMatchObject({
      ok: false,
      error: { code: 'read-only' }
    })
    expect(await workspace.read(root)).toEqual({ kind: 'read', frontmatter })
  })
})
