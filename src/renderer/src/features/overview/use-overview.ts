import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useEditorStore } from '../../app/editor-store'
import { useInspectorStore } from '../../app/inspector-store'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import {
  filterChoices,
  NO_FILTERS,
  overviewSections,
  type OverviewFilters,
  type OverviewSection
} from './overview-sections'

/** A thread as the filter and the rows show it. */
export interface ThreadLabel {
  readonly key: string
  readonly name: string
  readonly color?: string
}

/** The Overview: the book's chapters by part, filters, and acting on a row. */
export function useOverview(): {
  readonly filters: Ref<OverviewFilters>
  readonly sections: ComputedRef<readonly OverviewSection[]>
  readonly choices: ComputedRef<ReturnType<typeof filterChoices>>
  readonly threadLabel: (key: string) => ThreadLabel
  readonly filtering: ComputedRef<boolean>
  readonly clear: () => void
  readonly open: (path: string) => Promise<void>
  readonly saveSynopsis: (path: string, synopsis: string) => Promise<boolean>
} {
  const manuscript = useManuscriptStore()
  const editor = useEditorStore()
  const inspector = useInspectorStore()
  const layout = useLayoutStore()
  const { compareText } = useChromePresentation()
  const filters = ref<OverviewFilters>(NO_FILTERS)

  const sections = computed(() =>
    manuscript.manuscript === null ? [] : overviewSections(manuscript.manuscript, filters.value)
  )
  const choices = computed(() =>
    manuscript.manuscript === null
      ? { statuses: [], povs: [], threads: [] }
      : filterChoices(manuscript.manuscript, compareText)
  )

  return {
    filters,
    sections,
    choices,
    threadLabel: (key) => {
      const known = inspector.vocabulary?.threads.find((thread) => thread.key === key)
      return known === undefined
        ? { key, name: key }
        : { key, name: known.name, ...(known.color !== undefined ? { color: known.color } : {}) }
    },
    filtering: computed(
      () =>
        filters.value.status !== null || filters.value.pov !== null || filters.value.thread !== null
    ),
    clear: () => {
      filters.value = NO_FILTERS
    },
    open: async (path) => {
      if (await editor.open(path)) layout.mainView = 'write'
    },
    saveSynopsis: (path, synopsis) => manuscript.updateSynopsis(path, synopsis)
  }
}
