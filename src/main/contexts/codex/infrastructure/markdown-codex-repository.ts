import { domainError } from '../../../shared-kernel/domain-error'
import { isMapping, readEntryText } from '../../../shared-kernel/frontmatter-values'
import { projectPathStem } from '../../../shared-kernel/project-path'
import type { LinkCandidate } from '../../../shared-kernel/link-index'
import { err, ok } from '../../../shared-kernel/result'
import { createEntryFiles } from '../../../infrastructure/markdown/entry-files'
import { scanProject } from '../../../infrastructure/project-scan/scan-project'
import { CODEX_KINDS, readCodexEntry, type CodexEntry, type CodexKind } from '../domain/codex-entry'
import type { CodexRepository } from '../domain/ports/codex-repository'
import type { CodexSource } from '../domain/relationships'
import type { OutlineFile } from '../domain/outline-file'
import type { UntypedFile } from '../domain/untyped-file'
import type { RememberEntryBytes } from '../../../recovery/recovery-session'

const isCodexKind = (value: unknown): value is CodexKind => CODEX_KINDS.includes(value as CodexKind)

/** The characters, locations, and notes of the project at `rootOsPath`, as markdown files. */
export function createMarkdownCodexRepository(
  rootOsPath: string,
  remember?: RememberEntryBytes
): CodexRepository {
  const files = createEntryFiles(rootOsPath, remember)

  return {
    async load() {
      const scan = await scanProject(rootOsPath)
      const entries: CodexEntry[] = []
      const untyped: UntypedFile[] = []
      const linkCandidates: LinkCandidate[] = []
      const sources: CodexSource[] = []
      const outlines: OutlineFile[] = []
      for (const file of scan.files) {
        const { classification } = file
        if (classification.kind !== 'typed') {
          // Files that can't be parsed are in the warnings panel; typing them would mean editing them.
          if (file.problem !== undefined) continue
          untyped.push(
            classification.rawType !== undefined
              ? { path: file.path, rawType: classification.rawType }
              : { path: file.path }
          )
          continue
        }
        linkCandidates.push({ path: file.path, type: classification.type })
        if (classification.type === 'outline') {
          const read = await files.readFrontmatter(file.path)
          const keys = read.ok && isMapping(read.value.frontmatter) ? read.value.frontmatter : {}
          outlines.push({
            path: file.path,
            title: readEntryText(keys['title']) ?? projectPathStem(file.path)
          })
          continue
        }
        if (!isCodexKind(classification.type)) continue
        const read = await files.readFrontmatter(file.path)
        if (!read.ok) continue
        const entry = readCodexEntry(file.path, classification.type, read.value.frontmatter)
        entries.push(entry)
        sources.push({ path: file.path, title: entry.title, frontmatter: read.value.frontmatter })
      }
      return { entries, untyped, linkCandidates, sources, outlines }
    },

    readText: (path) => files.readText(path),

    writeText: (path, text, expectedVersion) => files.writeText(path, text, expectedVersion),

    readFileText: (path) => files.readWholeText(path),

    async readEntryFile(path) {
      const read = await files.readFrontmatter(path)
      if (!read.ok) return read
      const { frontmatter, version } = read.value
      const type = isMapping(frontmatter) ? frontmatter['type'] : undefined
      if (!isCodexKind(type)) {
        return err(domainError('unreadable', `"${path}" isn't a character, location, or note.`))
      }
      return ok({ path, kind: type, frontmatter, version })
    },

    writeProperties: (path, writes, expectedVersion) =>
      files.writeKeys(path, writes, expectedVersion),

    createFile: (path, text) => files.createFile(path, text),

    writeRelationships: (path, relationships, expectedVersion) =>
      files.writeMappingList(path, 'relationships', relationships, expectedVersion)
  }
}
