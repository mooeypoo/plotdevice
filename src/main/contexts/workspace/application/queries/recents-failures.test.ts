import { describe, expect, it, vi } from 'vitest'
import { InMemoryWorkspace } from '../../domain/ports/in-memory-workspace.fake'
import { createRemoveRecentProject } from '../commands/remove-recent-project'
import { createListRecentProjects } from './list-recent-projects'

describe('recent project failures', () => {
  it('propagates failed reads without checking folders or overwriting settings', async () => {
    const workspace = new InMemoryWorkspace()
    const root = workspace.addFolder('/book')
    const failure = { ok: false, error: { code: 'recents-invalid', message: 'Invalid' } } as const
    vi.spyOn(workspace, 'load').mockResolvedValue(failure)
    const exists = vi.spyOn(workspace, 'exists')
    const save = vi.spyOn(workspace, 'save')
    expect(await createListRecentProjects({ folders: workspace, recents: workspace })()).toEqual(
      failure
    )
    expect(
      await createRemoveRecentProject({ folders: workspace, recents: workspace })(root)
    ).toEqual(failure)
    expect(exists).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps the list intact on failed removal and allows an explicit successful retry', async () => {
    const workspace = new InMemoryWorkspace()
    const root = workspace.addFolder('/book')
    workspace.recents = [{ root, title: 'Book', lastOpenedAt: '' }]
    const remove = createRemoveRecentProject({ folders: workspace, recents: workspace })
    const failure = { ok: false, error: { code: 'recents-save-failed', message: 'Full' } } as const
    vi.spyOn(workspace, 'save').mockResolvedValueOnce(failure)
    expect(await remove(root)).toEqual(failure)
    expect(workspace.recents).toHaveLength(1)
    expect(await remove(root)).toEqual({ ok: true, value: undefined })
    expect(workspace.recents).toEqual([])
  })
})
