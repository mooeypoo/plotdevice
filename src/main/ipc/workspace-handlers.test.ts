import { beforeEach, describe, expect, it } from 'vitest'
import { createInitializeProject } from '../contexts/workspace/application/commands/initialize-project'
import { createOpenProject } from '../contexts/workspace/application/commands/open-project'
import { createRemoveRecentProject } from '../contexts/workspace/application/commands/remove-recent-project'
import { createInspectFolder } from '../contexts/workspace/application/queries/inspect-folder'
import { createListRecentProjects } from '../contexts/workspace/application/queries/list-recent-projects'
import { InMemoryWorkspace } from '../contexts/workspace/domain/ports/in-memory-workspace.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { createWorkspaceHandlers, type WorkspaceHandlers } from './workspace-handlers'

let workspace: InMemoryWorkspace
let handlers: WorkspaceHandlers
let opened: [string, boolean][]

beforeEach(() => {
  workspace = new InMemoryWorkspace()
  opened = []
  const openProject = createOpenProject({
    folders: workspace,
    novelFiles: workspace,
    scanner: workspace,
    recents: workspace,
    clock: workspace
  })
  handlers = createWorkspaceHandlers({
    inspectFolder: createInspectFolder({ folders: workspace, novelFiles: workspace }),
    openProject,
    initializeProject: createInitializeProject({
      folders: workspace,
      novelFiles: workspace,
      openProject
    }),
    listRecentProjects: createListRecentProjects({ folders: workspace, recents: workspace }),
    removeRecentProject: createRemoveRecentProject({ folders: workspace, recents: workspace }),
    toProjectRoot: (osPath) => osPath as Parameters<typeof openProject>[0],
    rootKey: (root) => root,
    onProjectOpened: (root, readOnly) => {
      opened.push([root, readOnly])
    },
    onProjectClosed: () => {
      opened.push(['closed', false])
    }
  })
})

const path = (value: string): ProjectPath => value as ProjectPath

describe('workspace handlers', () => {
  it('refuses to open a folder the writer never chose', async () => {
    workspace.addFolder('/novels/preservers', { novel: { kind: 'read', frontmatter: {} } })
    expect(await handlers.openProject(['/novels/preservers'])).toMatchObject({
      ok: false,
      error: { code: 'folder-not-allowed' }
    })
  })

  it('opens a folder chosen in the dialog, summarizing its files', async () => {
    workspace.addFolder('/novels/preservers', {
      novel: { kind: 'read', frontmatter: { format: 1, title: 'The Preservers' } },
      scan: {
        files: [
          { path: path('a.md'), classification: { kind: 'typed', type: 'chapter' } },
          { path: path('b.md'), classification: { kind: 'typed', type: 'chapter' } },
          { path: path('c.md'), classification: { kind: 'typed', type: 'part' } },
          { path: path('d.md'), classification: { kind: 'untyped' } },
          { path: path('e.md'), classification: { kind: 'untyped', rawType: 'spaceship' } },
          {
            path: path('f.md'),
            classification: { kind: 'untyped' },
            problem: 'unparseable-frontmatter'
          }
        ],
        nestedProjects: [path('notes/old')]
      }
    })

    const choice = await handlers.chooseFolder(() => Promise.resolve('/novels/preservers'))
    expect(choice).toEqual({ root: '/novels/preservers', name: 'preservers', isProject: true })

    expect(await handlers.openProject(['/novels/preservers'])).toEqual({
      ok: true,
      value: {
        root: '/novels/preservers',
        title: 'The Preservers',
        formatVersion: 1,
        readOnly: false,
        warnings: [],
        counts: { part: 1, chapter: 2, character: 0, location: 0, note: 0, scene: 0, untyped: 3 },
        problems: [
          { path: 'e.md', problem: 'unknown-type', detail: 'spaceship' },
          { path: 'f.md', problem: 'unparseable-frontmatter' },
          { path: 'notes/old', problem: 'nested-project' }
        ]
      }
    })
  })

  it('starts and ends the project session', async () => {
    workspace.addFolder('/novels/preservers', {
      novel: { kind: 'read', frontmatter: { format: 2 } }
    })
    await handlers.chooseFolder(() => Promise.resolve('/novels/preservers'))

    await handlers.openProject(['/novels/preservers'])
    await handlers.closeProject()

    expect(opened).toEqual([
      ['/novels/preservers', true],
      ['closed', false]
    ])
  })

  it('returns null when the dialog is cancelled', async () => {
    expect(await handlers.chooseFolder(() => Promise.resolve(undefined))).toBeNull()
  })

  it('allows the project above a chosen subfolder', async () => {
    workspace.addFolder('/novels/preservers', {
      novel: { kind: 'read', frontmatter: { title: 'The Preservers' } }
    })
    workspace.addFolder('/novels/preservers/notes')

    const choice = await handlers.chooseFolder(() => Promise.resolve('/novels/preservers/notes'))

    expect(choice).toMatchObject({
      isProject: false,
      projectAbove: { root: '/novels/preservers', title: 'The Preservers' }
    })
    expect(await handlers.openProject(['/novels/preservers'])).toMatchObject({ ok: true })
  })

  it('allows reopening anything in the recents list', async () => {
    const root = workspace.addFolder('/novels/preservers', {
      novel: { kind: 'read', frontmatter: {} }
    })
    workspace.recents = [{ root, title: 'P', lastOpenedAt: '2026-10-01T00:00:00.000Z' }]

    await handlers.listRecentProjects()

    expect(await handlers.openProject(['/novels/preservers'])).toMatchObject({ ok: true })
  })

  it('initializes a chosen folder', async () => {
    workspace.addFolder('/novels/new')
    await handlers.chooseFolder(() => Promise.resolve('/novels/new'))

    expect(await handlers.initializeProject(['/novels/new', 'New Book'])).toMatchObject({
      ok: true,
      value: { title: 'New Book' }
    })
  })

  it('passes the project-below hint through when initializing is refused', async () => {
    workspace.addFolder('/novels')
    workspace.addFolder('/novels/preservers', { novel: { kind: 'read', frontmatter: {} } })
    await handlers.chooseFolder(() => Promise.resolve('/novels'))

    expect(await handlers.initializeProject(['/novels', 'All'])).toEqual({
      ok: false,
      error: {
        code: 'contains-project',
        message: 'This folder contains another project.',
        projectBelow: '/novels/preservers'
      }
    })
  })

  it.each([[[]], [[42]], [['']], [['/a', '/b', '/c']], [['x'.repeat(5000)]]])(
    'rejects malformed open arguments %j',
    async (args) => {
      expect(await handlers.openProject(args)).toMatchObject({
        ok: false,
        error: { code: 'invalid-request' }
      })
    }
  )

  it('rejects a title that is not text or far too long', async () => {
    workspace.addFolder('/novels/new')
    await handlers.chooseFolder(() => Promise.resolve('/novels/new'))
    for (const title of [42, 'x'.repeat(501)]) {
      expect(await handlers.initializeProject(['/novels/new', title])).toMatchObject({
        ok: false,
        error: { code: 'invalid-request' }
      })
    }
  })
})
