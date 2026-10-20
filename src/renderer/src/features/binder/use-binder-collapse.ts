import { useWritingPreferencesStore } from '../../app/writing-preferences-store'

/** Remembers part expansion by project and path, even when the binder is unmounted. */
export function useBinderCollapse(projectRoot: () => string): {
  isExpanded(path: string): boolean
  setExpanded(path: string, expanded: boolean): void
} {
  const preferences = useWritingPreferencesStore()
  return {
    isExpanded: (path) => !preferences.isPartCollapsed(projectRoot(), path),
    setExpanded: (path, expanded) => {
      preferences.setPartCollapsed(projectRoot(), path, !expanded)
    }
  }
}
