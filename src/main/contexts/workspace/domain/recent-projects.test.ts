import { describe, expect, it } from 'vitest'
import type { ProjectRoot } from './project-root'
import {
  MAX_RECENT_PROJECTS,
  recordOpened,
  removeRecent,
  type RecentProject,
  type SameRoot
} from './recent-projects'

const exact: SameRoot = (a, b) => a === b
const ignoringCase: SameRoot = (a, b) => a.toLowerCase() === b.toLowerCase()

function recent(root: string, lastOpenedAt = '2026-10-01T00:00:00.000Z'): RecentProject {
  return { root: root as ProjectRoot, title: root, lastOpenedAt }
}

describe('recordOpened', () => {
  it('puts the opened project first', () => {
    const list = [recent('/a'), recent('/b')]
    expect(recordOpened(list, recent('/c'), exact).map((entry) => entry.root)).toEqual([
      '/c',
      '/a',
      '/b'
    ])
  })

  it('moves a project that is already listed, with its new title and time', () => {
    const list = [recent('/a'), recent('/b')]
    const reopened = { ...recent('/b', '2026-10-19T12:00:00.000Z'), title: 'Renamed' }
    expect(recordOpened(list, reopened, exact)).toEqual([reopened, recent('/a')])
  })

  it('uses the given comparison, so Windows paths match regardless of case', () => {
    const list = [recent('C:\\Novels\\Book')]
    expect(recordOpened(list, recent('c:\\novels\\book'), ignoringCase)).toHaveLength(1)
    expect(recordOpened(list, recent('c:\\novels\\book'), exact)).toHaveLength(2)
  })

  it(`keeps at most ${String(MAX_RECENT_PROJECTS)} projects, dropping the oldest`, () => {
    const list = Array.from({ length: MAX_RECENT_PROJECTS }, (_, index) =>
      recent(`/${String(index)}`)
    )
    const result = recordOpened(list, recent('/new'), exact)
    expect(result).toHaveLength(MAX_RECENT_PROJECTS)
    expect(result[0]?.root).toBe('/new')
    expect(result.some((entry) => entry.root === `/${String(MAX_RECENT_PROJECTS - 1)}`)).toBe(false)
  })
})

describe('removeRecent', () => {
  it('removes a project and keeps the order of the rest', () => {
    const list = [recent('/a'), recent('/b'), recent('/c')]
    expect(removeRecent(list, '/b' as ProjectRoot, exact).map((entry) => entry.root)).toEqual([
      '/a',
      '/c'
    ])
  })

  it('does nothing for a project that is not listed', () => {
    const list = [recent('/a')]
    expect(removeRecent(list, '/z' as ProjectRoot, exact)).toEqual(list)
  })
})
