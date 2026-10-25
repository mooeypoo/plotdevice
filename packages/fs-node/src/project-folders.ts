import type { CreateFolderProblem, ProjectFolders } from '@plotdevice/application'
import { err, ok, type Result } from '@plotdevice/shared'
import { access, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { createFileStore } from './file-store'

/** Project folders on the local disk. */
export function createProjectFolders(): ProjectFolders {
  return {
    async create(location, name): Promise<Result<string, CreateFolderProblem>> {
      if (await isInsideProject(resolve(location))) return err('inside-project')
      const root = join(location, name)
      try {
        await mkdir(root)
        return ok(root)
      } catch (cause) {
        return err((cause as NodeJS.ErrnoException).code === 'EEXIST' ? 'exists' : 'io')
      }
    },
    open: (root) => createFileStore(root),
  }
}

/** A folder is a project if it has both `project.md` and `CONTENTS.md` (ADR 0006). */
async function isInsideProject(folder: string): Promise<boolean> {
  for (let dir = folder; ; dir = dirname(dir)) {
    const project = await Promise.all(['project.md', 'CONTENTS.md'].map((file) => access(join(dir, file)).then(() => true, () => false)))
    if (project.every(Boolean)) return true
    if (dirname(dir) === dir) return false
  }
}
