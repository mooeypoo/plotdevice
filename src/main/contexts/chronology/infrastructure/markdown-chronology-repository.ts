import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readFrontmatter } from '../../../infrastructure/markdown/read-frontmatter'
import type { ChronologyRepository } from '../domain/ports/chronology-repository'

/** Reads novel.md of the project at `rootOsPath`. */
export function createMarkdownChronologyRepository(rootOsPath: string): ChronologyRepository {
  return {
    async readNovelFrontmatter() {
      const bytes = await readFile(join(rootOsPath, 'novel.md')).catch(() => undefined)
      if (bytes === undefined) return undefined
      const reading = readFrontmatter(bytes)
      return reading.kind === 'read' ? reading.data : undefined
    }
  }
}
