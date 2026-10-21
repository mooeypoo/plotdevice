import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryWorkspace } from '../../domain/ports/in-memory-workspace.fake'
import { createInitializeProject } from '../commands/initialize-project'
import { createOpenProject } from '../commands/open-project'
import { createInspectFolder } from './inspect-folder'
import { createListRecentProjects } from './list-recent-projects'

let workspace: InMemoryWorkspace
const failure = {
  code: 'folder-inspection-failed',
  message: 'Cannot inspect folder',
  diagnostic: {
    reason: 'workspace-folder-inspection-failed',
    path: '/novels/יעל',
    detail: 'EACCES'
  }
} as const

beforeEach(() => {
  workspace = new InMemoryWorkspace()
})

describe('folder inspection failures', () => {
  it.each(['exists', 'findProjectAbove', 'findProjectBelow'] as const)(
    'refuses initialization/inspection after %s fails without writing',
    async (operation) => {
      const root = workspace.addFolder('/novels/יעל')
      vi.spyOn(workspace, operation).mockResolvedValue({ ok: false, error: failure })
      const openProject = createOpenProject({
        folders: workspace,
        novelFiles: workspace,
        scanner: workspace,
        recents: workspace,
        clock: workspace
      })
      const ports = { folders: workspace, novelFiles: workspace, openProject }
      expect(await createInitializeProject(ports)(root, 'New')).toEqual({
        ok: false,
        error: failure
      })
      expect(await createInspectFolder(ports)(root)).toEqual({ ok: false, error: failure })
      expect(workspace.createdNovelFiles.size).toBe(0)
      expect(workspace.recents).toEqual([])
    }
  )

  it('propagates folder checks before reading/opening or recording a project', async () => {
    const root = workspace.addFolder('/novels/יעל', { novel: { kind: 'read', frontmatter: {} } })
    vi.spyOn(workspace, 'exists').mockResolvedValue({ ok: false, error: failure })
    const read = vi.spyOn(workspace, 'read')
    const save = vi.spyOn(workspace, 'save')
    const open = createOpenProject({
      folders: workspace,
      novelFiles: workspace,
      scanner: workspace,
      recents: workspace,
      clock: workspace
    })
    expect(await open(root)).toEqual({ ok: false, error: failure })
    expect(read).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it('propagates parent-search failures when a folder has no marker', async () => {
    const root = workspace.addFolder('/novels/יעל')
    vi.spyOn(workspace, 'findProjectAbove').mockResolvedValue({ ok: false, error: failure })
    expect(
      await createOpenProject({
        folders: workspace,
        novelFiles: workspace,
        scanner: workspace,
        recents: workspace,
        clock: workspace
      })(root)
    ).toEqual({ ok: false, error: failure })
  })

  it('fails listing explicitly when availability cannot be checked, without changing recents', async () => {
    const root = workspace.addFolder('/novels/יעל')
    workspace.recents = [{ root, title: 'יעל', lastOpenedAt: '' }]
    vi.spyOn(workspace, 'exists').mockResolvedValue({ ok: false, error: failure })
    const save = vi.spyOn(workspace, 'save')
    expect(await createListRecentProjects({ folders: workspace, recents: workspace })()).toEqual({
      ok: false,
      error: failure
    })
    expect(save).not.toHaveBeenCalled()
    expect(workspace.recents).toHaveLength(1)
  })

  it('refuses initialization when the nesting search cannot finish', async () => {
    const root = workspace.addFolder('/novels/יעל')
    const limit = {
      code: 'folder-search-limit',
      message: 'Search limit reached',
      diagnostic: { reason: 'workspace-folder-search-limit', path: root, limit: 10_000 }
    } as const
    vi.spyOn(workspace, 'findProjectBelow').mockResolvedValue({ ok: false, error: limit })
    const openProject = vi.fn()
    expect(
      await createInitializeProject({ folders: workspace, novelFiles: workspace, openProject })(
        root,
        'New'
      )
    ).toEqual({ ok: false, error: limit })
    expect(openProject).not.toHaveBeenCalled()
    expect(workspace.createdNovelFiles.size).toBe(0)
  })
})
