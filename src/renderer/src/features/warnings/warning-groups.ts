import type {
  FileProblemDto,
  ManuscriptDto,
  WarningDto,
  WarningFixDto
} from '../../../../contract/dtos'
import { describeFileProblem } from '../welcome/describe-file-problem'
import type { MessageKey, Translator } from '../../../../i18n/translator'
import { formatManuscriptWarning, formatProjectWarning } from './format-warning'

/** One thing in the warnings panel. `path` is the file it's about, if there is one. */
export interface WarningItem {
  readonly key: string
  readonly message: string
  readonly path?: string
  /** A one-click fix for the file at `path`. */
  readonly fix?: WarningFixDto
}

/** Warnings of one kind, under a heading. */
export interface WarningGroup {
  readonly id: GroupId
  readonly heading: string
  readonly items: readonly WarningItem[]
}

type GroupId = 'unreadable' | 'names' | 'links' | 'values' | 'order' | 'types' | 'project'

const HEADINGS = {
  unreadable: 'warnings-group-unreadable',
  names: 'warnings-group-names',
  links: 'warnings-group-links',
  values: 'warnings-group-values',
  order: 'warnings-group-order',
  types: 'warnings-group-types',
  project: 'warnings-group-project'
} as const satisfies Readonly<Record<GroupId, MessageKey>>

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
  manuscript: ManuscriptDto | null,
  t: Translator['t']
): WarningGroup[] {
  const groups = new Map<GroupId, WarningItem[]>(
    (Object.keys(HEADINGS) as GroupId[]).map((id) => [id, []])
  )
  const occurrences = new Map<string, number>()
  const identity = (source: unknown): string => {
    const base = JSON.stringify(source)
    const occurrence = occurrences.get(base) ?? 0
    occurrences.set(base, occurrence + 1)
    return `${base}:${String(occurrence)}`
  }
  for (const problem of problems) {
    groups.get(PROBLEM_GROUPS[problem.problem])?.push({
      key: identity(problem),
      message: describeFileProblem(problem, t),
      path: problem.path
    })
  }
  for (const warning of projectWarnings) {
    groups
      .get('project')
      ?.push({ key: identity(warning), message: formatProjectWarning(warning, t) })
  }
  for (const warning of manuscript?.warnings ?? []) {
    const path = warning.paths[0]
    groups.get(manuscriptGroup(warning.code))?.push({
      key: identity(warning),
      message: formatManuscriptWarning(warning, t),
      ...(path !== undefined ? { path } : {}),
      ...(path !== undefined && warning.fix !== undefined ? { fix: warning.fix } : {})
    })
  }
  return [...groups]
    .filter(([, items]) => items.length > 0)
    .map(([id, items]) => ({ id, heading: t(HEADINGS[id]), items }))
}

/** How many things need attention, as the binder's footer counts them. */
export function countWarnings(groups: readonly WarningGroup[]): number {
  return groups.reduce((total, group) => total + group.items.length, 0)
}
