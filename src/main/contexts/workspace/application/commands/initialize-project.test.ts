import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryWorkspace } from '../../domain/ports/in-memory-workspace.fake'
import type { ProjectRoot } from '../../domain/project-root'
import { createInitializeProject, type InitializeProject } from './initialize-project'
import { createOpenProject } from './open-project'

let workspace: InMemoryWorkspace
let initializeProject: InitializeProject

beforeEach(() => {
  workspace = new InMemoryWorkspace()
  const openProject = createOpenProject({
    folders: workspace,
    novelFiles: workspace,
    scanner: workspace,
    recents: workspace,
    clock: workspace
  })
  initializeProject = createInitializeProject({
    folders: workspace,
    novelFiles: workspace,
    openProject
  })
})

describe('InitializeProject', () => {
  it('writes novel.md, opens the project, and records it', async () => {
    const root = workspace.addFolder('/novels/new-book')

    const result = await initializeProject(root, '  The New Book  ')

    expect(result).toMatchObject({ ok: true, value: { project: { title: 'The New Book' } } })
    expect(workspace.createdNovelFiles.get(root)).toContain('title: "The New Book"')
    expect(workspace.recents.map((entry) => entry.root)).toEqual([root])
  })

  it('uses the folder name when the title is blank', async () => {
    const root = workspace.addFolder('/novels/new-book')
    await initializeProject(root, '   ')
    expect(workspace.createdNovelFiles.get(root)).toContain('title: "new-book"')
  })

  it('refuses a folder that is already a project', async () => {
    const root = workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: {} }
    })
    const result = await initializeProject(root, 'Again')
    expect(result).toMatchObject({ ok: false, error: { code: 'already-a-project' } })
    expect(workspace.createdNovelFiles.size).toBe(0)
  })

  it('refuses a folder inside another project, and says which', async () => {
    workspace.addFolder('/novels/salt-orchard', { novel: { kind: 'read', frontmatter: {} } })
    const notes = workspace.addFolder('/novels/salt-orchard/notes')

    const result = await initializeProject(notes, 'Nested')

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'inside-project', projectAbove: '/novels/salt-orchard' }
    })
    expect(workspace.createdNovelFiles.size).toBe(0)
  })

  it('refuses a folder that contains another project, and says which', async () => {
    const novels = workspace.addFolder('/novels')
    workspace.addFolder('/novels/salt-orchard', { novel: { kind: 'read', frontmatter: {} } })

    const result = await initializeProject(novels, 'All of them')

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'contains-project', projectBelow: '/novels/salt-orchard' }
    })
    expect(workspace.createdNovelFiles.size).toBe(0)
  })

  it('fails for a folder that no longer exists', async () => {
    const result = await initializeProject('/gone' as ProjectRoot, 'Gone')
    expect(result).toMatchObject({ ok: false, error: { code: 'folder-missing' } })
  })
})
