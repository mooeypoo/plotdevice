import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitializeProject } from '../contexts/workspace/application/commands/initialize-project'
import {
  createOpenProject,
  createReadProject
} from '../contexts/workspace/application/commands/open-project'
import { createRemoveRecentProject } from '../contexts/workspace/application/commands/remove-recent-project'
import { createInspectFolder } from '../contexts/workspace/application/queries/inspect-folder'
import { createListRecentProjects } from '../contexts/workspace/application/queries/list-recent-projects'
import { InMemoryWorkspace } from '../contexts/workspace/domain/ports/in-memory-workspace.fake'
import type { ProjectPath } from '../shared-kernel/project-path'
import { createWorkspaceHandlers, type WorkspaceHandlers } from './workspace-handlers'
import { resolveBookWords } from '../book-language/book-words'
import { templateWordsOf } from '../book-language/context-words'
import { createSetBookLanguage } from '../contexts/workspace/application/commands/set-book-language'

let workspace: InMemoryWorkspace
let handlers: WorkspaceHandlers
let opened: [string, boolean][]
let refreshed: (string | null)[]

beforeEach(() => {
  workspace = new InMemoryWorkspace()
  opened = []
  refreshed = []
  const openProject = createOpenProject({
    folders: workspace,
    novelFiles: workspace,
    scanner: workspace,
    recents: workspace,
    clock: workspace
  })
  const readProject = createReadProject({
    folders: workspace,
    novelFiles: workspace,
    scanner: workspace
  })
  handlers = createWorkspaceHandlers({
    inspectFolder: createInspectFolder({ folders: workspace, novelFiles: workspace }),
    openProject,
    readProject,
    initializeProject: createInitializeProject({
      folders: workspace,
      novelFiles: workspace,
      openProject,
      templateWords: (language) => templateWordsOf(resolveBookWords(language))
    }),
    setBookLanguage: createSetBookLanguage({ novelFiles: workspace, readProject }),
    listRecentProjects: createListRecentProjects({ folders: workspace, recents: workspace }),
    removeRecentProject: createRemoveRecentProject({ folders: workspace, recents: workspace }),
    toProjectRoot: (osPath) => osPath as Parameters<typeof openProject>[0],
    rootKey: (root) => root,
    onProjectOpened: (root, project) => {
      opened.push([root, project.readOnly])
    },
    onProjectRefreshed: (project) => {
      refreshed.push(project.language)
    },
    onProjectClosed: () => {
      opened.push(['closed', false])
    }
  })
})

const path = (value: string): ProjectPath => value as ProjectPath

afterEach(() => vi.restoreAllMocks())

describe('workspace handlers', () => {
  it('returns a logged semantic dialog failure instead of rejecting the IPC call', async () => {
    const error = new Error('Native dialog EIO <img>')
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await handlers.chooseFolder(() => Promise.reject(error))).toEqual({
      ok: false,
      error: {
        code: 'folder-dialog-failed',
        message: error.message,
        diagnostic: { reason: 'workspace-folder-dialog-failed', detail: error.message }
      }
    })
    expect(log).toHaveBeenCalledExactlyOnceWith('Project folder dialog failed.', error)
    expect(opened).toEqual([])
  })

  it('does not authorize or initialize a folder after inspection failed', async () => {
    const root = workspace.addFolder('/novels/יעל')
    const error = {
      code: 'folder-inspection-failed',
      message: 'EACCES',
      diagnostic: { reason: 'workspace-folder-inspection-failed', path: root, detail: 'EACCES' }
    } as const
    vi.spyOn(workspace, 'findProjectBelow').mockResolvedValue({ ok: false, error })
    expect(await handlers.chooseFolder(() => Promise.resolve(root))).toEqual({ ok: false, error })
    expect(await handlers.initializeProject([root, 'New', 'en'])).toMatchObject({
      ok: false,
      error: { code: 'folder-not-allowed' }
    })
    expect(workspace.createdNovelFiles.size).toBe(0)
  })

  it('returns explicit recents failures and keeps successful project opening independent', async () => {
    const root = workspace.addFolder('/novels/יעל', { novel: { kind: 'read', frontmatter: {} } })
    await handlers.chooseFolder(() => Promise.resolve(root))
    const error = {
      code: 'recents-invalid',
      message: 'Original settings detail',
      diagnostic: { reason: 'recents-invalid', path: '/settings/יעל.json', detail: 'Invalid JSON' }
    } as const
    vi.spyOn(workspace, 'load').mockResolvedValue({ ok: false, error })
    const save = vi.spyOn(workspace, 'save')
    expect(await handlers.listRecentProjects()).toEqual({ ok: false, error })
    expect(await handlers.removeRecentProject([root])).toEqual({ ok: false, error })
    expect(await handlers.removeRecentProject([null])).toMatchObject({
      ok: false,
      error: { diagnostic: { reason: 'invalid-request' } }
    })
    const openedProject = await handlers.openProject([root])
    expect(openedProject).toMatchObject({ ok: true, value: { root, recentProjectsError: error } })
    expect(opened).toEqual([[root, false]])
    expect(save).not.toHaveBeenCalled()
    const refreshed = await handlers.refreshProject()
    expect(refreshed.ok).toBe(true)
    if (refreshed.ok) expect(refreshed.value).not.toHaveProperty('recentProjectsError')
  })

  it.each(['open', 'initialize', 'refresh'] as const)(
    'preserves a missing folder diagnostic through %s',
    async (action) => {
      const root = workspace.addFolder('/novels/יעל', {
        novel: { kind: 'read', frontmatter: {} }
      })
      await handlers.chooseFolder(() => Promise.resolve(root))
      if (action === 'refresh') await handlers.openProject([root])
      workspace.folders.delete(root)
      const result =
        action === 'open'
          ? await handlers.openProject([root])
          : action === 'initialize'
            ? await handlers.initializeProject([root, 'New', 'en'])
            : await handlers.refreshProject()
      expect(result).toEqual({
        ok: false,
        error: {
          code: 'folder-missing',
          message: 'This folder no longer exists.',
          diagnostic: { reason: 'workspace-folder-missing', path: root }
        }
      })
      expect(workspace.createdNovelFiles.size).toBe(0)
    }
  )

  it('preserves initialization technical details through IPC without opening a project', async () => {
    const root = workspace.addFolder('/novels/יעל')
    await handlers.chooseFolder(() => Promise.resolve(root))
    const error = {
      code: 'write-failed',
      message: 'Technical failure EACCES',
      diagnostic: {
        reason: 'file-create-failed',
        path: '/novels/יעל/novel.md',
        detail: 'EACCES <img>'
      }
    } as const
    vi.spyOn(workspace, 'create').mockResolvedValue({ ok: false, error })
    expect(await handlers.initializeProject([root, 'New', 'en'])).toEqual({ ok: false, error })
    expect(opened).toEqual([])
    expect(workspace.createdNovelFiles.size).toBe(0)
    expect(workspace.recents).toEqual([])
  })

  it('preserves semantic authorization, invalid-request and no-project refusals', async () => {
    expect(await handlers.openProject(['/unselected'])).toMatchObject({
      ok: false,
      error: { code: 'folder-not-allowed', diagnostic: { reason: 'workspace-folder-not-allowed' } }
    })
    expect(await handlers.initializeProject([null])).toMatchObject({
      ok: false,
      error: { code: 'invalid-request', diagnostic: { reason: 'invalid-request' } }
    })
    expect(await handlers.refreshProject()).toMatchObject({
      ok: false,
      error: { code: 'no-project', diagnostic: { reason: 'no-project' } }
    })
    expect(opened).toEqual([])
  })

  it('preserves project warning reasons and parameters without display text', async () => {
    workspace.addFolder('/novels/warnings', {
      novel: {
        kind: 'read',
        frontmatter: { format: 99, title: 42, settings: { file_names: 'sometimes' } }
      }
    })
    await handlers.chooseFolder(() => Promise.resolve('/novels/warnings'))
    const result = await handlers.openProject(['/novels/warnings'])
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected project')
    expect(result.value.readOnly).toBe(true)
    expect(result.value.warnings).toEqual([
      { code: 'format-newer', version: 99 },
      { code: 'title-invalid' },
      {
        code: 'setting-invalid',
        key: 'file_names',
        value: '"sometimes"',
        expected: 'file-name-sync'
      }
    ])
    expect(workspace.createdNovelFiles.size).toBe(0)
  })

  it('refuses to open a folder the writer never chose', async () => {
    workspace.addFolder('/novels/salt-orchard', { novel: { kind: 'read', frontmatter: {} } })
    expect(await handlers.openProject(['/novels/salt-orchard'])).toMatchObject({
      ok: false,
      error: { code: 'folder-not-allowed' }
    })
  })

  it('opens a folder chosen in the dialog, summarizing its files', async () => {
    workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { format: 1, title: 'The Salt Orchard' } },
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

    const choice = await handlers.chooseFolder(() => Promise.resolve('/novels/salt-orchard'))
    expect(choice).toEqual({
      ok: true,
      value: { root: '/novels/salt-orchard', name: 'salt-orchard', isProject: true }
    })

    expect(await handlers.openProject(['/novels/salt-orchard'])).toEqual({
      ok: true,
      value: {
        root: '/novels/salt-orchard',
        title: 'The Salt Orchard',
        formatVersion: 1,
        language: { declared: null, direction: null },
        readOnly: false,
        warnings: [],
        counts: {
          part: 1,
          chapter: 2,
          character: 0,
          location: 0,
          note: 0,
          outline: 0,
          scene: 0,
          untyped: 3
        },
        problems: [
          { path: 'e.md', problem: 'unknown-type', detail: 'spaceship' },
          { path: 'f.md', problem: 'unparseable-frontmatter' },
          { path: 'notes/old', problem: 'nested-project' }
        ]
      }
    })
  })

  it('refreshes the open project, without opening it again', async () => {
    expect(await handlers.refreshProject()).toMatchObject({
      ok: false,
      error: { code: 'no-project' }
    })
    workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { format: 1, title: 'The Salt Orchard' } }
    })
    await handlers.chooseFolder(() => Promise.resolve('/novels/salt-orchard'))
    await handlers.openProject(['/novels/salt-orchard'])

    // Another program adds a file whose name breaks links.
    workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { format: 1, title: 'The Salt Orchard' } },
      scan: {
        files: [{ path: path('notes/Chapter #3.md'), classification: { kind: 'untyped' } }],
        nestedProjects: []
      }
    })
    expect(await handlers.refreshProject()).toMatchObject({
      ok: true,
      value: { problems: [{ path: 'notes/Chapter #3.md', problem: 'name-breaks-links' }] }
    })
    expect(opened).toHaveLength(1)
  })

  it('starts and ends the project session', async () => {
    workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { format: 2 } }
    })
    await handlers.chooseFolder(() => Promise.resolve('/novels/salt-orchard'))

    await handlers.openProject(['/novels/salt-orchard'])
    await handlers.closeProject()

    expect(opened).toEqual([
      ['/novels/salt-orchard', true],
      ['closed', false]
    ])
  })

  it('returns null when the dialog is cancelled', async () => {
    expect(await handlers.chooseFolder(() => Promise.resolve(undefined))).toEqual({
      ok: true,
      value: null
    })
  })

  it('allows the project above a chosen subfolder', async () => {
    workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: { title: 'The Salt Orchard' } }
    })
    workspace.addFolder('/novels/salt-orchard/notes')

    const choice = await handlers.chooseFolder(() => Promise.resolve('/novels/salt-orchard/notes'))

    expect(choice).toMatchObject({
      ok: true,
      value: {
        isProject: false,
        projectAbove: { root: '/novels/salt-orchard', title: 'The Salt Orchard' }
      }
    })
    expect(await handlers.openProject(['/novels/salt-orchard'])).toMatchObject({ ok: true })
  })

  it('allows reopening anything in the recents list', async () => {
    const root = workspace.addFolder('/novels/salt-orchard', {
      novel: { kind: 'read', frontmatter: {} }
    })
    workspace.recents = [{ root, title: 'P', lastOpenedAt: '2026-10-01T00:00:00.000Z' }]

    await handlers.listRecentProjects()

    expect(await handlers.openProject(['/novels/salt-orchard'])).toMatchObject({ ok: true })
  })

  it('initializes a chosen folder', async () => {
    workspace.addFolder('/novels/new')
    await handlers.chooseFolder(() => Promise.resolve('/novels/new'))

    expect(await handlers.initializeProject(['/novels/new', 'New Book', 'en'])).toMatchObject({
      ok: true,
      value: { title: 'New Book' }
    })
  })

  it('passes the project-below hint through when initializing is refused', async () => {
    workspace.addFolder('/novels')
    workspace.addFolder('/novels/salt-orchard', { novel: { kind: 'read', frontmatter: {} } })
    await handlers.chooseFolder(() => Promise.resolve('/novels'))

    expect(await handlers.initializeProject(['/novels', 'All', 'en'])).toEqual({
      ok: false,
      error: {
        code: 'contains-project',
        message: 'This folder contains another project.',
        diagnostic: { reason: 'workspace-contains-project', path: '/novels/salt-orchard' },
        projectBelow: '/novels/salt-orchard'
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
      expect(await handlers.initializeProject(['/novels/new', title, 'en'])).toMatchObject({
        ok: false,
        error: { code: 'invalid-request' }
      })
    }
  })
})
