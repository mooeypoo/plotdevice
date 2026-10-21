import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { err, type Result } from '../../../../shared-kernel/result'
import { novelTemplate } from '../../domain/novel-template'
import type { NovelFileStore } from '../../domain/ports/novel-file-store'
import type { ProjectFolders } from '../../domain/ports/project-folders'
import type { ProjectRoot } from '../../domain/project-root'
import type { OpenedProject, OpenProject, OpenProjectError } from './open-project'

/** Why a folder couldn't become a project. */
export type InitializeProjectError =
  | OpenProjectError
  | DomainError<'already-a-project' | 'write-failed'>
  | (DomainError<'inside-project'> & { readonly projectAbove: ProjectRoot })
  | (DomainError<'contains-project'> & { readonly projectBelow: ProjectRoot })

/**
 * Makes `root` a project by writing novel.md, then opens it. It creates no other file or folder;
 * those appear when the app first puts something in them.
 */
export type InitializeProject = (
  root: ProjectRoot,
  title: string
) => Promise<Result<OpenedProject, InitializeProjectError>>

/** The ports and use cases `InitializeProject` needs. */
export interface InitializeProjectPorts {
  readonly folders: ProjectFolders
  readonly novelFiles: NovelFileStore
  readonly openProject: OpenProject
}

/** Builds the `InitializeProject` use case. */
export function createInitializeProject(ports: InitializeProjectPorts): InitializeProject {
  return async (root, title) => {
    if (!(await ports.folders.exists(root))) {
      return err(
        domainError('folder-missing', 'This folder no longer exists.', {
          reason: 'workspace-folder-missing',
          path: root
        })
      )
    }
    if ((await ports.novelFiles.read(root)).kind !== 'missing') {
      return err(
        domainError('already-a-project', 'This folder is already a project.', {
          reason: 'workspace-already-project',
          path: root
        })
      )
    }

    // Projects sit side by side; they are never nested.
    const projectAbove = await ports.folders.findProjectAbove(root)
    if (projectAbove !== undefined) {
      return err({
        ...domainError('inside-project', 'This folder is inside another project.', {
          reason: 'workspace-inside-project',
          path: projectAbove
        }),
        projectAbove
      })
    }
    const projectBelow = await ports.folders.findProjectBelow(root)
    if (projectBelow !== undefined) {
      return err({
        ...domainError('contains-project', 'This folder contains another project.', {
          reason: 'workspace-contains-project',
          path: projectBelow
        }),
        projectBelow
      })
    }

    const trimmedTitle = title.trim()
    const created = await ports.novelFiles.create(
      root,
      novelTemplate(trimmedTitle === '' ? ports.folders.nameOf(root) : trimmedTitle)
    )
    if (!created.ok) {
      if (created.error.code === 'already-exists') {
        return err(
          domainError('already-a-project', 'This folder is already a project.', {
            reason: 'workspace-already-project',
            path: root
          })
        )
      }
      return err(domainError('write-failed', created.error.message, created.error.diagnostic))
    }

    return ports.openProject(root)
  }
}
