import { computed, type ComputedRef } from 'vue'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useWorkspaceStore } from '../../app/workspace-store'
import { countWarnings, groupWarnings, type WarningGroup } from './warning-groups'

/** The open project's warnings, grouped, kept current as files change. */
export function useWarnings(): {
  readonly groups: ComputedRef<WarningGroup[]>
  readonly count: ComputedRef<number>
} {
  const workspace = useWorkspaceStore()
  const manuscript = useManuscriptStore()
  const groups = computed(() =>
    groupWarnings(
      workspace.project?.problems ?? [],
      workspace.project?.warnings ?? [],
      manuscript.manuscript
    )
  )
  return { groups, count: computed(() => countWarnings(groups.value)) }
}
