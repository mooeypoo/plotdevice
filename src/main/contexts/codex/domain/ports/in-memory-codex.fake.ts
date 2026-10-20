import { domainError } from '../../../../shared-kernel/domain-error'
import { ENTRY_TYPES, type EntryType } from '../../../../shared-kernel/entry-type'
import type { LinkCandidate } from '../../../../shared-kernel/link-index'
import { projectPathStem, type ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { CodexWrite } from '../codex-changes'
import { CODEX_KINDS, readCodexEntry, type CodexEntry, type CodexKind } from '../codex-entry'
import type { CodexSource, RelationshipFields } from '../relationships'
import type { OutlineFile } from '../outline-file'
import type { UntypedFile } from '../untyped-file'
import type {
  CodexEntryFile,
  CodexFiles,
  CodexRepository,
  CreateCodexFileError,
  ReadCodexError,
  WriteCodexPropertiesError,
  WriteCodexTextError
} from './codex-repository'

interface FakeFile {
  frontmatter: Record<string, unknown>
  text: string
  version: string
}

const isCodexKind = (value: unknown): value is CodexKind => CODEX_KINDS.includes(value as CodexKind)
const isEntryType = (value: unknown): value is EntryType => ENTRY_TYPES.includes(value as EntryType)

/** An in-memory `CodexRepository` for application tests; versions count writes. */
export class InMemoryCodex implements CodexRepository {
  readonly files = new Map<string, FakeFile>()
  private writes = 0

  put(path: string, frontmatter: Record<string, unknown>, text = ''): string {
    const version = this.nextVersion()
    this.files.set(path, { frontmatter, text, version })
    return version
  }

  get(path: string): FakeFile | undefined {
    return this.files.get(path)
  }

  load(): Promise<CodexFiles> {
    const entries: CodexEntry[] = []
    const untyped: UntypedFile[] = []
    const linkCandidates: LinkCandidate[] = []
    const sources: CodexSource[] = []
    const outlines: OutlineFile[] = []
    for (const [key, file] of this.files) {
      const path = key as ProjectPath
      const type = file.frontmatter['type']
      if (type === 'outline') {
        const title = file.frontmatter['title']
        outlines.push({ path, title: typeof title === 'string' ? title : projectPathStem(path) })
      }
      if (isCodexKind(type)) {
        const entry = readCodexEntry(path, type, file.frontmatter)
        entries.push(entry)
        sources.push({ path, title: entry.title, frontmatter: file.frontmatter })
      }
      if (isEntryType(type)) linkCandidates.push({ path, type })
      else untyped.push(typeof type === 'string' ? { path, rawType: type } : { path })
    }
    return Promise.resolve({ entries, untyped, linkCandidates, sources, outlines })
  }

  readText(path: ProjectPath): Promise<Result<{ text: string; version: string }, ReadCodexError>> {
    const file = this.files.get(path)
    return Promise.resolve(
      file === undefined
        ? err(domainError('not-found', 'No such file.'))
        : ok({ text: file.text, version: file.version })
    )
  }

  writeText(
    path: ProjectPath,
    text: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WriteCodexTextError>> {
    const file = this.files.get(path)
    if (file === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    if (expectedVersion !== undefined && expectedVersion !== file.version) {
      return Promise.resolve(err(domainError('changed-on-disk', 'Changed outside the app.')))
    }
    if (file.text === text) return Promise.resolve(ok({ version: file.version }))
    const version = this.nextVersion()
    this.files.set(path, { ...file, text, version })
    return Promise.resolve(ok({ version }))
  }

  /** Raw texts for `readFileText`, as a template file would be on disk. */
  readonly rawTexts = new Map<string, string>()

  readFileText(path: ProjectPath): Promise<string | undefined> {
    return Promise.resolve(this.rawTexts.get(path) ?? this.files.get(path)?.text)
  }

  readEntryFile(path: ProjectPath): Promise<Result<CodexEntryFile, ReadCodexError>> {
    const file = this.files.get(path)
    const type = file?.frontmatter['type']
    if (file === undefined || !isCodexKind(type)) {
      return Promise.resolve(err(domainError('not-found', 'No such codex entry.')))
    }
    return Promise.resolve(
      ok({ path, kind: type, frontmatter: file.frontmatter, version: file.version })
    )
  }

  writeProperties(
    path: ProjectPath,
    writes: readonly CodexWrite[],
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WriteCodexPropertiesError>> {
    const file = this.files.get(path)
    if (file === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    if (expectedVersion !== undefined && expectedVersion !== file.version) {
      return Promise.resolve(err(domainError('changed-on-disk', 'Changed outside the app.')))
    }
    const frontmatter = { ...file.frontmatter }
    for (const write of writes) {
      if (write.value === undefined) Reflect.deleteProperty(frontmatter, write.key)
      else frontmatter[write.key] = write.value
    }
    const version = this.nextVersion()
    this.files.set(path, { ...file, frontmatter, version })
    return Promise.resolve(ok({ version }))
  }

  createFile(
    path: ProjectPath,
    text: string
  ): Promise<Result<{ version: string }, CreateCodexFileError>> {
    if (this.files.has(path)) {
      return Promise.resolve(err(domainError('already-exists', 'That file exists.')))
    }
    const [, head = '', body = text] = /^---\n([\s\S]*?)---\n([\s\S]*)$/u.exec(text) ?? []
    const frontmatter: Record<string, unknown> = {}
    for (const line of head.split('\n')) {
      const match = /^([a-z_]+): (.+)$/u.exec(line)
      if (match?.[1] !== undefined && match[2] !== undefined) {
        frontmatter[match[1]] = match[2].startsWith('"')
          ? (JSON.parse(match[2]) as unknown)
          : match[2]
      }
    }
    return Promise.resolve(ok({ version: this.put(path, frontmatter, body) }))
  }

  async writeRelationships(
    path: ProjectPath,
    relationships: readonly RelationshipFields[],
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WriteCodexPropertiesError>> {
    const written = await this.writeProperties(path, [], expectedVersion)
    const file = this.files.get(path)
    if (written.ok && file !== undefined) {
      if (relationships.length === 0) Reflect.deleteProperty(file.frontmatter, 'relationships')
      else file.frontmatter['relationships'] = relationships.map((item) => Object.fromEntries(item))
    }
    return written
  }

  private nextVersion(): string {
    this.writes += 1
    return `v${String(this.writes)}`
  }
}
