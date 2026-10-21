import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/** The side panel's tabs. */
export type SideTab = 'manuscript' | 'codex'

/** The main area's views. */
export type MainView = 'write' | 'overview' | 'timeline' | 'interactions'

/** The right-hand panel's tabs. */
export type RightTab = 'properties' | 'outline' | 'reference'

const LAYOUT_KEY = 'plotdevice.layout'
const LAST_ENTRY_KEY = 'plotdevice.lastEntry'

/**
 * Per-user window layout. Browser storage lives in Electron's userData folder, never in the
 * project folder (AGENTS.md, non-negotiable 1). Losing it only resets the layout.
 */
export const useLayoutStore = defineStore('layout', () => {
  const saved = readRecord(LAYOUT_KEY)
  const binderOpen = ref(typeof saved['binderOpen'] === 'boolean' ? saved['binderOpen'] : true)
  const inspectorOpen = ref(
    typeof saved['inspectorOpen'] === 'boolean' ? saved['inspectorOpen'] : true
  )
  const focusMode = ref(false)
  /** Which list the side panel shows. */
  const sideTab = ref<SideTab>(saved['sideTab'] === 'codex' ? 'codex' : 'manuscript')
  /** Which view the right-hand panel shows. */
  const rightTab = ref<RightTab>(
    saved['rightTab'] === 'outline' || saved['rightTab'] === 'reference'
      ? saved['rightTab']
      : 'properties'
  )
  /** What the main area shows: the editor, or the Overview of the whole book. */
  const mainView = ref<MainView>('write')
  /** The outline last shown in the panel, by path. */
  const outlinePath = ref<string | null>(
    typeof saved['outlinePath'] === 'string' ? saved['outlinePath'] : null
  )

  watch([binderOpen, inspectorOpen, sideTab, rightTab, outlinePath], () => {
    writeRecord(LAYOUT_KEY, {
      binderOpen: binderOpen.value,
      inspectorOpen: inspectorOpen.value,
      sideTab: sideTab.value,
      rightTab: rightTab.value,
      outlinePath: outlinePath.value
    })
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
    exitFocusMode
  }
})

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
    // Storage can be full or unavailable; the layout just won't be remembered.
  }
}
