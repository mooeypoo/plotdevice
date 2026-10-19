import { domainError } from '../../../shared-kernel/domain-error'
import { isMapping } from '../../../shared-kernel/frontmatter-values'
import type { LinkCandidate } from '../../../shared-kernel/link-index'
import { err, ok } from '../../../shared-kernel/result'
import { createEntryFiles } from '../../../infrastructure/markdown/entry-files'
import { scanProject } from '../../../infrastructure/project-scan/scan-project'
import { CODEX_KINDS, readCodexEntry, type CodexEntry, type CodexKind } from '../domain/codex-entry'
import type { CodexRepository } from '../domain/ports/codex-repository'
import type { UntypedFile } from '../domain/untyped-file'

const isCodexKind = (value: unknown): value is CodexKind => CODEX_KINDS.includes(value as CodexKind)

/** The characters, locations, and notes of the project at `rootOsPath`, as markdown files. */
export function createMarkdownCodexRepository(rootOsPath: string): CodexRepository {
  const files = createEntryFiles(rootOsPath)

  return {
    async load() {
      const scan = await scanProject(rootOsPath)
      const entries: CodexEntry[] = []
      const untyped: UntypedFile[] = []
      const linkCandidates: LinkCandidate[] = []
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
        if (!isCodexKind(classification.type)) continue
        const read = await files.readFrontmatter(file.path)
        if (read.ok)
          entries.push(readCodexEntry(file.path, classification.type, read.value.frontmatter))
      }
      return { entries, untyped, linkCandidates }
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

    createFile: (path, text) => files.createFile(path, text)
  }
}
