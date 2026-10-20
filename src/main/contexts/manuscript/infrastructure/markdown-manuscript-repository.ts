import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { domainError } from '../../../shared-kernel/domain-error'
import type { LinkCandidate } from '../../../shared-kernel/link-index'
import { parseProjectPath } from '../../../shared-kernel/project-path'
import { err, ok } from '../../../shared-kernel/result'
import { createEntryFiles } from '../../../infrastructure/markdown/entry-files'
import { splitMarkdownFile, toEditorText } from '../../../infrastructure/markdown/markdown-file'
import { readFrontmatter } from '../../../infrastructure/markdown/read-frontmatter'
import { scanProject } from '../../../infrastructure/project-scan/scan-project'
import { readChapter, type Chapter } from '../domain/chapter'
import type { EntrySource } from '../domain/entry-warnings'
import { isMapping } from '../../../shared-kernel/frontmatter-values'
import { readPart, type Part } from '../domain/part'
import type { ManuscriptRepository } from '../domain/ports/manuscript-repository'

const NOVEL_FILE = parseProjectPath('novel.md')

/** The manuscript of the project at `rootOsPath`, as markdown files on disk. */
export function createMarkdownManuscriptRepository(rootOsPath: string): ManuscriptRepository {
  const files = createEntryFiles(rootOsPath)

  return {
    async load() {
      const scan = await scanProject(rootOsPath)
      const parts: Part[] = []
      const chapters: Chapter[] = []
      const sources: EntrySource[] = []
      const linkCandidates: LinkCandidate[] = scan.files.map((file) =>
        file.classification.kind === 'typed'
          ? { path: file.path, type: file.classification.type }
          : { path: file.path }
      )

      for (const file of scan.files) {
        if (file.classification.kind !== 'typed') continue
        const { type } = file.classification
        if (type !== 'part' && type !== 'chapter') continue

        const bytes = await readFile(join(rootOsPath, ...file.path.split('/'))).catch(
          () => undefined
        )
        if (bytes === undefined) continue
        const frontmatter = readFrontmatter(bytes)
        const split = splitMarkdownFile(bytes)
        if (frontmatter.kind !== 'read' || split.kind !== 'parts') continue

        const body = toEditorText(split.parts.body)
        sources.push({ path: file.path, frontmatter: frontmatter.data, body })
        if (type === 'part') parts.push(readPart(file.path, frontmatter.data, body))
        else chapters.push(readChapter(file.path, frontmatter.data, body))
      }
      return { parts, chapters, linkCandidates, sources }
    },

    async readText(path) {
      const read = await files.readText(path)
      return read.ok ? ok({ path, ...read.value }) : read
    },

    writeText: (path, text, expectedVersion) => files.writeText(path, text, expectedVersion),

    async readEntryFile(path) {
      const read = await files.readFrontmatter(path)
      if (!read.ok) return read
      const { frontmatter, version } = read.value
      const type = isMapping(frontmatter) ? frontmatter['type'] : undefined
      if (type !== 'part' && type !== 'chapter') {
        return err(
          domainError('unreadable', `"${path}" isn't a part or chapter that can be read safely.`)
        )
      }
      return ok({ path, kind: type, frontmatter, version })
    },

    writeProperties: (path, writes, expectedVersion) =>
      files.writeKeys(path, writes, expectedVersion),

    createFile: (path, text) => files.createFile(path, text),

    rewriteLinks: (path, decide, expectedVersion) =>
      files.rewriteLinks(path, decide, expectedVersion),

    async readNovelFrontmatter() {
      if (!NOVEL_FILE.ok) return undefined
      const read = await files.readFrontmatter(NOVEL_FILE.value)
      return read.ok ? read.value.frontmatter : undefined
    },

    async writeNovelProperties(writes) {
      if (!NOVEL_FILE.ok) return err(domainError('not-found', 'novel.md is missing.'))
      const written = await files.writeKeys(NOVEL_FILE.value, writes, undefined)
      return written.ok ? ok(undefined) : written
    }
  }
}
