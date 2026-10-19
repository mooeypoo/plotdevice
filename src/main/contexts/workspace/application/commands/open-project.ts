import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { isInFolder } from '../../../../shared-kernel/is-in-folder'
import { parseProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { Clock } from '../../domain/ports/clock'
import type { NovelFileStore } from '../../domain/ports/novel-file-store'
import type { ProjectFolders } from '../../domain/ports/project-folders'
import type { ProjectScan, ProjectScanner } from '../../domain/ports/project-scanner'
import type { RecentProjectsStore } from '../../domain/ports/recent-projects-store'
import { readProject, readUnreadableProject, type Project } from '../../domain/project'
import type { ProjectRoot } from '../../domain/project-root'
import { recordOpened } from '../../domain/recent-projects'

/** A project that is now open, with every markdown file it contains. */
export interface OpenedProject {
  readonly project: Project
  readonly scan: ProjectScan
}

/** Why a folder couldn't be opened as a project. */
export type OpenProjectError =
  | DomainError<'folder-missing'>
  | (DomainError<'not-a-project'> & { readonly projectAbove?: ProjectRoot })

/** Opens the project in `root` and records it in the recents list. */
export type OpenProject = (root: ProjectRoot) => Promise<Result<OpenedProject, OpenProjectError>>

/**
 * Reads the project in `root` as it is now, without recording it anywhere. Used to refresh the
 * open project after files change outside the app.
 */
export type ReadProject = OpenProject

/** The ports `ReadProject` needs. */
export interface ReadProjectPorts {
  readonly folders: ProjectFolders
  readonly novelFiles: NovelFileStore
  readonly scanner: ProjectScanner
}

/** The ports `OpenProject` needs. */
export interface OpenProjectPorts extends ReadProjectPorts {
  readonly recents: RecentProjectsStore
  readonly clock: Clock
}

/** Builds the `ReadProject` query. */
export function createReadProject(ports: ReadProjectPorts): ReadProject {
  return async (root) => {
    if (!(await ports.folders.exists(root))) {
      return err(domainError('folder-missing', 'This folder no longer exists.'))
    }

    const reading = await ports.novelFiles.read(root)
    if (reading.kind === 'missing') {
      const projectAbove = await ports.folders.findProjectAbove(root)
      return err({
        ...domainError('not-a-project', 'This folder has no novel.md.'),
        ...(projectAbove !== undefined ? { projectAbove } : {})
      })
    }

    const folderName = ports.folders.nameOf(root)
    const project =
      reading.kind === 'read'
        ? readProject(root, folderName, reading.frontmatter)
        : readUnreadableProject(root, folderName, reading.problem)
    const scan = await ports.scanner.scan(root)
    // Template files only seed new entries; they aren't untyped files or problems.
    const templates = parseProjectPath(project.settings.folders.template)
    const files = scan.files.filter(
      (file) => !isInFolder(file.path, templates.ok ? templates.value : undefined)
    )
    return ok({ project, scan: { ...scan, files } })
  }
}

/** Builds the `OpenProject` use case. */
export function createOpenProject(ports: OpenProjectPorts): OpenProject {
  const read = createReadProject(ports)
  return async (root) => {
    const opened = await read(root)
    if (!opened.ok) return opened

    const recents = await ports.recents.load()
    await ports.recents.save(
      recordOpened(
        recents,
        { root, title: opened.value.project.title, lastOpenedAt: ports.clock.now().toISOString() },
        ports.folders.isSameRoot
      )
    )
    return opened
  }
}
