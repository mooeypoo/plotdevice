import { readdir, stat } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import type { ProjectFolders, ProjectFoldersError } from '../domain/ports/project-folders'
import type { ProjectRoot } from '../domain/project-root'
import { domainError } from '../../../shared-kernel/domain-error'
import { err, ok, type Result } from '../../../shared-kernel/result'

const NOVEL_FILE = 'novel.md'

/**
 * How many folders `findProjectBelow` looks at before giving up. Choosing a huge folder (a home
 * directory) shouldn't hang the app. An incomplete search must not authorize initialization.
 */
const FOLDER_SEARCH_LIMIT = 10_000

/** `ProjectFolders` on the real file system. */
export function createNodeProjectFolders(
  platform: NodeJS.Platform = process.platform
): ProjectFolders {
  const comparable = (root: string): string =>
    platform === 'win32' ? resolve(root).toLowerCase() : resolve(root)

  return {
    exists: async (root) => {
      try {
        return ok((await stat(root)).isDirectory())
      } catch (error) {
        return isMissing(error) ? ok(false) : err(inspectionFailure(root, error))
      }
    },

    nameOf: (root) => basename(root),

    isSameRoot: (a, b) => comparable(a) === comparable(b),

    findProjectAbove: async (root) => {
      let folder = dirname(root)
      for (;;) {
        const marker = await isFile(join(folder, NOVEL_FILE))
        if (!marker.ok) return marker
        if (marker.value) return ok(folder as ProjectRoot)
        const parent = dirname(folder)
        if (parent === folder) return ok(undefined)
        folder = parent
      }
    },

    findProjectBelow: async (root) => {
      const queue = [root as string]
      let visited = 0
      while (queue.length > 0 && visited < FOLDER_SEARCH_LIMIT) {
        const folder = queue.shift()
        if (folder === undefined) throw new Error('Folder search queue unexpectedly empty.')
        visited += 1
        let entries: Dirent[]
        try {
          entries = await readdir(folder, { withFileTypes: true })
        } catch (error) {
          if (folder !== root && isMissing(error)) continue
          return err(inspectionFailure(folder, error))
        }
        if (
          folder !== root &&
          entries.some((entry) => entry.name === NOVEL_FILE && entry.isFile())
        ) {
          return ok(folder as ProjectRoot)
        }
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.'))
            queue.push(join(folder, entry.name))
        }
      }
      if (queue.length > 0) {
        console.warn('Project folder search limit reached.', root, FOLDER_SEARCH_LIMIT)
        return err(
          domainError('folder-search-limit', `Project folder search limit reached (${root}).`, {
            reason: 'workspace-folder-search-limit',
            path: root,
            limit: FOLDER_SEARCH_LIMIT
          })
        )
      }
      return ok(undefined)
    }
  }
}

async function isFile(osPath: string): Promise<Result<boolean, ProjectFoldersError>> {
  try {
    return ok((await stat(osPath)).isFile())
  } catch (error) {
    return isMissing(error) ? ok(false) : err(inspectionFailure(osPath, error))
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  )
}

function inspectionFailure(path: string, error: unknown): ProjectFoldersError {
  console.warn('Project folder inspection failed.', path, error)
  const detail = error instanceof Error ? error.message : String(error)
  return domainError(
    'folder-inspection-failed',
    `Project folder inspection failed (${path}): ${detail}`,
    {
      reason: 'workspace-folder-inspection-failed',
      path,
      detail
    }
  )
}
