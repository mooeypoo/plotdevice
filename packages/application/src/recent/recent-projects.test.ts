import { err, ok, type ProjectPath, type Result } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { AppDataFile, AppDataWriteFailure } from '../ports/app-data-file'
import { createRecentProjectsSession, MAX_RECENT_PROJECTS, parseRecentProjects } from './recent-projects'

const p = (path: string) => path as ProjectPath

function memoryFile(initial: string | null = null) {
  const state = { text: initial, setAside: 0, writes: 0 }
  const file: AppDataFile = {
    read: async () => state.text,
    write: async (text): Promise<Result<void, AppDataWriteFailure>> => {
      state.writes++
      state.text = text
      return ok(undefined)
    },
    setAside: async () => {
      state.setAside++
      state.text = null
    },
  }
  return { file, state }
}

describe('recent projects', () => {
  it('lists the most recently opened first, once each, at most eight', async () => {
    const { file } = memoryFile()
    const recent = await createRecentProjectsSession(file)
    for (let i = 1; i <= 10; i++) await recent.opened({ root: `/books/${i}`, title: `Book ${i}` })
    await recent.opened({ root: '/books/5', title: 'Book 5, retitled' })
    const roots = recent.current().projects.map((project) => project.root)
    expect(roots).toHaveLength(MAX_RECENT_PROJECTS)
    expect(roots[0]).toBe('/books/5')
    expect(recent.current().projects[0]?.title).toBe('Book 5, retitled')
    expect(new Set(roots).size).toBe(roots.length)
  })

  it('remembers the last chapter and cursor of each project, and survives a restart', async () => {
    const { file } = memoryFile()
    const recent = await createRecentProjectsSession(file)
    await recent.opened({ root: '/books/orchard', title: 'The Salt Orchard' })
    await recent.leftOff('/books/orchard', { file: p('manuscript/frost.md'), cursor: 120 })
    const restarted = await createRecentProjectsSession(file)
    expect(restarted.current().projects[0]).toEqual({ root: '/books/orchard', title: 'The Salt Orchard', leftOff: { file: 'manuscript/frost.md', cursor: 120 } })
  })

  it('forgets a project on request', async () => {
    const { file } = memoryFile()
    const recent = await createRecentProjectsSession(file)
    await recent.opened({ root: '/books/a', title: 'A' })
    await recent.forget('/books/a')
    expect(recent.current().projects).toEqual([])
  })

  it('keeps every readable entry and drops the rest', () => {
    const text = JSON.stringify({ projects: [{ root: '/ok', title: 'Fine' }, { root: 5 }, { root: '/half', title: 'Half', leftOff: { file: '../escape', cursor: -1 } }, 'junk'] })
    expect(parseRecentProjects(text)).toEqual({ ok: true, value: { projects: [{ root: '/ok', title: 'Fine' }, { root: '/half', title: 'Half' }] } })
  })

  it('sets an unreadable file aside and starts empty', async () => {
    const { file, state } = memoryFile('{ not json')
    const recent = await createRecentProjectsSession(file)
    expect(recent.current().projects).toEqual([])
    expect(state.setAside).toBe(1)
  })

  it('writes one change at a time, each building on the last', async () => {
    const { file, state } = memoryFile()
    const recent = await createRecentProjectsSession(file)
    await Promise.all([recent.opened({ root: '/a', title: 'A' }), recent.opened({ root: '/b', title: 'B' }), recent.leftOff('/a', { file: p('x.md'), cursor: 1 })])
    await recent.idle()
    expect(parseRecentProjects(state.text ?? '')).toEqual({
      ok: true,
      value: { projects: [{ root: '/b', title: 'B' }, { root: '/a', title: 'A', leftOff: { file: 'x.md', cursor: 1 } }] },
    })
  })

  it('reports a failed write and keeps the list in effect', async () => {
    const recent = await createRecentProjectsSession({ read: async () => null, write: async () => err('read-only' as const), setAside: async () => undefined })
    expect(await recent.opened({ root: '/a', title: 'A' })).toEqual({ ok: false, error: 'read-only' })
    expect(recent.current().projects).toEqual([{ root: '/a', title: 'A' }])
  })

  it('remembers the workspace, outline and view, and drops what it can\'t read', async () => {
    const { file } = memoryFile()
    const recent = await createRecentProjectsSession(file)
    await recent.opened({ root: '/a', title: 'A' })
    await recent.place('/a', { workspace: 'story', outline: p('outlines/main-story.md'), view: 'cards' })
    const restarted = await createRecentProjectsSession(file)
    expect(restarted.current().projects[0]?.place).toEqual({ workspace: 'story', outline: 'outlines/main-story.md', view: 'cards' })
    const text = JSON.stringify({ projects: [{ root: '/b', title: 'B', place: { workspace: 'Story' } }, { root: '/c', title: 'C', place: { workspace: 'write', outline: '../x.md', view: 'grid' } }] })
    expect(parseRecentProjects(text)).toEqual({ ok: true, value: { projects: [{ root: '/b', title: 'B' }, { root: '/c', title: 'C', place: { workspace: 'write' } }] } })
  })

  it('keeps the pinned shelf in order, and drops paths it can\'t read', async () => {
    const { file } = memoryFile()
    const recent = await createRecentProjectsSession(file)
    await recent.opened({ root: '/a', title: 'A' })
    await recent.pin('/a', [p('places/marrow.md'), p('characters/ilka.md')])
    expect((await createRecentProjectsSession(file)).current().projects[0]?.shelf).toEqual(['places/marrow.md', 'characters/ilka.md'])
    expect(parseRecentProjects(JSON.stringify({ projects: [{ root: '/b', title: 'B', shelf: ['ok.md', '../escape.md', 3] }] }))).toEqual({ ok: true, value: { projects: [{ root: '/b', title: 'B', shelf: ['ok.md'] }] } })
  })
})
