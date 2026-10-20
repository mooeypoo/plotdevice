import { domainError } from '../../../../shared-kernel/domain-error'
import type { LinkCandidate } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { readChapter, type Chapter } from '../chapter'
import type { EntrySource } from '../entry-warnings'
import { readPart, type Part } from '../part'
import { rewriteWikiLinks } from '../../../../shared-kernel/link-rewriter'
import type { PropertyWrite } from '../property-changes'
import type { LinkRewrite } from '../warning-fixes'
import type {
  CreateFileError,
  EntryFile,
  EntryText,
  ManuscriptFiles,
  ManuscriptRepository,
  ReadEntryTextError,
  WriteEntryTextError,
  WritePropertiesError
} from './manuscript-repository'

interface FakeFile {
  frontmatter: Record<string, unknown>
  text: string
  version: string
}

/**
 * An in-memory `ManuscriptRepository` for application tests. Each file is frontmatter values plus
 * body text; versions count writes. Parts and chapters are derived from the files' `type`.
 */
export class InMemoryManuscript implements ManuscriptRepository {
  readonly files = new Map<string, FakeFile>()
  novel: Record<string, unknown> = {}
  /** Extra link candidates that aren't parts or chapters (characters, locations). */
  otherCandidates: LinkCandidate[] = []
  private writes = 0

  /** Adds or replaces a file, returning its version. */
  put(path: string, frontmatter: Record<string, unknown>, text = ''): string {
    const version = this.nextVersion()
    this.files.set(path, { frontmatter, text, version })
    return version
  }

  /** Simulates another program editing the file's body. */
  editOutside(path: ProjectPath, text: string): void {
    const file = this.files.get(path)
    if (file !== undefined) this.files.set(path, { ...file, text, version: this.nextVersion() })
  }

  get(path: string): FakeFile | undefined {
    return this.files.get(path)
  }

  load(): Promise<ManuscriptFiles> {
    const parts: Part[] = []
    const chapters: Chapter[] = []
    const linkCandidates: LinkCandidate[] = [...this.otherCandidates]
    const sources: EntrySource[] = []
    for (const [path, file] of this.files) {
      const type = file.frontmatter['type']
      if (type === 'part') parts.push(readPart(path as ProjectPath, file.frontmatter, file.text))
      if (type === 'chapter')
        chapters.push(readChapter(path as ProjectPath, file.frontmatter, file.text))
      if (type === 'part' || type === 'chapter') {
        linkCandidates.push({ path: path as ProjectPath, type })
        sources.push({ path: path as ProjectPath, frontmatter: file.frontmatter, body: file.text })
      }
    }
    return Promise.resolve({ parts, chapters, linkCandidates, sources })
  }

  readText(path: ProjectPath): Promise<Result<EntryText, ReadEntryTextError>> {
    const file = this.files.get(path)
    if (file === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    return Promise.resolve(ok({ path, text: file.text, version: file.version }))
  }

  writeText(
    path: ProjectPath,
    text: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WriteEntryTextError>> {
    const file = this.files.get(path)
    if (file === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    if (expectedVersion !== undefined && file.version !== expectedVersion) {
      return Promise.resolve(err(domainError('changed-on-disk', 'Changed outside the app.')))
    }
    if (file.text === text) return Promise.resolve(ok({ version: file.version }))
    const version = this.nextVersion()
    this.files.set(path, { ...file, text, version })
    return Promise.resolve(ok({ version }))
  }

  readEntryFile(path: ProjectPath): Promise<Result<EntryFile, ReadEntryTextError>> {
    const file = this.files.get(path)
    const type = file?.frontmatter['type']
    if (file === undefined || (type !== 'part' && type !== 'chapter')) {
      return Promise.resolve(err(domainError('not-found', 'No such part or chapter.')))
    }
    return Promise.resolve(
      ok({ path, kind: type, frontmatter: file.frontmatter, version: file.version })
    )
  }

  writeProperties(
    path: ProjectPath,
    writes: readonly PropertyWrite[],
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WritePropertiesError>> {
    const file = this.files.get(path)
    if (file === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    if (expectedVersion !== undefined && file.version !== expectedVersion) {
      return Promise.resolve(err(domainError('changed-on-disk', 'Changed outside the app.')))
    }
    const version = this.nextVersion()
    this.files.set(path, { ...file, frontmatter: applyWrites(file.frontmatter, writes), version })
    return Promise.resolve(ok({ version }))
  }

  createFile(
    path: ProjectPath,
    text: string
  ): Promise<Result<{ version: string }, CreateFileError>> {
    if (this.files.has(path)) {
      return Promise.resolve(err(domainError('already-exists', 'That file exists.')))
    }
    const frontmatter = parseSimpleFrontmatter(text)
    return Promise.resolve(ok({ version: this.put(path, frontmatter, '') }))
  }

  /** Rewrites wikilinks in the fake file's body and in string frontmatter values. */
  rewriteLinks(
    path: ProjectPath,
    decide: LinkRewrite,
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string; count: number }, WritePropertiesError>> {
    const file = this.files.get(path)
    if (file === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    if (expectedVersion !== undefined && file.version !== expectedVersion) {
      return Promise.resolve(err(domainError('changed-on-disk', 'Changed outside the app.')))
    }
    let count = 0
    const rewrite = (text: string, key: string | undefined): string => {
      const result = rewriteWikiLinks(text, (link) => decide(link, key), { skipCode: true })
      count += result.count
      return result.text
    }
    const frontmatter = Object.fromEntries(
      Object.entries(file.frontmatter).map(([key, value]) => [
        key,
        typeof value === 'string' ? rewrite(value, key) : value
      ])
    )
    const text = rewrite(file.text, undefined)
    const version = count === 0 ? file.version : this.nextVersion()
    this.files.set(path, { frontmatter, text, version })
    return Promise.resolve(ok({ version, count }))
  }

  readNovelFrontmatter(): Promise<unknown> {
    return Promise.resolve(this.novel)
  }

  writeNovelProperties(
    writes: readonly PropertyWrite[]
  ): Promise<Result<void, WritePropertiesError>> {
    this.novel = applyWrites(this.novel, writes)
    return Promise.resolve(ok(undefined))
  }

  private nextVersion(): string {
    this.writes += 1
    return `v${String(this.writes)}`
  }
}

function applyWrites(
  frontmatter: Record<string, unknown>,
  writes: readonly PropertyWrite[]
): Record<string, unknown> {
  const result = { ...frontmatter }
  for (const write of writes) {
    if (write.value === undefined) Reflect.deleteProperty(result, write.key)
    else result[write.key] = typeof write.value === 'object' ? [...write.value] : write.value
  }
  return result
}

/** Reads the `key: value` lines the app writes into new files (JSON-quoted strings, numbers). */
function parseSimpleFrontmatter(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const line of text.split('\n')) {
    const match = /^([a-z_]+): (.+)$/u.exec(line)
    if (match?.[1] === undefined || match[2] === undefined) continue
    const raw = match[2]
    result[match[1]] = raw.startsWith('"')
      ? (JSON.parse(raw) as unknown)
      : /^\d+$/u.test(raw)
        ? Number(raw)
        : raw
  }
  return result
}
