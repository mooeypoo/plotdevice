import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import type { MessageKey } from '../../../i18n/translator'
import type { Layout } from '../workbench/model/layout'
import {
  closeSplit,
  openSplit,
  setCenterView,
  type LayoutChange
} from '../workbench/model/operations'
import { PRESETS, type PresetId } from '../workbench/model/presets'
import type { Mode } from '../workbench/model/vocabulary'
import {
  deleteLayout,
  renameLayout,
  resetPreset,
  saveLayoutAs,
  storeArrangement,
  type SavedLayoutRefusal,
  type SettingsChange
} from '../workbench/model/saved-layouts'
import {
  defaultProjectBindings,
  layoutFor,
  type ProjectBindings,
  type WorkbenchSettings
} from '../workbench/model/workbench-settings'
import {
  loadWorkbenchProjects,
  loadWorkbenchSettings,
  saveWorkbenchProjects,
  saveWorkbenchSettings,
  type WorkbenchStorageProblem
} from '../workbench/storage/workbench-storage'
import { registerDocumentPresenter } from './document-presenter'
import { placeOf } from './entry-owners'
import { registerMoveFollower } from './move-followers'
import { useUiLanguageStore } from './ui-language-store'

/** The layout each mode falls back to. */
const MODE_PRESETS: Readonly<Record<Mode, PresetId>> = { writing: 'write', plotting: 'plot' }

/** The center stage's views; the board only in Plotting mode. */
export type MainView = 'write' | 'overview' | 'timeline' | 'interactions' | 'plot-board'

const NOTICES: Record<WorkbenchStorageProblem, MessageKey> = {
  unavailable: 'workbench-notice-unavailable',
  invalid: 'workbench-notice-invalid',
  'save-failed': 'workbench-notice-save-failed'
}

/**
 * The writer's workbench: per-user layouts, per-project bindings, and the layout in use for the
 * open project (ADR 0017). Kept in `userData` browser storage, never in the novel folder.
 */
export const useWorkbenchStore = defineStore('workbench', () => {
  const language = useUiLanguageStore()
  const loadedSettings = loadWorkbenchSettings()
  const loadedProjects = loadWorkbenchProjects()
  const settings = shallowRef<WorkbenchSettings>(loadedSettings.settings)
  const projects = shallowRef(loadedProjects.projects)
  const problem = ref<WorkbenchStorageProblem | null>(
    loadedSettings.problem ?? loadedProjects.problem
  )
  const storageNotice = computed(() =>
    problem.value === null ? '' : language.t(NOTICES[problem.value])
  )

  /** The open project's root, set by the workspace store; bindings are kept per root. */
  const projectRoot = ref<string | null>(null)
  const root = computed(() => projectRoot.value)
  /** Bindings while no project is open live only in this session. */
  const unboundBindings = shallowRef<ProjectBindings>(defaultProjectBindings())
  const bindings = computed<ProjectBindings>(() =>
    root.value === null
      ? unboundBindings.value
      : (projects.value.projects[root.value] ?? defaultProjectBindings())
  )
  /** Writing or Plotting, as the writer left this project. */
  const mode = computed<Mode>(() => bindings.value.mode)
  /** Focus mode hides the chrome around the page, over any layout; session state (Q4). */
  const focusMode = ref(false)
  /** What the center stage shows: the editor, a view of the whole book, or the board. */
  const centerView = computed<MainView>({
    get: () => {
      const view = layout.value.center.view
      return view === 'overview' ||
        view === 'timeline' ||
        view === 'interactions' ||
        view === 'plot-board'
        ? view
        : 'write'
    },
    set: (view) => {
      apply((current) => setCenterView(current, view === 'write' ? 'document' : view))
    }
  })
  /** The layout chosen for this project in the current mode, or that mode's preset if it's gone. */
  const activeLayoutId = computed(() => {
    const chosen = bindings.value.active[mode.value]
    return layoutFor(settings.value, chosen)?.mode === mode.value
      ? chosen
      : MODE_PRESETS[mode.value]
  })
  const layout = computed<Layout>(
    () => layoutFor(settings.value, activeLayoutId.value) ?? PRESETS[MODE_PRESETS[mode.value]]
  )

  function record(outcome: WorkbenchStorageProblem | null): void {
    problem.value = outcome
  }

  function saveSettings(next: WorkbenchSettings): void {
    settings.value = next
    record(saveWorkbenchSettings(next))
  }

  function updateBindings(change: (current: ProjectBindings) => ProjectBindings): void {
    const current = root.value
    if (current === null) {
      unboundBindings.value = change(unboundBindings.value)
      return
    }
    const next = {
      ...projects.value,
      projects: { ...projects.value.projects, [current]: change(bindings.value) }
    }
    projects.value = next
    record(saveWorkbenchProjects(next))
  }

  /** Applies a model operation to the layout in use and remembers the result. */
  function apply(operation: (current: Layout) => LayoutChange): boolean {
    const change = operation(layout.value)
    if (!change.ok) {
      console.warn('Workbench layout change refused.', change.error)
      return false
    }
    const stored = storeArrangement(settings.value, activeLayoutId.value, change.value)
    if (!stored.ok) {
      console.warn('Workbench layout not stored.', stored.error)
      return false
    }
    saveSettings(stored.value)
    return true
  }

  /** Uses another layout of the current mode for this project. */
  function setActiveLayout(id: string): boolean {
    const current = mode.value
    if (layoutFor(settings.value, id)?.mode !== current) return false
    updateBindings((bound) => ({ ...bound, active: { ...bound.active, [current]: id } }))
    return true
  }

  /** Switches between Writing and Plotting; each mode keeps its own layout (ADR 0017). */
  function setMode(next: Mode): boolean {
    if (bindings.value.mode !== next) updateBindings((current) => ({ ...current, mode: next }))
    return true
  }

  /** Keeps a change to the writer's layouts, or returns why it was refused. */
  function keep(change: SettingsChange): SavedLayoutRefusal | null {
    if (!change.ok) return change.error
    saveSettings(change.value)
    return null
  }

  /** Saves the arrangement in use under a new name and uses it for this project. */
  function saveAs(name: string): SavedLayoutRefusal | null {
    const id = `user-${crypto.randomUUID()}`
    const refusal = keep(saveLayoutAs(settings.value, id, name, layout.value))
    if (refusal === null) setActiveLayout(id)
    return refusal
  }

  function rename(id: string, name: string): SavedLayoutRefusal | null {
    return keep(renameLayout(settings.value, id, name))
  }

  /** Deletes one of the writer's layouts; a project using it falls back to Write. */
  function remove(id: string): SavedLayoutRefusal | null {
    return keep(deleteLayout(settings.value, id))
  }

  function reset(id: string): SavedLayoutRefusal | null {
    return keep(resetPreset(settings.value, id))
  }

  function toggleFocusMode(): void {
    focusMode.value = !focusMode.value
  }

  function exitFocusMode(): void {
    focusMode.value = false
  }

  /**
   * Brings the writable document back to the center after navigation. In Plotting mode an
   * outline's text takes the board's place; any other document is written in Writing mode.
   */
  function showDocument(path: string): void {
    if (mode.value === 'plotting' && placeOf(path)?.kind !== 'outline') setMode('writing')
    centerView.value = 'write'
  }

  /** Pinned cards for this project, in the writer's order. */
  const cards = computed(() => bindings.value.cards)
  const collapsedCards = computed(() => bindings.value.collapsedCards)

  /** Pins an entry as a card at the end of the stack; pinning it again keeps one card. */
  function pinCard(path: string): void {
    if (bindings.value.cards.includes(path)) return
    updateBindings((current) => ({ ...current, cards: [...current.cards, path] }))
  }

  function unpinCard(path: string): void {
    updateBindings((current) => ({
      ...current,
      cards: current.cards.filter((card) => card !== path),
      collapsedCards: current.collapsedCards.filter((card) => card !== path)
    }))
  }

  /** Moves a card to `index` in the stack. */
  function moveCard(path: string, index: number): void {
    const others = bindings.value.cards.filter((card) => card !== path)
    if (others.length === bindings.value.cards.length) return
    const at = Math.max(0, Math.min(index, others.length))
    updateBindings((current) => ({
      ...current,
      cards: [...others.slice(0, at), path, ...others.slice(at)]
    }))
  }

  function setCardCollapsed(path: string, collapsed: boolean): void {
    updateBindings((current) => ({
      ...current,
      collapsedCards: collapsed
        ? [...current.collapsedCards.filter((card) => card !== path), path]
        : current.collapsedCards.filter((card) => card !== path)
    }))
  }

  /** Which fields cards of `kind` show, for every project; `undefined` means the defaults. */
  function cardFieldsFor(kind: string): readonly string[] | undefined {
    return settings.value.cardFields[kind]
  }

  function setCardFields(kind: string, fields: readonly string[]): void {
    saveSettings({
      ...settings.value,
      cardFields: { ...settings.value.cardFields, [kind]: fields }
    })
  }

  /** What each read-only split shows, by split id, for this project. */
  const splits = computed(() => bindings.value.splits)
  /** Why the last Open beside did nothing, as a message key; cleared when one succeeds. */
  const splitNotice = ref<MessageKey | null>(null)

  function freshSplitId(): string {
    const used = new Set(layout.value.center.splits.map((split) => split.id))
    let n = 1
    while (used.has(`split-${String(n)}`)) n += 1
    return `split-${String(n)}`
  }

  function bindSplit(id: string, path: string): void {
    updateBindings((current) => ({
      ...current,
      splits: { ...current.splits, [id]: { path, locked: current.splits[id]?.locked ?? false } }
    }))
  }

  /**
   * Shows `path` read-only beside the editor: in the split that already shows it, else the first
   * unlocked split, else a new one. Refused when every split is locked and there is no room.
   */
  function openBeside(path: string): boolean {
    const ids = layout.value.center.splits.map((split) => split.id)
    const current = bindings.value.splits
    let id = ids.find((candidate) => current[candidate]?.path === path)
    id ??= ids.find((candidate) => current[candidate]?.locked !== true)
    if (id === undefined) {
      const fresh = freshSplitId()
      if (!apply((current) => openSplit(current, fresh))) {
        splitNotice.value = 'split-all-locked'
        return false
      }
      id = fresh
    }
    splitNotice.value = null
    bindSplit(id, path)
    return true
  }

  /** Shows `path` in one particular split, keeping its lock. */
  function showInSplit(id: string, path: string): void {
    bindSplit(id, path)
  }

  function setSplitLocked(id: string, locked: boolean): void {
    const bound = bindings.value.splits[id]
    if (bound === undefined) return
    updateBindings((current) => ({
      ...current,
      splits: { ...current.splits, [id]: { ...bound, locked } }
    }))
  }

  /** Closes a split and forgets what it showed. */
  function closeSplitView(id: string): void {
    apply((current) => closeSplit(current, id))
    splitNotice.value = null
    updateBindings((current) => ({
      ...current,
      splits: Object.fromEntries(Object.entries(current.splits).filter(([key]) => key !== id))
    }))
  }

  /** Keeps pinned cards and the chosen outline on the files the app moved or renamed. */
  function followMove(from: string, to: string): void {
    const rename = (path: string): string => (path === from ? to : path)
    const current = bindings.value
    if (
      !current.cards.includes(from) &&
      !current.collapsedCards.includes(from) &&
      current.outlinePath !== from &&
      !Object.values(current.splits).some((split) => split.path === from)
    ) {
      return
    }
    updateBindings((before) => ({
      ...before,
      cards: before.cards.map(rename),
      collapsedCards: before.collapsedCards.map(rename),
      outlinePath: before.outlinePath === null ? null : rename(before.outlinePath),
      splits: Object.fromEntries(
        Object.entries(before.splits).map(([id, split]) => [
          id,
          { ...split, path: rename(split.path) }
        ])
      )
    }))
  }

  // The old shell's one outline choice carries over to the first project opened as it is retired.
  let legacyOutlinePath = loadedSettings.legacyOutlinePath
  watch(root, (opened) => {
    if (opened === null || legacyOutlinePath === null) return
    const carried = legacyOutlinePath
    legacyOutlinePath = null
    if (bindings.value.outlinePath === null) {
      updateBindings((current) => ({ ...current, outlinePath: carried }))
    }
  })

  /** The outline this project reads beside the draft and on the board. */
  const outlinePath = computed<string | null>({
    get: () => bindings.value.outlinePath,
    set: (path) => {
      updateBindings((current) => ({ ...current, outlinePath: path }))
    }
  })

  return {
    settings,
    projectRoot,
    layout,
    mode,
    setMode,
    activeLayoutId,
    focusMode,
    centerView,
    toggleFocusMode,
    exitFocusMode,
    showDocument,
    outlinePath,
    storageNotice,
    cards,
    collapsedCards,
    splits,
    splitNotice,
    openBeside,
    showInSplit,
    setSplitLocked,
    closeSplitView,
    pinCard,
    unpinCard,
    moveCard,
    setCardCollapsed,
    cardFieldsFor,
    setCardFields,
    followMove,
    apply,
    setActiveLayout,
    saveAs,
    rename,
    remove,
    reset
  }
})

registerMoveFollower(() => useWorkbenchStore())

registerDocumentPresenter(() => useWorkbenchStore())

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useWorkbenchStore, import.meta.hot))
