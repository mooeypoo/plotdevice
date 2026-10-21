import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import type {
  EntryRelocator,
  LinkUpdates,
  RelocateError
} from '../../../../shared-kernel/entry-relocator'
import { isMapping, readEntryText } from '../../../../shared-kernel/frontmatter-values'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import {
  joinProjectPath,
  projectPathName,
  projectPathParent,
  projectPathStem,
  type ProjectPath
} from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { uniqueFileName } from '../../../../shared-kernel/unique-file-name'
import type { CodexSettings } from '../../domain/codex-settings'
import type { CodexRepository, ReadCodexError } from '../../domain/ports/codex-repository'

/** A rename the title calls for, and how many links it would change. */
export interface CodexRenamePlan {
  readonly newPath: ProjectPath
  readonly policy: 'ask' | 'always'
  readonly linkCount: number
  readonly fileCount: number
}

/** Whether a codex entry's file should be renamed to match its title; `null` when not. */
export type PlanCodexRename = (
  path: ProjectPath
) => Promise<Result<CodexRenamePlan | null, ReadCodexError>>

/** Renames a codex entry's file to match its title and updates every link to it. */
export type RenameCodexEntry = (
  path: ProjectPath
) => Promise<
  Result<
    { readonly path: ProjectPath; readonly links: LinkUpdates },
    ReadCodexError | RelocateError | DomainError<'read-only' | 'name-matches'>
  >
>

interface Ports {
  readonly repository: CodexRepository
  readonly relocator: EntryRelocator
  readonly settings: CodexSettings
}

/** Builds the `PlanCodexRename` query. */
export function createPlanCodexRename(ports: Ports): PlanCodexRename {
  return async (path) => {
    if (ports.settings.readOnly || ports.settings.fileNames === 'never') return ok(null)
    const target = await renameTarget(ports.repository, path)
    if (!target.ok) return target
    if (target.value === undefined) return ok(null)
    const updates = await ports.relocator.preview(path, target.value)
    return ok({
      newPath: target.value,
      policy: ports.settings.fileNames,
      linkCount: updates.linkCount,
      fileCount: updates.changedFiles.length
    })
  }
}

/** Builds the `RenameCodexEntry` command. */
export function createRenameCodexEntry(ports: Ports): RenameCodexEntry {
  return async (path) => {
    if (ports.settings.readOnly) {
      return err(
        domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
      )
    }
    const target = await renameTarget(ports.repository, path)
    if (!target.ok) return target
    if (target.value === undefined) {
      return err(
        domainError('name-matches', 'The file name already matches the title.', {
          reason: 'name-matches'
        })
      )
    }
    const moved = await ports.relocator.relocate(path, target.value)
    return moved.ok ? ok({ path: target.value, links: moved.value }) : moved
  }
}

/** The path the title calls for, in the same folder, or `undefined` if the name already matches. */
async function renameTarget(
  repository: CodexRepository,
  path: ProjectPath
): Promise<Result<ProjectPath | undefined, ReadCodexError>> {
  const read = await repository.readEntryFile(path)
  if (!read.ok) return read
  const keys = isMapping(read.value.frontmatter) ? read.value.frontmatter : {}
  const title = readEntryText(keys['title'])
  if (title === undefined) return ok(undefined)
  const files = await repository.load()
  const taken = new Set(
    [...files.linkCandidates, ...files.untyped]
      .filter((file) => file.path !== path)
      .map((file) => nameComparisonKey(projectPathStem(file.path)))
  )
  const name = uniqueFileName(title, read.value.kind, taken)
  return name === projectPathName(path)
    ? ok(undefined)
    : ok(joinProjectPath(projectPathParent(path), name))
}
