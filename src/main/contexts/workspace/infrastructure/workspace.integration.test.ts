import { createHash } from 'node:crypto'
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import { createRemoveRecentProject } from '../application/commands/remove-recent-project'
import { createInspectFolder } from '../application/queries/inspect-folder'
import { resolveBookWords } from '../../../book-language/book-words'
import { templateWordsOf } from '../../../book-language/context-words'

let project: SampleNovelCopy
let settings: SampleNovelCopy

beforeEach(async () => {
  project = await copySampleNovel()
  settings = await makeTempFolder()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await project.remove()
  await settings.remove()
})

function wire(folders = createNodeProjectFolders()): {
  openProject: ReturnType<typeof createOpenProject>
  initializeProject: ReturnType<typeof createInitializeProject>
  listRecentProjects: ReturnType<typeof createListRecentProjects>
} {
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
    initializeProject: createInitializeProject({
      folders,
      novelFiles,
      openProject,
      templateWords: (language: string) => templateWordsOf(resolveBookWords(language))
    }),
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
  it.each(['missing', 'novel.md'])(
    'reports selected %s as a missing folder, without inspecting it as a new project',
    async (name) => {
      const before = await hashEveryFile(project.root)
      const root = projectRootFromOsPath(join(project.root, name))
      expect(
        await createInspectFolder({
          folders: createNodeProjectFolders(),
          novelFiles: createMarkdownNovelFileStore()
        })(root)
      ).toMatchObject({
        ok: false,
        error: {
          code: 'folder-missing',
          diagnostic: { reason: 'workspace-folder-missing', path: root }
        }
      })
      expect(await hashEveryFile(project.root)).toEqual(before)
      expect(await readdir(settings.root)).toEqual([])
    }
  )

  it.each(['folder-inspection-failed', 'folder-search-limit'] as const)(
    'leaves every novel byte and settings untouched when inspection/initialization encounters %s',
    async (code) => {
      await rm(join(project.root, 'novel.md'))
      const before = await hashEveryFile(project.root)
      const folders = createNodeProjectFolders()
      const root = projectRootFromOsPath(project.root)
      const error = {
        code,
        message: 'Cannot establish project nesting',
        diagnostic:
          code === 'folder-search-limit'
            ? ({ reason: 'workspace-folder-search-limit', path: root, limit: 10_000 } as const)
            : ({
                reason: 'workspace-folder-inspection-failed',
                path: root,
                detail: 'EACCES'
              } as const)
      }
      vi.spyOn(folders, 'findProjectBelow').mockResolvedValue({ ok: false, error })
      expect(await wire(folders).initializeProject(root, 'New', 'en')).toEqual({ ok: false, error })
      expect(
        await createInspectFolder({ folders, novelFiles: createMarkdownNovelFileStore() })(root)
      ).toEqual({ ok: false, error })
      expect(await hashEveryFile(project.root)).toEqual(before)
      expect(await readdir(settings.root)).toEqual([])
    }
  )

  it('preserves invalid settings and every novel byte while opening with a warning', async () => {
    const original = '{ broken settings יעל'
    const file = join(settings.root, 'recent-projects.json')
    await writeFile(file, original)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const before = await hashEveryFile(project.root)
    const root = projectRootFromOsPath(project.root)
    const cases = wire()
    expect(await cases.openProject(root)).toMatchObject({
      ok: true,
      value: { recentProjectsError: { diagnostic: { reason: 'recents-invalid', path: file } } }
    })
    expect(await cases.listRecentProjects()).toMatchObject({
      ok: false,
      error: { code: 'recents-invalid' }
    })
    const remove = createRemoveRecentProject({
      folders: createNodeProjectFolders(),
      recents: createJsonRecentProjectsStore(settings.root)
    })
    expect(await remove(root)).toMatchObject({ ok: false, error: { code: 'recents-invalid' } })
    expect(await readFile(file, 'utf8')).toBe(original)
    expect(await readdir(settings.root)).toEqual(['recent-projects.json'])
    expect(await hashEveryFile(project.root)).toEqual(before)
  })

  it('opens the sample novel and lists it in recents', async () => {
    const { openProject, listRecentProjects } = wire()
    const root = projectRootFromOsPath(project.root)

    const result = await openProject(root)

    expect(result).toMatchObject({ ok: true, value: { project: { title: 'The Salt Orchard' } } })
    if (result.ok) expect(result.value.scan.files).toHaveLength(35)
    expect(await listRecentProjects()).toMatchObject({
      ok: true,
      value: [{ root, title: 'The Salt Orchard', available: true }]
    })
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

    const result = await wire().initializeProject(
      projectRootFromOsPath(project.root),
      'My Notes',
      'en'
    )

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
    expect(await wire().initializeProject(parent, 'Everything', 'en')).toMatchObject({
      ok: false,
      error: { code: 'contains-project' }
    })
  })
})
