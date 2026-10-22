import { domainError } from '../../../../shared-kernel/domain-error'
import { projectPathStem, type ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type {
  CreateOutlineFileError,
  OutlineFiles,
  OutlineRepository,
  ReadOutlineError,
  WriteOutlineTextError
} from './outline-repository'

interface FakeFile {
  frontmatter: Record<string, unknown>
  text: string
  version: string
}

/** An in-memory `OutlineRepository` for application tests; versions count writes. */
export class InMemoryOutlines implements OutlineRepository {
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

  load(): Promise<OutlineFiles> {
    const entries = [...this.files].map(([key, file]) => [key as ProjectPath, file] as const)
    const outlines = entries.flatMap(([path, { frontmatter }]) => {
      if (frontmatter['type'] !== 'outline') return []
      const title = frontmatter['title']
      return [{ path, title: typeof title === 'string' ? title : projectPathStem(path) }]
    })
    return Promise.resolve({ outlines, taken: entries.map(([path]) => path) })
  }

  readText(
    path: ProjectPath
  ): Promise<Result<{ text: string; version: string }, ReadOutlineError>> {
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
  ): Promise<Result<{ version: string }, WriteOutlineTextError>> {
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

  /** The fake keeps bodies as written, so the raw body is the text. */
  readBody(
    path: ProjectPath
  ): Promise<Result<{ text: string; version: string }, ReadOutlineError>> {
    return this.readText(path)
  }

  writeBody(
    path: ProjectPath,
    body: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WriteOutlineTextError>> {
    return this.writeText(path, body, expectedVersion)
  }

  /** Reads back only `type` and a JSON-quoted `title`, which is all `newOutlineText` writes. */
  createFile(
    path: ProjectPath,
    text: string
  ): Promise<Result<{ version: string }, CreateOutlineFileError>> {
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

  private nextVersion(): string {
    this.writes += 1
    return `v${String(this.writes)}`
  }
}
