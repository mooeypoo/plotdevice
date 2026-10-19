import { createHash } from 'node:crypto'
import { readdir, readFile, rm } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scanProject } from '../../../infrastructure/project-scan/scan-project'
import {
  copySampleNovel,
  makeTempFolder,
  type SampleNovelCopy
} from '../../../infrastructure/testing/sample-novel'
import { createInitializeProject } from '../application/commands/initialize-project'
import { createOpenProject } from '../application/commands/open-project'
import { createListRecentProjects } from '../application/queries/list-recent-projects'
import { createJsonRecentProjectsStore } from './json-recent-projects-store'
import { createMarkdownNovelFileStore } from './markdown-novel-file-store'
import { createNodeProjectFolders } from './node-project-folders'
import { projectRootFromOsPath } from './project-root-from-os-path'
import { systemClock } from './system-clock'

let project: SampleNovelCopy
let settings: SampleNovelCopy

beforeEach(async () => {
  project = await copySampleNovel()
  settings = await makeTempFolder()
})

afterEach(async () => {
  await project.remove()
  await settings.remove()
})

function wire(): {
  openProject: ReturnType<typeof createOpenProject>
  initializeProject: ReturnType<typeof createInitializeProject>
  listRecentProjects: ReturnType<typeof createListRecentProjects>
} {
  const folders = createNodeProjectFolders()
  const novelFiles = createMarkdownNovelFileStore()
  const recents = createJsonRecentProjectsStore(settings.root)
  const openProject = createOpenProject({
    folders,
    novelFiles,
    scanner: { scan: scanProject },
    recents,
    clock: systemClock
  })
  return {
    openProject,
    initializeProject: createInitializeProject({ folders, novelFiles, openProject }),
    listRecentProjects: createListRecentProjects({ folders, recents })
  }
}

async function hashEveryFile(folder: string): Promise<Record<string, string>> {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true })
  const hashes: Record<string, string> = {}
  for (const entry of entries.filter((candidate) => candidate.isFile())) {
    const osPath = join(entry.parentPath, entry.name)
    hashes[relative(folder, osPath)] = createHash('sha256')
      .update(await readFile(osPath))
      .digest('hex')
  }
  return hashes
}

describe('workspace on real files', () => {
  it('opens the sample novel and lists it in recents', async () => {
    const { openProject, listRecentProjects } = wire()
    const root = projectRootFromOsPath(project.root)

    const result = await openProject(root)

    expect(result).toMatchObject({ ok: true, value: { project: { title: 'The Preservers' } } })
    if (result.ok) expect(result.value.scan.files).toHaveLength(30)
    expect(await listRecentProjects()).toMatchObject([
      { root, title: 'The Preservers', available: true }
    ])
  })

  it('opening changes no file in the project', async () => {
    const before = await hashEveryFile(project.root)
    await wire().openProject(projectRootFromOsPath(project.root))
    expect(await hashEveryFile(project.root)).toEqual(before)
  })

  it('initializing adds novel.md and touches no other file', async () => {
    // A folder full of someone's existing notes, without novel.md.
    await rm(join(project.root, 'novel.md'))
    const before = await hashEveryFile(project.root)

    const result = await wire().initializeProject(projectRootFromOsPath(project.root), 'My Notes')

    expect(result).toMatchObject({ ok: true, value: { project: { title: 'My Notes' } } })
    const after = await hashEveryFile(project.root)
    expect(Object.keys(after).filter((path) => !(path in before))).toEqual(['novel.md'])
    const unchanged = Object.fromEntries(
      Object.entries(after).filter(([path]) => path !== 'novel.md')
    )
    expect(unchanged).toEqual(before)
  })

  it('refuses to initialize a folder that contains a project', async () => {
    const parent = projectRootFromOsPath(join(project.root, '..'))
    expect(await wire().initializeProject(parent, 'Everything')).toMatchObject({
      ok: false,
      error: { code: 'contains-project' }
    })
  })
})
