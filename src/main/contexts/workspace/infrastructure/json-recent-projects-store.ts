import { mkdir, readFile, rename } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'
import { z } from 'zod'
import { writeTextFileAtomically } from '../../../infrastructure/fs/write-text-file-atomically'
import type { RecentProjectsStore } from '../domain/ports/recent-projects-store'
import type { ProjectRoot } from '../domain/project-root'
import type { RecentProject } from '../domain/recent-projects'

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

  return {
    load: async () => {
      let text: string
      try {
        text = await readFile(filePath, 'utf8')
      } catch {
        return []
      }

      const parsed = recentProjectsFileSchema.safeParse(parseJson(text))
      if (!parsed.success) {
        // Keep the bad file for inspection instead of silently overwriting it.
        await rename(filePath, join(settingsFolder, 'recent-projects.corrupt.json')).catch(
          () => undefined
        )
        return []
      }
      return parsed.data.projects.map((entry): RecentProject => ({
        ...entry,
        root: entry.root as ProjectRoot
      }))
    },

    save: async (list) => {
      await mkdir(dirname(filePath), { recursive: true })
      const file: z.infer<typeof recentProjectsFileSchema> = { version: 1, projects: [...list] }
      await writeTextFileAtomically(filePath, `${JSON.stringify(file, null, 2)}\n`)
    }
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}
