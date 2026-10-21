import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { ProjectRoot } from '../project-root'
import type { RecentProject } from '../recent-projects'
import type { Clock } from './clock'
import type { CreateNovelFileError, NovelFileReading, NovelFileStore } from './novel-file-store'
import type { ProjectFolders, ProjectFoldersError } from './project-folders'
import type { ProjectScan, ProjectScanner } from './project-scanner'
import type { RecentProjectsError, RecentProjectsStore } from './recent-projects-store'

/** A folder in the fake file system. */
export interface FakeFolder {
  novel?: NovelFileReading
  scan?: ProjectScan
}

/**
 * An in-memory stand-in for every workspace port, for application tests. Folders are POSIX-style
 * paths; a folder's parent is everything before its last slash.
 */
export class InMemoryWorkspace
  implements ProjectFolders, NovelFileStore, ProjectScanner, RecentProjectsStore, Clock
{
  readonly folders = new Map<string, FakeFolder>()
  recents: readonly RecentProject[] = []
  readonly createdNovelFiles = new Map<string, string>()
  time = new Date('2026-10-19T12:00:00.000Z')

  addFolder(root: string, folder: FakeFolder = {}): ProjectRoot {
    this.folders.set(root, folder)
    return root as ProjectRoot
  }

  // ProjectFolders
  readonly isSameRoot = (a: ProjectRoot, b: ProjectRoot): boolean => a === b

  exists(root: ProjectRoot): Promise<Result<boolean, ProjectFoldersError>> {
    return Promise.resolve(ok(this.folders.has(root)))
  }

  nameOf(root: ProjectRoot): string {
    return root.slice(root.lastIndexOf('/') + 1)
  }

  findProjectAbove(
    root: ProjectRoot
  ): Promise<Result<ProjectRoot | undefined, ProjectFoldersError>> {
    let current = root.slice(0, root.lastIndexOf('/'))
    while (current !== '') {
      if (this.isProject(current)) return Promise.resolve(ok(current as ProjectRoot))
      current = current.slice(0, current.lastIndexOf('/'))
    }
    return Promise.resolve(ok(undefined))
  }

  findProjectBelow(
    root: ProjectRoot
  ): Promise<Result<ProjectRoot | undefined, ProjectFoldersError>> {
    const below = [...this.folders.keys()].find(
      (path) => path.startsWith(`${root}/`) && this.isProject(path)
    )
    return Promise.resolve(ok(below as ProjectRoot | undefined))
  }

  // NovelFileStore
  read(root: ProjectRoot): Promise<NovelFileReading> {
    return Promise.resolve(this.folders.get(root)?.novel ?? { kind: 'missing' })
  }

  create(root: ProjectRoot, text: string): Promise<Result<void, CreateNovelFileError>> {
    const folder = this.folders.get(root)
    if (folder === undefined) {
      return Promise.resolve(err({ code: 'write-failed', message: 'No such folder.' }))
    }
    if (folder.novel !== undefined && folder.novel.kind !== 'missing') {
      return Promise.resolve(err({ code: 'already-exists', message: 'novel.md exists.' }))
    }
    this.createdNovelFiles.set(root, text)
    folder.novel = { kind: 'read', frontmatter: { format: 1, title: titleIn(text) } }
    return Promise.resolve(ok(undefined))
  }

  // ProjectScanner
  scan(root: ProjectRoot): Promise<ProjectScan> {
    return Promise.resolve(this.folders.get(root)?.scan ?? { files: [], nestedProjects: [] })
  }

  // RecentProjectsStore
  load(): Promise<Result<readonly RecentProject[], RecentProjectsError>> {
    return Promise.resolve(ok(this.recents))
  }

  save(list: readonly RecentProject[]): Promise<Result<void, RecentProjectsError>> {
    this.recents = list
    return Promise.resolve(ok(undefined))
  }

  // Clock
  now(): Date {
    return this.time
  }

  private isProject(path: string): boolean {
    const novel = this.folders.get(path)?.novel
    return novel !== undefined && novel.kind !== 'missing'
  }
}

function titleIn(text: string): string {
  const line = text.split('\n').find((candidate) => candidate.startsWith('title: '))
  return line === undefined ? '' : (JSON.parse(line.slice('title: '.length)) as string)
}
