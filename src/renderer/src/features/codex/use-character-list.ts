import { computed, ref, type ComputedRef } from 'vue'
import type { CodexEntryDto } from '../../../../contract/dtos'
import { useWritingPreferencesStore } from '../../app/writing-preferences-store'
import { nameKey } from '../../shared/link-choices'
import { characterGroupNames, characterSections, visibleCharacters } from './character-list'

/** Character navigation and per-project display choices, independent of membership edits. */
export function useCharacterList(
  entries: ComputedRef<readonly CodexEntryDto[]>,
  root: ComputedRef<string>
) {
  const preferences = useWritingPreferencesStore()
  const search = ref('')
  const view = computed(() => preferences.characterView(root.value))
  const names = computed(() =>
    characterGroupNames(
      entries.value
        .filter((entry) => entry.kind === 'character')
        .flatMap((entry) => entry.groups ?? [])
    )
  )
  // Removed groups must not leave the list invisibly filtered.
  const filters = computed(() =>
    view.value.filters.filter((filter) =>
      names.value.some((name) => nameKey(name) === nameKey(filter))
    )
  )
  const visible = computed(() => visibleCharacters(entries.value, search.value, filters.value))
  const sections = computed(() =>
    characterSections(
      visible.value,
      filters.value.length === 0
        ? names.value
        : names.value.filter((name) =>
            filters.value.some((filter) => nameKey(filter) === nameKey(name))
          )
    )
  )
  const groupKey = (name: string | null): string =>
    name === null ? 'ungrouped' : `group:${nameKey(name)}`
  const collapsed = (name: string | null): boolean =>
    search.value.trim() === '' && view.value.collapsed.includes(groupKey(name))
  function toggleCollapsed(name: string | null): void {
    const key = groupKey(name)
    const next = view.value.collapsed.filter((existing) => existing !== key)
    if (!collapsed(name)) next.push(key)
    preferences.setCharacterView(root.value, { ...view.value, collapsed: next })
  }
  function toggleFilter(name: string): void {
    const selected = filters.value.some((existing) => nameKey(existing) === nameKey(name))
    const next = filters.value.filter((existing) => nameKey(existing) !== nameKey(name))
    if (!selected) next.push(name)
    preferences.setCharacterView(root.value, { ...view.value, filters: next })
  }
  const mode = computed({
    get: () => view.value.mode,
    set: (mode: 'all' | 'grouped') => {
      preferences.setCharacterView(root.value, { ...view.value, mode })
    }
  })
  function clearFilters(): void {
    preferences.setCharacterView(root.value, { ...view.value, filters: [] })
  }
  return {
    search,
    names,
    filters,
    visible,
    sections,
    mode,
    collapsed,
    toggleCollapsed,
    toggleFilter,
    clearFilters
  }
}
