import type { FileProblemDto, ManuscriptDto, WarningDto } from '../../../../contract/dtos'
import { describeFileProblem } from '../welcome/describe-file-problem'

/** One thing in the warnings panel. `path` is the file it's about, if there is one. */
export interface WarningItem {
  readonly key: string
  readonly message: string
  readonly path?: string
}

/** Warnings of one kind, under a heading. */
export interface WarningGroup {
  readonly heading: string
  readonly items: readonly WarningItem[]
}

type GroupId = 'unreadable' | 'names' | 'links' | 'values' | 'order' | 'types' | 'project'

const HEADINGS: Readonly<Record<GroupId, string>> = {
  unreadable: 'Files left untouched',
  names: 'Names that break links',
  links: 'Links that could mean two files',
  values: 'Values the app can’t use',
  order: 'Order',
  types: 'Unknown types',
  project: 'Project'
}

const PROBLEM_GROUPS: Readonly<Record<FileProblemDto['problem'], GroupId>> = {
  'unreadable-file': 'unreadable',
  'invalid-encoding': 'unreadable',
  'unclosed-frontmatter': 'unreadable',
  'unparseable-frontmatter': 'unreadable',
  'name-breaks-links': 'names',
  'unknown-type': 'types',
  'nested-project': 'project'
}

function manuscriptGroup(code: string): GroupId {
  if (code === 'ambiguous-link') return 'links'
  if (code === 'unusable-value') return 'values'
  return 'order'
}

/**
 * Everything that needs the writer's attention, grouped by kind in the order they matter most:
 * files the app won't touch first, then things that break links, then the rest.
 */
export function groupWarnings(
  problems: readonly FileProblemDto[],
  projectWarnings: readonly WarningDto[],
  manuscript: ManuscriptDto | null
): WarningGroup[] {
  const groups = new Map<GroupId, WarningItem[]>(
    (Object.keys(HEADINGS) as GroupId[]).map((id) => [id, []])
  )
  for (const problem of problems) {
    groups.get(PROBLEM_GROUPS[problem.problem])?.push({
      key: `${problem.problem}:${problem.path}`,
      message: describeFileProblem(problem),
      path: problem.path
    })
  }
  for (const warning of projectWarnings) {
    groups
      .get('project')
      ?.push({ key: `${warning.code}:${warning.message}`, message: warning.message })
  }
  for (const warning of manuscript?.warnings ?? []) {
    const path = warning.paths[0]
    groups.get(manuscriptGroup(warning.code))?.push({
      key: `${warning.code}:${warning.message}`,
      message: warning.message,
      ...(path !== undefined ? { path } : {})
    })
  }
  return [...groups]
    .filter(([, items]) => items.length > 0)
    .map(([id, items]) => ({ heading: HEADINGS[id], items }))
}

/** How many things need attention, as the binder's footer counts them. */
export function countWarnings(groups: readonly WarningGroup[]): number {
  return groups.reduce((total, group) => total + group.items.length, 0)
}
