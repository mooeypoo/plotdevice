import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryWorkspace } from '../../domain/ports/in-memory-workspace.fake'
import type { ProjectRoot } from '../../domain/project-root'
import { createRemoveRecentProject } from '../commands/remove-recent-project'
import { createInspectFolder } from './inspect-folder'
import { createListRecentProjects } from './list-recent-projects'

let workspace: InMemoryWorkspace

beforeEach(() => {
  workspace = new InMemoryWorkspace()
})

describe('InspectFolder', () => {
  it('recognizes a project', async () => {
    const root = workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: {} }
    })
    expect(await createInspectFolder({ folders: workspace, novelFiles: workspace })(root)).toEqual({
      ok: true,
      value: { root, name: 'salt-orchard', isProject: true }
    })
  })

  it('names the project above, using its title', async () => {
    workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { title: 'The Salt Orchard' } }
    })
    const notes = workspace.addFolder('/novels/salt-orchard/notes')

    expect(await createInspectFolder({ folders: workspace, novelFiles: workspace })(notes)).toEqual(
      {
        ok: true,
        value: {
          root: notes,
          name: 'notes',
          isProject: false,
          projectAbove: { root: '/novels/salt-orchard', title: 'The Salt Orchard' }
        }
      }
    )
  })

  it('reports a project below', async () => {
    const novels = workspace.addFolder('/novels')
    workspace.addFolder('/novels/salt-orchard', { novel: { kind: 'read', frontmatter: {} } })

    expect(
      await createInspectFolder({ folders: workspace, novelFiles: workspace })(novels)
    ).toMatchObject({ ok: true, value: { isProject: false, projectBelow: '/novels/salt-orchard' } })
  })

  it('reports a plain folder', async () => {
    const root = workspace.addFolder('/empty')
    expect(await createInspectFolder({ folders: workspace, novelFiles: workspace })(root)).toEqual({
      ok: true,
      value: { root, name: 'empty', isProject: false }
    })
  })
})

describe('ListRecentProjects and RemoveRecentProject', () => {
  it('marks projects whose folder is gone, and removes one', async () => {
    const here = workspace.addFolder('/novels/here')
    workspace.recents = [
      { root: here, title: 'Here', lastOpenedAt: '2026-10-02T00:00:00.000Z' },
      {
        root: '/novels/gone' as ProjectRoot,
        title: 'Gone',
        lastOpenedAt: '2026-10-01T00:00:00.000Z'
      }
    ]
    const list = createListRecentProjects({ folders: workspace, recents: workspace })

    const first = await list()
    if (!first.ok) throw new Error(first.error.message)
    expect(first.value.map((entry) => [entry.title, entry.available])).toEqual([
      ['Here', true],
      ['Gone', false]
    ])

    await createRemoveRecentProject({ folders: workspace, recents: workspace })(
      '/novels/gone' as ProjectRoot
    )
    const second = await list()
    if (!second.ok) throw new Error(second.error.message)
    expect(second.value.map((entry) => entry.title)).toEqual(['Here'])
  })
})
