import type {
  ApiError,
  EntryCountsDto,
  FileProblemDto,
  ProjectSummaryDto
} from '../../contract/dtos'
import type { DomainError } from '../shared-kernel/domain-error'
import { breaksLinks } from '../shared-kernel/file-name'
import { projectPathStem } from '../shared-kernel/project-path'
import type { OpenedProject } from '../contexts/workspace/application/commands/open-project'

/** Maps an opened project to what the renderer shows: counts by type, plus files with problems. */
export function toProjectSummaryDto(opened: OpenedProject): ProjectSummaryDto {
  const counts: Record<keyof EntryCountsDto, number> = {
    part: 0,
    chapter: 0,
    character: 0,
    location: 0,
    note: 0,
    outline: 0,
    scene: 0,
    untyped: 0
  }
  const problems: FileProblemDto[] = []

  for (const file of opened.scan.files) {
    const { classification } = file
    if (classification.kind === 'typed') counts[classification.type] += 1
    else counts.untyped += 1

    if (file.problem !== undefined) {
      problems.push({ path: file.path, problem: file.problem })
    } else if (classification.kind === 'untyped' && classification.rawType !== undefined) {
      problems.push({ path: file.path, problem: 'unknown-type', detail: classification.rawType })
    }
    if (breaksLinks(projectPathStem(file.path))) {
      problems.push({ path: file.path, problem: 'name-breaks-links' })
    }
  }
  for (const path of opened.scan.nestedProjects) {
    problems.push({ path, problem: 'nested-project' })
  }

  const { project } = opened
  return {
    root: project.root,
    title: project.title,
    ...(project.author !== undefined ? { author: project.author } : {}),
    formatVersion: project.formatVersion,
    readOnly: project.readOnly,
    warnings: project.warnings.map((warning) => ({ ...warning })),
    counts,
    problems
  }
}

/** Maps any use-case error to the plain shape that crosses IPC. */
export function toApiError(error: {
  readonly code: string
  readonly message: string
  readonly diagnostic?: DomainError['diagnostic']
  readonly projectAbove?: string
  readonly projectBelow?: string
}): ApiError {
  return {
    code: error.code,
    message: error.message,
    ...(error.diagnostic === undefined ? {} : { diagnostic: error.diagnostic }),
    ...(error.projectAbove !== undefined ? { projectAbove: error.projectAbove } : {}),
    ...(error.projectBelow !== undefined ? { projectBelow: error.projectBelow } : {})
  }
}
