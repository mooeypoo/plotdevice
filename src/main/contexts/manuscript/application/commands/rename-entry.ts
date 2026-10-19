import { domainError, type DomainError } from '../../../../shared-kernel/domain-error'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import {
  joinProjectPath,
  projectPathName,
  projectPathParent,
  projectPathStem,
  type ProjectPath
} from '../../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../../shared-kernel/result'
import { isMapping, readEntryText } from '../../../../shared-kernel/frontmatter-values'
import type { ManuscriptSettings } from '../../domain/manuscript-settings'
import { uniqueFileName } from '../../../../shared-kernel/unique-file-name'
import type {
  EntryRelocator,
  LinkUpdates,
  RelocateError
} from '../../../../shared-kernel/entry-relocator'
import type {
  ManuscriptRepository,
  ReadEntryTextError
} from '../../domain/ports/manuscript-repository'

/** A rename the title calls for, and what it would change. */
export interface RenamePlan {
  readonly newPath: ProjectPath
  /** `ask`: confirm with the writer first. `always`: rename without asking. */
  readonly policy: 'ask' | 'always'
  readonly linkCount: number
  readonly fileCount: number
}

/**
 * Whether an entry's file should be renamed to match its title (`settings.file_names`), and the
 * links that would change. `null` when the name already matches or renames are off.
 */
export type PlanRename = (
  path: ProjectPath
) => Promise<Result<RenamePlan | null, ReadEntryTextError>>

/** What a rename did. */
export interface Renamed {
  readonly path: ProjectPath
  readonly links: LinkUpdates
}

/** Why the file wasn't renamed. Nothing was changed. */
export type RenameError =
  ReadEntryTextError | RelocateError | DomainError<'read-only' | 'name-matches'>

/** Renames an entry's file to match its title and updates every link to it. */
export type RenameEntry = (path: ProjectPath) => Promise<Result<Renamed, RenameError>>

interface Ports {
  readonly repository: ManuscriptRepository
  readonly relocator: EntryRelocator
  readonly settings: ManuscriptSettings
}

/** Builds the `PlanRename` query. */
export function createPlanRename(ports: Ports): PlanRename {
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

/** Builds the `RenameEntry` command. */
export function createRenameEntry(ports: Ports): RenameEntry {
  return async (path) => {
    if (ports.settings.readOnly) {
      return err(domainError('read-only', 'This project is open read-only.'))
    }
    const target = await renameTarget(ports.repository, path)
    if (!target.ok) return target
    if (target.value === undefined) {
      return err(domainError('name-matches', 'The file name already matches the title.'))
    }
    const moved = await ports.relocator.relocate(path, target.value)
    return moved.ok ? ok({ path: target.value, links: moved.value }) : moved
  }
}

/**
 * The path the title calls for, in the same folder, or `undefined` if the name already matches.
 * Another file's name is never taken, so links stay unambiguous.
 */
async function renameTarget(
  repository: ManuscriptRepository,
  path: ProjectPath
): Promise<Result<ProjectPath | undefined, ReadEntryTextError>> {
  const read = await repository.readEntryFile(path)
  if (!read.ok) return read
  const keys = isMapping(read.value.frontmatter) ? read.value.frontmatter : {}
  const title = readEntryText(keys['title'])
  if (title === undefined) return ok(undefined)

  const files = await repository.load()
  const taken = new Set(
    files.linkCandidates
      .filter((candidate) => candidate.path !== path)
      .map((candidate) => nameComparisonKey(projectPathStem(candidate.path)))
  )
  const name = uniqueFileName(title, read.value.kind, taken)
  return name === projectPathName(path)
    ? ok(undefined)
    : ok(joinProjectPath(projectPathParent(path), name))
}
