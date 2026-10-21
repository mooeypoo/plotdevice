import { domainError } from '../../../../shared-kernel/domain-error'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import { projectPathStem, type ProjectPath } from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import type {
  EntryRelocator,
  LinkUpdates,
  RelocateError
} from '../../../../shared-kernel/entry-relocator'
import type { InMemoryManuscript } from './in-memory-manuscript.fake'

/**
 * An `EntryRelocator` over an `InMemoryManuscript`. It moves the fake file and rewrites
 * frontmatter values that are exactly `[[old name]]`, which is enough for application tests.
 */
export class InMemoryRelocator implements EntryRelocator {
  readonly moves: { from: ProjectPath; to: ProjectPath }[] = []

  constructor(private readonly manuscript: InMemoryManuscript) {}

  preview(from: ProjectPath, to: ProjectPath): Promise<LinkUpdates> {
    return Promise.resolve(this.linkUpdates(from, to, false))
  }

  relocate(from: ProjectPath, to: ProjectPath): Promise<Result<LinkUpdates, RelocateError>> {
    const file = this.manuscript.files.get(from)
    if (file === undefined)
      return Promise.resolve(
        err(domainError('move-failed', 'Gone.', { reason: 'file-move-failed', path: from }))
      )
    const clash = [...this.manuscript.files.keys()].some(
      (path) => path !== from && nameComparisonKey(path) === nameComparisonKey(to)
    )
    if (clash)
      return Promise.resolve(
        err(domainError('already-exists', 'That file exists.', { reason: 'file-exists', path: to }))
      )
    this.manuscript.files.delete(from)
    this.manuscript.files.set(to, file)
    this.moves.push({ from, to })
    return Promise.resolve(ok(this.linkUpdates(from, to, true)))
  }

  private linkUpdates(from: ProjectPath, to: ProjectPath, apply: boolean): LinkUpdates {
    const oldLink = `[[${projectPathStem(from)}]]`
    const newLink = `[[${projectPathStem(to)}]]`
    const changedFiles: ProjectPath[] = []
    let linkCount = 0
    if (oldLink === newLink) return { changedFiles, linkCount, skipped: [] }
    for (const [path, file] of this.manuscript.files) {
      const keys = Object.entries(file.frontmatter).filter(([, value]) => value === oldLink)
      if (keys.length === 0) continue
      changedFiles.push(path as ProjectPath)
      linkCount += keys.length
      if (apply) for (const [key] of keys) file.frontmatter[key] = newLink
    }
    return { changedFiles, linkCount, skipped: [] }
  }
}
