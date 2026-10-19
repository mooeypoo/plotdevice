import { readdir, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import type { ProjectFolders } from '../domain/ports/project-folders'
import type { ProjectRoot } from '../domain/project-root'

const NOVEL_FILE = 'novel.md'

/**
 * How many folders `findProjectBelow` looks at before giving up. Choosing a huge folder (a home
 * directory) shouldn't hang the app; the check is a safety net, not a guarantee.
 */
const FOLDER_SEARCH_LIMIT = 10_000

/** `ProjectFolders` on the real file system. */
export function createNodeProjectFolders(
  platform: NodeJS.Platform = process.platform
): ProjectFolders {
  const comparable = (root: string): string =>
    platform === 'win32' ? resolve(root).toLowerCase() : resolve(root)

  return {
    exists: async (root) => (await stat(root).catch(() => undefined))?.isDirectory() ?? false,

    nameOf: (root) => basename(root),

    isSameRoot: (a, b) => comparable(a) === comparable(b),

    findProjectAbove: async (root) => {
      let folder = dirname(root)
      for (;;) {
        if (await isFile(join(folder, NOVEL_FILE))) return folder as ProjectRoot
        const parent = dirname(folder)
        if (parent === folder) return undefined
        folder = parent
      }
    },

    findProjectBelow: async (root) => {
      const queue = [root as string]
      let visited = 0
      while (queue.length > 0 && visited < FOLDER_SEARCH_LIMIT) {
        const folder = queue.shift() ?? root
        visited += 1
        const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
        if (
          folder !== root &&
          entries.some((entry) => entry.name === NOVEL_FILE && entry.isFile())
        ) {
          return folder as ProjectRoot
        }
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.'))
            queue.push(join(folder, entry.name))
        }
      }
      return undefined
    }
  }
}

async function isFile(osPath: string): Promise<boolean> {
  return (await stat(osPath).catch(() => undefined))?.isFile() ?? false
}
