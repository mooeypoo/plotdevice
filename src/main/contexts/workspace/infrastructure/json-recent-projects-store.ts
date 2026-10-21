import { mkdir, readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'
import { z } from 'zod'
import { writeTextFileAtomically } from '../../../infrastructure/fs/write-text-file-atomically'
import type {
  RecentProjectsError,
  RecentProjectsStore
} from '../domain/ports/recent-projects-store'
import type { ProjectRoot } from '../domain/project-root'
import type { RecentProject } from '../domain/recent-projects'
import { domainError } from '../../../shared-kernel/domain-error'
import { err, ok } from '../../../shared-kernel/result'

const recentProjectsFileSchema = z.object({
  version: z.literal(1),
  projects: z.array(
    z.object({
      root: z.string().refine(isAbsolute, 'must be an absolute path'),
      title: z.string(),
      lastOpenedAt: z.string()
    })
  )
})

/** The recents list as `recent-projects.json` in the settings folder (userData). */
export function createJsonRecentProjectsStore(settingsFolder: string): RecentProjectsStore {
  const filePath = join(settingsFolder, 'recent-projects.json')
  const failure = (reason: RecentProjectsError['code'], error: unknown): RecentProjectsError => {
    console.warn('Recent project settings failure.', reason, filePath, error)
    const detail = error instanceof Error ? error.message : String(error)
    return domainError(reason, `Recent project settings failure (${filePath}): ${detail}`, {
      reason,
      path: filePath,
      detail
    })
  }

  return {
    load: async () => {
      let text: string
      try {
        text = await readFile(filePath, 'utf8')
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return ok([])
        return err(failure('recents-read-failed', error))
      }

      let value: unknown
      try {
        value = JSON.parse(text) as unknown
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error
        return err(failure('recents-invalid', error))
      }
      const parsed = recentProjectsFileSchema.safeParse(value)
      if (!parsed.success) {
        return err(failure('recents-invalid', parsed.error))
      }
      return ok(
        parsed.data.projects.map((entry): RecentProject => ({
          ...entry,
          root: entry.root as ProjectRoot
        }))
      )
    },

    save: async (list) => {
      try {
        await mkdir(dirname(filePath), { recursive: true })
        const file: z.infer<typeof recentProjectsFileSchema> = { version: 1, projects: [...list] }
        await writeTextFileAtomically(filePath, `${JSON.stringify(file, null, 2)}\n`)
        return ok(undefined)
      } catch (error) {
        return err(failure('recents-save-failed', error))
      }
    }
  }
}
