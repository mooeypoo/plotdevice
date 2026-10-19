import { domainError } from '../../../../shared-kernel/domain-error'
import type { LinkCandidate } from '../../../../shared-kernel/link-index'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type { Chapter } from '../chapter'
import type { Part } from '../part'
import type {
  EntryText,
  ManuscriptFiles,
  ManuscriptRepository,
  ReadEntryTextError,
  WriteEntryTextError
} from './manuscript-repository'

/** An in-memory `ManuscriptRepository` for application tests. Versions count writes. */
export class InMemoryManuscript implements ManuscriptRepository {
  parts: Part[] = []
  chapters: Chapter[] = []
  linkCandidates: LinkCandidate[] = []
  readonly texts = new Map<string, { text: string; version: string }>()
  private writes = 0

  setText(path: ProjectPath, text: string): string {
    this.writes += 1
    const version = `v${String(this.writes)}`
    this.texts.set(path, { text, version })
    return version
  }

  /** Simulates another program editing the file. */
  editOutside(path: ProjectPath, text: string): void {
    this.setText(path, text)
  }

  load(): Promise<ManuscriptFiles> {
    return Promise.resolve({
      parts: this.parts,
      chapters: this.chapters,
      linkCandidates: this.linkCandidates
    })
  }

  readText(path: ProjectPath): Promise<Result<EntryText, ReadEntryTextError>> {
    const entry = this.texts.get(path)
    if (entry === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    return Promise.resolve(ok({ path, text: entry.text, version: entry.version }))
  }

  writeText(
    path: ProjectPath,
    text: string,
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WriteEntryTextError>> {
    const entry = this.texts.get(path)
    if (entry === undefined) return Promise.resolve(err(domainError('not-found', 'No such file.')))
    if (expectedVersion !== undefined && entry.version !== expectedVersion) {
      return Promise.resolve(err(domainError('changed-on-disk', 'Changed outside the app.')))
    }
    return Promise.resolve(ok({ version: this.setText(path, text) }))
  }
}
