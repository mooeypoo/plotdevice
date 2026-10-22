import { isMapping, readEntryText } from '../../../shared-kernel/frontmatter-values'
import { projectPathStem } from '../../../shared-kernel/project-path'
import { createEntryFiles } from '../../../infrastructure/markdown/entry-files'
import { scanProject } from '../../../infrastructure/project-scan/scan-project'
import type { RememberEntryBytes } from '../../../recovery/recovery-session'
import type { OutlineFile } from '../domain/outline-file'
import type { OutlineRepository } from '../domain/ports/outline-repository'

/** The outlines of the project at `rootOsPath`, as markdown files. */
export function createMarkdownOutlineRepository(
  rootOsPath: string,
  remember?: RememberEntryBytes
): OutlineRepository {
  const files = createEntryFiles(rootOsPath, remember)

  return {
    async load() {
      const scan = await scanProject(rootOsPath)
      const outlines: OutlineFile[] = []
      for (const file of scan.files) {
        if (file.classification.kind !== 'typed' || file.classification.type !== 'outline') continue
        const read = await files.readFrontmatter(file.path)
        const keys = read.ok && isMapping(read.value.frontmatter) ? read.value.frontmatter : {}
        outlines.push({
          path: file.path,
          title: readEntryText(keys['title']) ?? projectPathStem(file.path)
        })
      }
      return { outlines, taken: scan.files.map((file) => file.path) }
    },

    readText: (path) => files.readText(path),

    writeText: (path, text, expectedVersion) => files.writeText(path, text, expectedVersion),

    readBody: (path) => files.readBody(path),

    writeBody: (path, body, expectedVersion) => files.writeBody(path, body, expectedVersion),

    createFile: (path, text) => files.createFile(path, text)
  }
}
