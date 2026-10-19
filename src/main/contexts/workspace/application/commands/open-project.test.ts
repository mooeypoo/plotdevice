import { beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { InMemoryWorkspace } from '../../domain/ports/in-memory-workspace.fake'
import type { ProjectRoot } from '../../domain/project-root'
import { createOpenProject, type OpenProject } from './open-project'

let workspace: InMemoryWorkspace
let openProject: OpenProject

beforeEach(() => {
  workspace = new InMemoryWorkspace()
  openProject = createOpenProject({
    folders: workspace,
    novelFiles: workspace,
    scanner: workspace,
    recents: workspace,
    clock: workspace
  })
})

describe('OpenProject', () => {
  it('opens a project and returns its scan', async () => {
    const scan = {
      files: [
        {
          path: 'manuscript/Arrival.md' as ProjectPath,
          classification: { kind: 'typed', type: 'chapter' } as const
        }
      ],
      nestedProjects: []
    }
    const root = workspace.addFolder('/novels/preservers', {
      novel: { kind: 'read', frontmatter: { format: 1, title: 'The Preservers' } },
      scan
    })

    const result = await openProject(root)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.project.title).toBe('The Preservers')
    expect(result.value.scan).toEqual(scan)
  })

  it('records the project at the top of the recents list', async () => {
    const root = workspace.addFolder('/novels/preservers', {
      novel: { kind: 'read', frontmatter: { title: 'The Preservers' } }
    })
    workspace.recents = [
      {
        root: '/novels/other' as ProjectRoot,
        title: 'Other',
        lastOpenedAt: '2026-01-01T00:00:00.000Z'
      }
    ]

    await openProject(root)

    expect(workspace.recents.map((entry) => entry.title)).toEqual(['The Preservers', 'Other'])
    expect(workspace.recents[0]?.lastOpenedAt).toBe('2026-10-19T12:00:00.000Z')
  })

  it('fails for a folder that no longer exists', async () => {
    const result = await openProject('/gone' as ProjectRoot)
    expect(result).toMatchObject({ ok: false, error: { code: 'folder-missing' } })
  })

  it('fails for a folder without novel.md', async () => {
    const root = workspace.addFolder('/novels/drafts')
    const result = await openProject(root)
    expect(result).toMatchObject({ ok: false, error: { code: 'not-a-project' } })
    if (!result.ok) expect(result.error).not.toHaveProperty('projectAbove')
    expect(workspace.recents).toEqual([])
  })

  it('points to the project above when the folder is inside one', async () => {
    workspace.addFolder('/novels/preservers', { novel: { kind: 'read', frontmatter: {} } })
    const characters = workspace.addFolder('/novels/preservers/characters')

    const result = await openProject(characters)

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'not-a-project', projectAbove: '/novels/preservers' }
    })
  })

  it('opens a project whose novel.md is unreadable, read-only', async () => {
    const root = workspace.addFolder('/novels/broken', {
      novel: { kind: 'unreadable', problem: 'unparseable-frontmatter' }
    })

    const result = await openProject(root)

    expect(result).toMatchObject({
      ok: true,
      value: { project: { title: 'broken', readOnly: true } }
    })
  })
})
