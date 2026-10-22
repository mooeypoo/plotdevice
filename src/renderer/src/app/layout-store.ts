import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { findView } from '../workbench/model/layout'
import { selectSection, setAreaCollapsed, setCenterView } from '../workbench/model/operations'
import type { ViewId } from '../workbench/model/view-catalog'
import type { AreaRegion } from '../workbench/model/vocabulary'
import { registerDocumentPresenter } from './document-presenter'
import { useOutlineStore } from './outline-store'
import { useWorkbenchStore } from './workbench-store'

/** The side panel's tabs. */
export type SideTab = 'manuscript' | 'codex'

/** The main area's views; the board only in Plotting mode. */
export type MainView = 'write' | 'overview' | 'timeline' | 'interactions' | 'plot-board'

/** The right-hand panel's tabs. */
export type RightTab = 'properties' | 'outline' | 'reference'

const LAST_ENTRY_KEY = 'plotdevice.lastEntry'

const SIDE_VIEWS: Readonly<Record<SideTab, ViewId>> = { manuscript: 'binder', codex: 'codex' }
const RIGHT_VIEWS: Readonly<Record<RightTab, ViewId>> = {
  properties: 'properties',
  outline: 'outline',
  reference: 'reference'
}

/**
 * The fixed panels' view of the workbench: whether the binder and inspector sides are open and
 * which tab each shows. They are read from and written to the workbench layout (ADR 0017), so the
 * classic shell and the workbench share one arrangement. Main view and focus mode are session state.
 */
export const useLayoutStore = defineStore('layout', () => {
  const workbench = useWorkbenchStore()
  const focusMode = ref(false)
  /** What the main area shows: the editor, or a view of the whole book; the layout's center stage. */
  const mainView = computed<MainView>({
    get: () => {
      const view = workbench.layout.center.view
      return view === 'overview' ||
        view === 'timeline' ||
        view === 'interactions' ||
        view === 'plot-board'
        ? view
        : 'write'
    },
    set: (view) => {
      workbench.apply((layout) => setCenterView(layout, view === 'write' ? 'document' : view))
    }
  })

  /** The area holding `view`, which the fixed panels call a side. */
  const sideOf = (view: ViewId): AreaRegion | undefined => findView(workbench.layout, view)?.region

  /** Whether the side holding `view` is open; setting it opens or collapses that side. */
  function sideOpen(view: ViewId) {
    return computed({
      get: () => {
        const region = sideOf(view)
        return region !== undefined && !workbench.layout[region].collapsed
      },
      set: (open: boolean) => {
        const region = sideOf(view)
        if (region !== undefined) {
          workbench.apply((layout) => setAreaCollapsed(layout, region, !open))
        }
      }
    })
  }

  /** Which of `tabs` the side holding `holder` shows; setting it switches tabs without opening the side. */
  function shownTab<T extends string>(
    holder: ViewId,
    tabs: Readonly<Record<T, ViewId>>,
    fallback: T
  ) {
    const entries = Object.entries(tabs) as [T, ViewId][]
    return computed({
      get: (): T => {
        const region = sideOf(holder)
        const area = region === undefined ? undefined : workbench.layout[region]
        const shown = area?.sections.find((section) => section.id === area.activeSection)?.view
        return entries.find(([, view]) => view === shown)?.[0] ?? fallback
      },
      set: (tab: T) => {
        const section = findView(workbench.layout, tabs[tab])?.section
        if (section !== undefined) workbench.apply((layout) => selectSection(layout, section.id))
      }
    })
  }

  const binderOpen = sideOpen('binder')
  const inspectorOpen = sideOpen('properties')
  /** Which list the side panel shows. */
  const sideTab = shownTab<SideTab>('binder', SIDE_VIEWS, 'manuscript')
  /** Which view the right-hand panel shows. */
  const rightTab = shownTab<RightTab>('properties', RIGHT_VIEWS, 'properties')
  /** The outline last shown in the panel, by path. */
  const outlinePath = computed<string | null>({
    get: () => workbench.outlinePath,
    set: (path) => {
      workbench.outlinePath = path
    }
  })

  /** Shows the outline beside the draft, or hides the panel if the outline is already showing. */
  function toggleOutline(): void {
    if (inspectorOpen.value && rightTab.value === 'outline') {
      inspectorOpen.value = false
      return
    }
    inspectorOpen.value = true
    rightTab.value = 'outline'
  }

  function toggleBinder(): void {
    binderOpen.value = !binderOpen.value
  }

  function toggleInspector(): void {
    inspectorOpen.value = !inspectorOpen.value
  }

  function toggleFocusMode(): void {
    focusMode.value = !focusMode.value
  }

  function exitFocusMode(): void {
    focusMode.value = false
  }

  /**
   * Brings the writable document back to the main area. In Plotting mode only the outline's text
   * takes the board's place; any other document is written in Writing mode.
   */
  function showDocument(path?: string): void {
    if (workbench.mode === 'plotting' && path !== useOutlineStore().currentPath) {
      workbench.setMode('writing')
    }
    mainView.value = 'write'
  }

  return {
    binderOpen,
    inspectorOpen,
    focusMode,
    sideTab,
    rightTab,
    mainView,
    outlinePath,
    toggleOutline,
    toggleBinder,
    toggleInspector,
    toggleFocusMode,
    exitFocusMode,
    showDocument
  }
})

registerDocumentPresenter(() => useLayoutStore())

/** Remembers the entry open in each project, so reopening a project returns to it. */
export function rememberLastEntry(projectRoot: string, path: string | null): void {
  const others = Object.entries(readRecord(LAST_ENTRY_KEY)).filter(([root]) => root !== projectRoot)
  writeRecord(
    LAST_ENTRY_KEY,
    Object.fromEntries(path === null ? others : [...others, [projectRoot, path]])
  )
}

/** The entry last open in `projectRoot`, if any. */
export function lastEntryOf(projectRoot: string): string | undefined {
  const path = readRecord(LAST_ENTRY_KEY)[projectRoot]
  return typeof path === 'string' ? path : undefined
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function readRecord(key: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage()?.getItem(key) ?? '{}')
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function writeRecord(key: string, value: Record<string, unknown>): void {
  try {
    storage()?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be full or unavailable; the last entry just won't be remembered.
  }
}

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useLayoutStore, import.meta.hot))
